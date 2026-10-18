/**
 * Türkiye cep telefonu numaraları — PROJE_PLANI.md bölüm 7.
 * Kabul: 05XXXXXXXXX, 5XXXXXXXXX, +905XXXXXXXXX, 905XXXXXXXXX (boşluk, tire, parantez serbest).
 * Depoda her zaman "05XXXXXXXXX" olarak tutulur.
 */

const SEPARATORS = /[ \t\-().]/g;

export function normalizePhone(input: string): string | null {
  const compact = input.replace(SEPARATORS, '');
  const match =/^(?:\+?90|0)?(5[0-9]{9})$/.exec(compact);
  if (!match) return null;
  return `0${match[1]}`;
}

/** "05551234567" → "0555 123 45 67". Geçersizse girdiyi olduğu gibi döndürür. */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  const d = normalized;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

/** VoiceOver rakamları tek tek okusun diye: "0 5 5 5, 1 2 3, 4 5, 6 7". */
export function phoneForSpeech(phone: string): string {
  return formatPhone(phone)
    .split(' ')
    .map((group) => group.split('').join(' '))
    .join(', ');
}

/**
 * Mesajlar uygulamasını numara ve hazır metinle açan bağlantı. iOS biçimi `sms:NUMARA&body=...`
 * (`?body=` iOS'ta gövdeyi doldurmaz). Gönder tuşuna kullanıcı kendisi basar.
 */
export function smsUrl(phone: string, body: string): string {
  const number = normalizePhone(phone) ?? phone.replace(SEPARATORS, '');
  return `sms:${number}&body=${encodeURIComponent(body)}`;
}

export function telUrl(phone: string): string {
  return `tel:${normalizePhone(phone) ?? phone.replace(SEPARATORS, '')}`;
}
