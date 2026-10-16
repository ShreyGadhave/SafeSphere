/**
 * SOS SMS text. Pure functions, unit-tested.
 *
 * SMS cost and reliability depend on encoding: plain GSM-7 text fits 160 chars (153 per part
 * when split); one non-GSM character (₹, ±, —, Devanagari…) switches the whole message to UCS-2,
 * which fits only 70 (67 per part). Templates therefore use GSM-7 only, and every message is kept
 * to at most two parts — medical details are trimmed first, then the address/name.
 */

import { EMERGENCY_TYPE_LABEL, type EmergencyType } from '../constants';

export type MedicalSummary = {
  blood_group?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
};

export type SosMessageInput = {
  firstName: string;
  emergencyType: EmergencyType;
  /** Live tracking link, or a plain map link when the alert isn't on the server yet. */
  link: string | null;
  at: Date;
  accuracyM?: number | null;
  batteryPct?: number | null;
  medical?: MedicalSummary | null;
};

export const MAX_SMS_PARTS = 2;

// GSM 03.38 basic character set (1 septet each) and extension table (2 septets each).
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€\f';

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM_BASIC.includes(ch) && !GSM_EXTENDED.includes(ch)) return false;
  }
  return true;
}

/** Number of SMS parts Android will split this text into. */
export function smsParts(text: string): number {
  if (text.length === 0) return 1;
  if (isGsm7(text)) {
    let septets = 0;
    for (const ch of text) septets += GSM_EXTENDED.includes(ch) ? 2 : 1;
    return septets <= 160 ? 1 : Math.ceil(septets / 153);
  }
  // UCS-2 counts UTF-16 code units (emoji take two).
  return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
}

export function mapLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function liveLink(baseUrl: string, shareToken: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/live/${shareToken}`;
}

export function firstNameOf(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  return first || 'your contact';
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Blood O+; Allergies: penicillin; Conditions: asthma; Meds: salbutamol" — empty if nothing set. */
export function medicalLine(medical: MedicalSummary | null | undefined): string {
  if (!medical) return '';
  const parts = [
    medical.blood_group ? `Blood ${medical.blood_group}` : '',
    medical.allergies ? `Allergies: ${medical.allergies}` : '',
    medical.conditions ? `Conditions: ${medical.conditions}` : '',
    medical.medications ? `Meds: ${medical.medications}` : '',
  ].filter(Boolean);
  return parts.length ? `Medical: ${parts.join('; ')}` : '';
}

/** Cut `text` so that `build(text)` fits in MAX_SMS_PARTS, adding "..." when trimmed. */
function fitTail(build: (tail: string) => string, tail: string): string {
  if (smsParts(build(tail)) <= MAX_SMS_PARTS) return build(tail);
  let lo = 0;
  let hi = tail.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (smsParts(build(`${tail.slice(0, mid).trimEnd()}...`)) <= MAX_SMS_PARTS) lo = mid;
    else hi = mid - 1;
  }
  return lo > 8 ? build(`${tail.slice(0, lo).trimEnd()}...`) : build('');
}

export function buildSosMessage(input: SosMessageInput): string {
  const label = EMERGENCY_TYPE_LABEL[input.emergencyType];
  const details = [
    `Last seen ${hhmm(input.at)}`,
    input.accuracyM != null ? `accuracy ${Math.round(input.accuracyM)} m` : '',
    input.batteryPct != null ? `battery ${Math.round(input.batteryPct)}%` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const location = input.link ? `Location: ${input.link}` : 'Location unavailable - please call them.';

  const build = (name: string, medical: string) =>
    [`SOS from ${name}: ${label}.`, `${location}.`, `${details}.`, medical, 'Sent by SafeSphere.']
      .filter(Boolean)
      .join(' ');

  const name = input.firstName.trim() || 'your contact';
  const medical = medicalLine(input.medical);

  // 1) full message; 2) trim medical; 3) drop medical and trim the name (very long or non-GSM).
  if (smsParts(build(name, medical)) <= MAX_SMS_PARTS) return build(name, medical);
  const withTrimmedMedical = fitTail((m) => build(name, m), medical);
  if (smsParts(withTrimmedMedical) <= MAX_SMS_PARTS) return withTrimmedMedical;
  return fitTail((n) => build(n || 'your contact', ''), name);
}

export function buildLiveLinkMessage(firstName: string, link: string): string {
  return `Live tracking for ${firstName}'s SOS: ${link} (updates every few seconds). Sent by SafeSphere.`;
}

export function buildSafeMessage(firstName: string): string {
  return `${firstName} is safe now - the SOS was cancelled with their PIN. Sent by SafeSphere.`;
}
