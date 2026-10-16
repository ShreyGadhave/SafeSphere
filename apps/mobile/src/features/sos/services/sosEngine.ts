/**
 * Runs every side effect of an active SOS (PLAN §3.3, features B6–B10). Each channel is
 * independent: a failure in one (no SIM, no signal, denied permission, offline) is recorded in
 * the timeline and never stops the others. SMS goes first because it is the only channel that
 * works with no internet.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Vibration } from 'react-native';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { placeCall, sendSms, canSendSms, canCall, isTelephonyAvailable } from '../../../../modules/safesphere-telephony';
import { STORAGE_KEYS, type AlertTrigger, type EmergencyType } from '../constants';
import {
  buildLiveLinkMessage,
  buildSafeMessage,
  buildSosMessage,
  firstNameOf,
  liveLink,
  mapLink,
} from './message';
import { flushOutbox, write } from './outbox';
import { ensureSosPermissions, type SosPermissions } from './permissions';
import { batteryPercent, preciseFix, quickFix, recordFix, startTracking, stopTracking, toEwkt, type Fix } from './location';
import { orderContacts, readCachedRecipients, refreshSosRecipients, type SosRecipients } from './recipients';
import { EvidenceRecorder } from './recorder';

export type StepKind = 'permissions' | 'sms' | 'call' | 'alert' | 'live_link' | 'location' | 'recording' | 'safe_sms';
export type StepStatus = 'pending' | 'done' | 'failed' | 'skipped';
export type TimelineStep = { kind: StepKind; status: StepStatus; title: string; detail?: string; at: string };

export type EngineCallbacks = {
  onStep: (step: TimelineStep) => void;
  onFix?: (fix: Fix) => void;
  onShareToken?: (token: string) => void;
};

type Settings = { silentMode?: boolean; sirenMode?: boolean };

type Session = {
  alertId: string;
  recipients: SosRecipients;
  recorder: EvidenceRecorder | null;
  flushTimer: ReturnType<typeof setInterval> | null;
  linkPoll: ReturnType<typeof setInterval> | null;
  stopped: boolean;
};

let session: Session | null = null;

const now = () => new Date().toISOString();

async function readSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
    return raw ? (JSON.parse(raw) as Settings) : {};
  } catch {
    return {};
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

async function currentUserId(): Promise<string | null> {
  // getSession reads the locally stored session, so this works offline.
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session?.user.id ?? null;
}

/** Sends `message` to every contact. Falls back to the SMS composer when direct sending is unavailable. */
async function smsAll(phones: string[], message: string): Promise<{ sent: number; failed: number; composer: boolean }> {
  if (!phones.length) return { sent: 0, failed: 0, composer: false };
  if (isTelephonyAvailable && canSendSms()) {
    let sent = 0;
    for (const phone of phones) {
      const result = await sendSms(phone, message).catch(() => null);
      if (result?.sent) sent++;
    }
    return { sent, failed: phones.length - sent, composer: false };
  }
  // No native module (old build) or SEND_SMS denied: prefill the SMS app; the user taps send.
  const opened = await Linking.openURL(`sms:${phones.join(',')}?body=${encodeURIComponent(message)}`)
    .then(() => true)
    .catch(() => false);
  return { sent: 0, failed: opened ? 0 : phones.length, composer: opened };
}

function startSiren() {
  // TODO(asset): bundle a loud siren sound (assets/sounds/siren.mp3) and play it on loop with
  // expo-audio's createAudioPlayer. Until then the siren is a strong repeating vibration.
  Vibration.vibrate([0, 800, 300, 800, 300, 800], true);
}

function stopSiren() {
  Vibration.cancel();
}

export type ActivateParams = {
  alertId: string;
  trigger: AlertTrigger;
  emergencyType: EmergencyType;
};

/** Starts everything for a freshly activated SOS. */
export async function activateSos(params: ActivateParams, cb: EngineCallbacks): Promise<void> {
  if (session && !session.stopped) return;
  const step = (kind: StepKind, status: StepStatus, title: string, detail?: string) =>
    cb.onStep({ kind, status, title, detail, at: now() });

  const [permissions, recipients, fix, battery, userId, settings] = await Promise.all([
    ensureSosPermissions().catch(
      (): SosPermissions => ({ sms: false, call: false, location: false, backgroundLocation: false, microphone: false }),
    ),
    withTimeout(refreshSosRecipients(), 3000, null).then((r) => r ?? readCachedRecipients()),
    quickFix(),
    batteryPercent(),
    currentUserId(),
    readSettings(),
  ]);

  const missing = (Object.entries(permissions) as [keyof SosPermissions, boolean][])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (missing.length) step('permissions', 'failed', 'Some permissions are off', missing.join(', '));

  session = {
    alertId: params.alertId,
    recipients,
    recorder: null,
    flushTimer: null,
    linkPoll: null,
    stopped: false,
  };
  const s = session;
  const firstName = firstNameOf(recipients.fullName);
  const contacts = orderContacts(recipients.contacts);

  // 1) The alert row (queued; delivered as soon as there is a connection).
  if (userId) {
    await write({
      kind: 'insert',
      table: 'alerts',
      row: {
        id: params.alertId,
        user_id: userId,
        trigger_source: params.trigger,
        emergency_type: params.emergencyType,
        location: fix ? toEwkt(fix.latitude, fix.longitude) : null,
        accuracy_m: fix?.accuracy ?? null,
        battery_pct: battery,
      },
    });
  } else {
    step('alert', 'failed', 'Not signed in', 'Contacts are still alerted by SMS');
  }

  // 2) SMS first — works offline.
  const message = buildSosMessage({
    firstName,
    emergencyType: params.emergencyType,
    link: fix ? mapLink(fix.latitude, fix.longitude) : null,
    at: new Date(),
    accuracyM: fix?.accuracy,
    batteryPct: battery,
    medical: recipients.medical,
  });
  if (!contacts.length) {
    step('sms', 'failed', 'No emergency contacts saved', 'Add contacts in Profile');
  } else {
    const sms = await smsAll(
      contacts.map((c) => c.phone),
      message,
    );
    if (sms.composer) step('sms', 'pending', 'SMS ready to send', 'Tap send in your messages app');
    else if (sms.sent === contacts.length)
      step('sms', 'done', `SMS sent to ${sms.sent} contact${sms.sent === 1 ? '' : 's'}`, 'From your number');
    else if (sms.sent > 0) step('sms', 'failed', `SMS sent to ${sms.sent} of ${contacts.length}`, 'Some failed');
    else step('sms', 'failed', 'SMS could not be sent', 'No signal or SIM?');
    if (userId) {
      await write({
        kind: 'insert',
        table: 'alert_events',
        row: {
          alert_id: params.alertId,
          kind: 'sms_sent',
          payload: { total: contacts.length, sent: sms.sent, failed: sms.failed, composer: sms.composer },
        },
      });
    }
  }

  // 3) Call the primary contact (not in silent mode — a ringing call would give the user away).
  const primary = contacts.find((c) => c.is_primary) ?? contacts[0];
  if (primary && !settings.silentMode) {
    if (isTelephonyAvailable && canCall()) {
      const ok = await placeCall(primary.phone)
        .then(() => true)
        .catch(() => false);
      step('call', ok ? 'done' : 'failed', ok ? `Calling ${primary.name}` : `Could not call ${primary.name}`);
      if (ok && userId) {
        await write({
          kind: 'insert',
          table: 'alert_events',
          row: { alert_id: params.alertId, kind: 'call_placed', payload: { to: primary.name } },
        });
      }
    } else {
      step('call', 'skipped', 'Direct calling is off', 'Phone permission not granted');
    }
  } else if (primary) {
    step('call', 'skipped', 'Silent mode: no call');
  }

  if (!userId) return; // nothing else can be stored without an account

  // 4) Live location every 5 s.
  if (permissions.location) {
    if (fix) void recordFix(params.alertId, fix, battery);
    const mode = await startTracking(params.alertId, permissions.backgroundLocation, (f) => cb.onFix?.(f));
    if (mode) step('location', 'done', 'Sharing live location', mode === 'background' ? 'Every 5 s' : 'While app is open');
    else step('location', 'failed', 'Location sharing failed');
    if (fix) cb.onFix?.(fix);
    else void preciseFix().then((f) => f && cb.onFix?.(f));
  } else {
    step('location', 'failed', 'Location permission is off');
  }

  // 5) Audio evidence.
  if (permissions.microphone) {
    s.recorder = new EvidenceRecorder(
      params.alertId,
      userId,
      (chunk) => step('recording', 'done', 'Recording audio', `${chunk.index + 1} clip${chunk.index ? 's' : ''} saved`),
      (error) => step('recording', 'failed', 'Recording problem', error),
    );
    await s.recorder.start();
    if (s.recorder.isRunning) step('recording', 'pending', 'Recording audio', 'Saved every 30 s');
  } else {
    step('recording', 'skipped', 'Microphone permission is off');
  }

  if (settings.sirenMode && !settings.silentMode) startSiren();

  // 6) Keep the queue moving, and send the live link once the alert reaches the server.
  s.flushTimer = setInterval(() => void flushOutbox(), 15_000);
  step('alert', 'pending', 'Connecting to SafeSphere', 'Alert queued');
  s.linkPoll = setInterval(() => void pollShareToken(s, cb, step), 5_000);
  void pollShareToken(s, cb, step);
}

async function pollShareToken(
  s: Session,
  cb: EngineCallbacks,
  step: (kind: StepKind, status: StepStatus, title: string, detail?: string) => void,
) {
  if (s.stopped || !s.linkPoll) return;
  await flushOutbox();
  const { data } = await supabase.from('alerts').select('share_token').eq('id', s.alertId).maybeSingle();
  if (!data?.share_token || !s.linkPoll) return;
  clearInterval(s.linkPoll);
  s.linkPoll = null;
  cb.onShareToken?.(data.share_token);
  step('alert', 'done', 'Alert received by SafeSphere', 'Guardians and the safety desk can see it');

  if (!env.shareBaseUrl) return;
  const link = liveLink(env.shareBaseUrl, data.share_token);
  const phones = orderContacts(s.recipients.contacts).map((c) => c.phone);
  const sms = await smsAll(phones, buildLiveLinkMessage(firstNameOf(s.recipients.fullName), link));
  step('live_link', sms.sent > 0 || sms.composer ? 'done' : 'failed', 'Live tracking link sent');
  await write({
    kind: 'insert',
    table: 'alert_events',
    row: { alert_id: s.alertId, kind: 'location_shared', payload: { sent: sms.sent } },
  });
}

/** Re-attach tracking + recording after the app was restarted mid-SOS (no SMS resend). */
export async function resumeSos(alertId: string, cb: EngineCallbacks): Promise<void> {
  if (session && !session.stopped) return;
  const [permissions, recipients, userId] = await Promise.all([
    ensureSosPermissions().catch(() => null),
    readCachedRecipients(),
    currentUserId(),
  ]);
  session = {
    alertId,
    recipients,
    recorder: null,
    flushTimer: setInterval(() => void flushOutbox(), 15_000),
    linkPoll: null,
    stopped: false,
  };
  if (permissions?.location && userId) {
    await startTracking(alertId, permissions.backgroundLocation, (f) => cb.onFix?.(f));
  }
  void flushOutbox();
}

async function teardown(): Promise<Session | null> {
  const s = session;
  if (!s) return null;
  s.stopped = true;
  if (s.flushTimer) clearInterval(s.flushTimer);
  if (s.linkPoll) clearInterval(s.linkPoll);
  s.flushTimer = null;
  s.linkPoll = null;
  stopSiren();
  await Promise.all([stopTracking(), s.recorder?.stop()]);
  session = null;
  return s;
}

/** Safe PIN: close the alert, stop everything, tell contacts. */
export async function resolveSafe(alertId: string, cb?: EngineCallbacks): Promise<void> {
  const s = await teardown();
  await write({ kind: 'update', table: 'alerts', match: { id: alertId }, values: { status: 'resolved' } });
  const recipients = s?.recipients ?? (await readCachedRecipients());
  const phones = orderContacts(recipients.contacts).map((c) => c.phone);
  const sms = await smsAll(phones, buildSafeMessage(firstNameOf(recipients.fullName)));
  cb?.onStep({ kind: 'safe_sms', status: sms.sent || sms.composer ? 'done' : 'failed', title: '"I\'m safe" sent', at: now() });
  void flushOutbox();
}

/**
 * Duress PIN (or too many wrong PINs): the screen says "cancelled", but the alert stays active,
 * is flagged as duress, and tracking + recording keep running. Only the siren stops, since it
 * would reveal that the alert is still on.
 */
export async function markDuress(alertId: string): Promise<void> {
  stopSiren();
  await write({ kind: 'update', table: 'alerts', match: { id: alertId }, values: { is_duress: true } });
}

/** For duress sessions: true once staff/the server closed the alert. */
export async function isClosedOnServer(alertId: string): Promise<boolean> {
  const { data, error } = await supabase.from('alerts').select('status').eq('id', alertId).maybeSingle();
  if (error || !data) return false;
  return data.status !== 'active';
}

/** Ends a duress session once the server has closed it (no SMS — contacts already know). */
export async function endDuress(): Promise<void> {
  await teardown();
}
