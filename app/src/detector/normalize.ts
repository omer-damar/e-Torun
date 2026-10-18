/**
 * SMS metni normalizasyonu — docs/PROJE_PLANI.md bölüm 9.2.
 *
 * ml/src/normalize.py ile BİREBİR aynı çıktıyı vermek zorunda (parity testi:
 * __tests__/detectorParity.test.ts). Birini değiştirirsen diğerini de değiştir.
 *
 * JS'te `\d`, `\s`, `\w`, `\b` ASCII; Python'da Unicode davranır. Bu yüzden yalnızca açık
 * karakter sınıfları kullanılır ([0-9], [a-z], [ \t\n\r]).
 */

// 4. adım: aksan katlama.
const ACCENT_FOLD: Record<string, string> = { ç: 'c', ğ: 'g', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

const NOT_SPACE = '[^ \\t\\n\\r]';

// 5. adım: sıra önemli (önce tam URL, sonra www, en son çıplak alan adı).
const URL_PATTERNS = [
  new RegExp(`https?://${NOT_SPACE}+`, 'g'),
  new RegExp(`www\\.${NOT_SPACE}+`, 'g'),
  new RegExp(
    '[a-z0-9-]+(?:\\.[a-z0-9-]+)*' +
      '\\.(?:com|net|org|xyz|top|info|tr|link|site|online|shop|click|live|app' +
      '|ly|co|io|me|gl|cc|biz|vip|pro|club|store)' +
      `(?![a-z0-9-])(?:/${NOT_SPACE}*)?`,
    'g',
  ),
];

// 6. adım: TR IBAN.
const IBAN = /tr[0-9]{2}(?: ?[0-9]{4}){5} ?[0-9]{2}(?![0-9])/g;
// 7. adım: TR cep telefonu.
const PHONE = /(?:\+?90|0)? ?5[0-9]{2} ?[0-9]{3} ?[0-9]{2} ?[0-9]{2}(?![0-9])/g;
const DIGITS = /[0-9]+/g;
const NON_ALNUM = /[^a-z0-9]/g;
const SPACES = / +/g;

export function normalize(input: string): string {
  let text = typeof input.normalize === 'function' ? input.normalize('NFC') : input; // 1
  text = text.replace(/[İIı]/g, 'i'); // 2 — toLowerCase'ten ÖNCE ('İ' iki karaktere dönüşmesin)
  text = text.toLowerCase(); // 3
  text = text.replace(/[çğöşüâîû]/g, (ch) => ACCENT_FOLD[ch]); // 4
  for (const pattern of URL_PATTERNS) text = text.replace(pattern, ' urltoken '); // 5
  text = text.replace(IBAN, ' ibantoken '); // 6
  text = text.replace(PHONE, ' teltoken '); // 7
  text = text.replace(DIGITS, ' num '); // 8
  text = text.replace(NON_ALNUM, ' '); // 9
  return text.replace(SPACES, ' ').replace(/^ +| +$/g, ''); // 10
}
