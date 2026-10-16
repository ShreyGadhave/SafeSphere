import { PHONE_DB_PATTERN, formatPhone, isValidPhone, normalizePhone } from '../phone';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['0091 98765 43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['(987) 654-3210', '+919876543210'],
    ['+44 20 7946 0958', '+442079460958'],
    ['022 2266 1234', '02222661234'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '   ', '12345', 'abc', '+91 12345', '+1234567890123456'])('rejects %p', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('always produces values the database accepts', () => {
    for (const input of ['9876543210', '+91 98765 43210', '022 2266 1234', '+44 20 7946 0958']) {
      expect(PHONE_DB_PATTERN.test(normalizePhone(input)!)).toBe(true);
    }
  });
});

describe('isValidPhone / formatPhone', () => {
  it('validates', () => {
    expect(isValidPhone('98765 43210')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
  });

  it('formats Indian mobiles for display and leaves others alone', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhone('+442079460958')).toBe('+442079460958');
  });
});
