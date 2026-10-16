import {
  MAX_CONTACTS,
  canAddContact,
  hasErrors,
  nextPrimaryAfterDelete,
  sortContacts,
  validateContactDraft,
  type ContactLike,
} from '../rules';

const contact = (id: string, position: number, isPrimary = false, phone = `+9198765432${position}0`): ContactLike => ({
  id,
  name: `Person ${id}`,
  phone,
  is_primary: isPrimary,
  position,
});

describe('contact limit', () => {
  it('allows up to the database maximum of 5', () => {
    expect(MAX_CONTACTS).toBe(5);
    expect(canAddContact(0)).toBe(true);
    expect(canAddContact(4)).toBe(true);
    expect(canAddContact(5)).toBe(false);
  });

  it('blocks adding a sixth contact but still allows editing one', () => {
    const five = [0, 1, 2, 3, 4].map((i) => contact(String(i), i, i === 0));
    expect(hasErrors(validateContactDraft({ name: 'New', phone: '9123456780' }, five))).toBe(true);
    expect(hasErrors(validateContactDraft({ name: 'Renamed', phone: five[2].phone }, five, '2'))).toBe(false);
  });
});

describe('validateContactDraft', () => {
  const existing = [contact('a', 0, true, '+919876543210')];

  it('requires a name and a valid phone', () => {
    const errors = validateContactDraft({ name: ' ', phone: '123' }, existing);
    expect(errors.name).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });

  it('rejects the same number written differently', () => {
    expect(validateContactDraft({ name: 'Dup', phone: '98765 43210' }, existing).phone).toMatch(/already/);
  });
});

describe('primary handling', () => {
  const list = [contact('b', 1), contact('a', 0, true), contact('c', 2)];

  it('sorts primary first, then by position', () => {
    expect(sortContacts(list).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('promotes the next contact when the primary is deleted', () => {
    expect(nextPrimaryAfterDelete(list, 'a')).toBe('b');
    expect(nextPrimaryAfterDelete(list, 'c')).toBeNull();
    expect(nextPrimaryAfterDelete([contact('a', 0, true)], 'a')).toBeNull();
  });
});
