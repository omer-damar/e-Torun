import { formatPhone, normalizePhone, phoneForSpeech, telUrl } from '@/features/emergency/phone';

describe('normalizePhone', () => {
  it.each([
    ['05551234567', '05551234567'],
    ['5551234567', '05551234567'],
    ['+905551234567', '05551234567'],
    ['905551234567', '05551234567'],
    ['0555 123 45 67', '05551234567'],
    ['0 (555) 123-45-67', '05551234567'],
    ['+90 555 123 45 67', '05551234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '0555123456', '055512345678', '02121234567', '112', 'abc', '04551234567'])(
    'geçersiz: "%s"',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

describe('formatPhone', () => {
  it('okunaklı biçimde yazar', () => {
    expect(formatPhone('+905551234567')).toBe('0555 123 45 67');
  });
});

describe('phoneForSpeech', () => {
  it('rakamları tek tek okunacak şekilde ayırır', () => {
    expect(phoneForSpeech('05551234567')).toBe('0 5 5 5, 1 2 3, 4 5, 6 7');
  });
});

describe('telUrl', () => {
  it('normalize edilmiş numarayla tel: bağlantısı üretir', () => {
    expect(telUrl('0555 123 45 67')).toBe('tel:05551234567');
  });
});
