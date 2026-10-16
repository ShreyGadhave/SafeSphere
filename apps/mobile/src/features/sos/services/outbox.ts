/**
 * Offline write queue. Every server write the SOS makes goes through here, so a phone with no
 * data connection still records everything once it reconnects.
 *
 * Ordering is strict FIFO: a parent row (the alert) is always written before its children
 * (locations, events, evidence). When an item fails with a transient error, processing stops and
 * retries later with exponential backoff, so children never overtake their parent. Replays are
 * idempotent where it matters: alerts use client-generated ids and a duplicate-key error counts
 * as success.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

import { STORAGE_KEYS } from '../constants';

export type OutboxOp =
  | { kind: 'insert'; table: string; row: Record<string, unknown> }
  | { kind: 'update'; table: string; match: Record<string, string>; values: Record<string, unknown> }
  | { kind: 'upload'; bucket: string; path: string; fileUri: string; contentType: string };

export type OutboxItem = {
  id: string;
  op: OutboxOp;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
};

export type ExecResult = { status: 'ok' } | { status: 'retry'; error: string } | { status: 'drop'; error: string };
export type Executor = (op: OutboxOp) => Promise<ExecResult>;

/** Permanent failures are retried a few times (auth refresh, clock skew) before being dropped. */
export const MAX_PERMANENT_ATTEMPTS = 3;

export function backoffMs(attempts: number): number {
  return Math.min(2000 * 2 ** Math.max(0, attempts - 1), 5 * 60_000);
}

export function makeItem(op: OutboxOp, now: number, id: string): OutboxItem {
  return { id, op, createdAt: now, attempts: 0, nextAttemptAt: now };
}

/**
 * Pure core: runs ready items in order and returns the new queue.
 * Stops at the first item that must wait, so order is preserved.
 */
export async function processQueue(
  items: OutboxItem[],
  exec: Executor,
  now: number,
): Promise<{ remaining: OutboxItem[]; done: string[]; dropped: { id: string; error: string }[] }> {
  const queue = [...items];
  const done: string[] = [];
  const dropped: { id: string; error: string }[] = [];

  while (queue.length) {
    const head = queue[0];
    if (head.nextAttemptAt > now) break;

    let result: ExecResult;
    try {
      result = await exec(head.op);
    } catch (e) {
      result = { status: 'retry', error: e instanceof Error ? e.message : String(e) };
    }

    const attempts = head.attempts + 1;
    if (result.status === 'ok') {
      done.push(head.id);
      queue.shift();
    } else if (result.status === 'drop' && attempts >= MAX_PERMANENT_ATTEMPTS) {
      dropped.push({ id: head.id, error: result.error });
      queue.shift();
    } else {
      queue[0] = { ...head, attempts, nextAttemptAt: now + backoffMs(attempts), lastError: result.error };
      break;
    }
  }
  return { remaining: queue, done, dropped };
}

// ─────────────────────────── persistence + Supabase executor ───────────────────────────

// Loosely typed client: the outbox writes to tables chosen at runtime.
const db = supabase as unknown as SupabaseClient;

function classify(error: { code?: string; message?: string; statusCode?: string | number } | null): ExecResult {
  if (!error) return { status: 'ok' };
  const code = String(error.code ?? '');
  const message = error.message ?? 'unknown error';
  if (code === '23505' || /already exists|duplicate/i.test(message)) return { status: 'ok' };
  // Missing parent row (FK) — the parent may still be on its way; wait rather than drop.
  if (code === '23503') return { status: 'retry', error: message };
  // Constraint / data / permission errors will not fix themselves by waiting.
  if (/^(22|23)/.test(code) || code === '42501' || code === '42P01') return { status: 'drop', error: message };
  return { status: 'retry', error: message };
}

export const supabaseExecutor: Executor = async (op) => {
  switch (op.kind) {
    case 'insert': {
      const { error } = await db.from(op.table).insert(op.row);
      return classify(error);
    }
    case 'update': {
      let query = db.from(op.table).update(op.values);
      for (const [column, value] of Object.entries(op.match)) query = query.eq(column, value);
      const { error } = await query;
      return classify(error);
    }
    case 'upload': {
      const file = new File(op.fileUri);
      if (!file.exists) return { status: 'drop', error: `local file missing: ${op.fileUri}` };
      const bytes = await file.bytes();
      const { error } = await supabase.storage
        .from(op.bucket)
        .upload(op.path, bytes, { contentType: op.contentType, upsert: false });
      return classify(error as { message?: string } | null);
    }
  }
};

let chain: Promise<unknown> = Promise.resolve();
/** Serializes every read-modify-write of the stored queue within this JS runtime. */
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function load(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.outbox);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function save(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.outbox, JSON.stringify(items));
}

export function enqueue(op: OutboxOp): Promise<void> {
  return locked(async () => {
    const items = await load();
    items.push(makeItem(op, Date.now(), Crypto.randomUUID()));
    await save(items);
  });
}

/** Try to send everything that is due. Safe to call often. Returns how many items are still queued. */
export function flushOutbox(exec: Executor = supabaseExecutor): Promise<number> {
  return locked(async () => {
    const items = await load();
    if (!items.length) return 0;
    const { remaining, dropped } = await processQueue(items, exec, Date.now());
    for (const d of dropped) console.warn('[outbox] dropped write after repeated errors:', d.error);
    await save(remaining);
    return remaining.length;
  });
}

/** Enqueue then attempt delivery right away. */
export async function write(op: OutboxOp): Promise<void> {
  await enqueue(op);
  void flushOutbox();
}

export function pendingCount(): Promise<number> {
  return locked(async () => (await load()).length);
}
