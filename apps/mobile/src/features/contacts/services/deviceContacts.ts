import { Contact } from 'expo-contacts';

import { requestPermission, type PermissionState } from '@/lib/permissions';

import { normalizePhone } from '../phone';

export type PickedContact = { name: string; phone: string };

export type PickResult =
  | { status: 'picked'; contact: PickedContact }
  | { status: 'cancelled' }
  | { status: 'no-phone'; name: string }
  | { status: 'permission'; state: PermissionState };

/** Opens the Android contact picker and returns the chosen person's best phone number. */
export async function pickDeviceContact(): Promise<PickResult> {
  const state = await requestPermission('contacts');
  if (state !== 'granted') return { status: 'permission', state };

  const contact = await Contact.presentPicker();
  if (!contact) return { status: 'cancelled' };

  const [name, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  // Prefer a mobile number; fall back to the first one that normalizes.
  const ordered = [...phones].sort(
    (a, b) => Number(/mobile|cell/i.test(b.label ?? '')) - Number(/mobile|cell/i.test(a.label ?? '')),
  );
  const phone = ordered.map((p) => normalizePhone(p.number ?? '')).find((n): n is string => n != null);
  if (!phone) return { status: 'no-phone', name };
  return { status: 'picked', contact: { name: name.trim(), phone } };
}
