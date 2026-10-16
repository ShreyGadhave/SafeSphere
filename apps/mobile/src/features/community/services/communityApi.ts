import * as Crypto from 'expo-crypto';

import { toEwkt } from '@/features/sos/services/location';
import { write } from '@/features/sos/services/outbox';
import { env } from '@/lib/env';
import { type Enums, supabase } from '@/lib/supabase';

export type ReportCategory = Enums<'report_category'>;
export type Urgency = Enums<'urgency'>;
export type LatLng = { lat: number; lng: number };

export const CATEGORIES: { value: ReportCategory; label: string; color: string }[] = [
  { value: 'harassment', label: 'Harassment', color: '#D92D3A' },
  { value: 'theft', label: 'Theft', color: '#7C3AED' },
  { value: 'assault', label: 'Assault', color: '#B42330' },
  { value: 'accident', label: 'Road accident', color: '#E08A00' },
  { value: 'medical', label: 'Medical', color: '#DB2777' },
  { value: 'fire', label: 'Fire', color: '#EA580C' },
  { value: 'infrastructure', label: 'Street & lighting', color: '#2563EB' },
  { value: 'suspicious', label: 'Suspicious activity', color: '#0E7490' },
  { value: 'other', label: 'Other', color: '#626B79' },
];
export const categoryOf = (v: ReportCategory) => CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[8];

export type FeedReport = {
  id: string;
  category: ReportCategory;
  description: string;
  urgency: Urgency | null;
  address: string | null;
  createdAt: string;
  confirmations: number;
  commentCount: number;
  mediaPath: string | null;
  author: string | null;
  distanceM: number;
  lat: number;
  lng: number;
  confirmedByMe: boolean;
};

export async function fetchNearbyReports(point: LatLng, radiusM: number): Promise<FeedReport[]> {
  const { data, error } = await supabase.rpc('nearby_reports', {
    p_lat: point.lat,
    p_lng: point.lng,
    p_radius_m: radiusM,
    p_limit: 50,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    urgency: r.urgency,
    address: r.address,
    createdAt: r.created_at,
    confirmations: r.confirmations,
    commentCount: r.comment_count,
    mediaPath: r.media_path,
    author: r.author,
    distanceM: r.distance_m,
    lat: r.lat,
    lng: r.lng,
    confirmedByMe: r.confirmed_by_me,
  }));
}

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Please sign in again.');
  return id;
}

/** "I saw this too" (E3). */
export async function setConfirmed(reportId: string, on: boolean): Promise<void> {
  const uid = await userId();
  const { error } = on
    ? await supabase.from('report_votes').insert({ report_id: reportId, user_id: uid })
    : await supabase.from('report_votes').delete().eq('report_id', reportId).eq('user_id', uid);
  if (error) throw error;
}

export type Comment = { id: string; body: string; createdAt: string; mine: boolean };

export async function fetchComments(reportId: string): Promise<Comment[]> {
  const uid = await userId();
  const { data, error } = await supabase
    .from('report_comments')
    .select('id, body, created_at, user_id')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, body: c.body, createdAt: c.created_at, mine: c.user_id === uid }));
}

export async function addComment(reportId: string, body: string): Promise<void> {
  const { error } = await supabase.from('report_comments').insert({ report_id: reportId, user_id: await userId(), body });
  if (error) throw error;
}

export async function mediaUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('report-media').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export type Classification = {
  category: ReportCategory;
  confidence: number;
  urgency: Urgency;
  toxicity: number;
  duplicate_of: string | null;
};

/** ML-6 suggestion from the ML API; null when the service is unreachable (reporting still works). */
export async function classifyReport(text: string, at: LatLng | null): Promise<Classification | null> {
  if (!env.mlApiUrl || text.trim().length < 10) return null;
  try {
    const res = await fetch(`${env.mlApiUrl}/reports/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lat: at?.lat ?? null, lng: at?.lng ?? null }),
    });
    return res.ok ? ((await res.json()) as Classification) : null;
  } catch {
    return null;
  }
}

export type NewReport = {
  category: ReportCategory;
  description: string;
  location: LatLng;
  address: string | null;
  isAnonymous: boolean;
  photoUri: string | null;
  ai: Classification | null;
};

/** Queues the photo upload and the report insert in the offline outbox (E1). Goes to moderation. */
export async function submitReport(r: NewReport): Promise<void> {
  const uid = await userId();
  const id = Crypto.randomUUID();
  let mediaPath: string | null = null;
  if (r.photoUri) {
    mediaPath = `${uid}/${id}.jpg`;
    await write({ kind: 'upload', bucket: 'report-media', path: mediaPath, fileUri: r.photoUri, contentType: 'image/jpeg' });
  }
  await write({
    kind: 'insert',
    table: 'reports',
    row: {
      id,
      user_id: uid,
      category: r.category,
      description: r.description.trim(),
      location: toEwkt(r.location.lat, r.location.lng),
      address: r.address,
      is_anonymous: r.isAnonymous,
      media_path: mediaPath,
      ai_category: r.ai?.category ?? null,
      ai_confidence: r.ai?.confidence ?? null,
      ai_urgency: r.ai?.urgency ?? null,
      toxicity: r.ai?.toxicity ?? null,
      duplicate_of: r.ai?.duplicate_of ?? null,
    },
  });
}
