import { normalizePhone } from './phone';

/** Matches the database trigger `enforce_contact_limit`. */
export const MAX_CONTACTS = 5;
export const MIN_CONTACTS = 1;

export type ContactLike = { id: string; name: string; phone: string; is_primary: boolean; position: number };

export type ContactDraft = { name: string; phone: string; relation?: string };

export type ContactDraftErrors = { name?: string; phone?: string };

export function canAddContact(count: number): boolean {
  return count < MAX_CONTACTS;
}

/** Sorted the way the app shows them: primary first, then by position. */
export function sortContacts<T extends ContactLike>(contacts: readonly T[]): T[] {
  return [...contacts].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position);
}

/** When the primary contact is removed, the next one (by position) becomes primary. */
export function nextPrimaryAfterDelete(contacts: readonly ContactLike[], deletedId: string): string | null {
  const deleted = contacts.find((c) => c.id === deletedId);
  if (!deleted?.is_primary) return null;
  const rest = contacts.filter((c) => c.id !== deletedId).sort((a, b) => a.position - b.position);
  return rest[0]?.id ?? null;
}

/** Validates a contact form. `editingId` skips the contact being edited in the duplicate check. */
export function validateContactDraft(
  draft: ContactDraft,
  existing: readonly ContactLike[],
  editingId?: string,
): ContactDraftErrors {
  const errors: ContactDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Add a name.';
  else if (name.length > 80) errors.name = 'Keep the name under 80 characters.';

  const phone = normalizePhone(draft.phone);
  if (!phone) errors.phone = 'Enter a valid mobile number, e.g. 98765 43210.';
  else if (existing.some((c) => c.id !== editingId && normalizePhone(c.phone) === phone)) {
    errors.phone = 'This number is already in your contacts.';
  }

  if (!editingId && !canAddContact(existing.length)) {
    errors.name = `You can have up to ${MAX_CONTACTS} emergency contacts.`;
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
