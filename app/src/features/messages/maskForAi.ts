/**
 * D8 — Mesaj yapay zekâya gönderilmeden önce telefonda maskelenir (docs/PROJE_PLANI.md bölüm 8, 11).
 * Kişiye ait olabilecek her sayı ve adres yer tutucuyla değişir; karar için gerekli olan bağlantı
 * adresleri ve tutarlar ("1.500 TL") kalır.
 */

const URL = /(?:https?:\/\/|www\.)[^ \t\n\r]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^ \t\n\r]*/gi;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const IBAN = /\bTR[ ]?[0-9]{2}(?:[ ]?[0-9]{4}){5}[ ]?[0-9]{2}\b/gi;
const CARD = /\b[0-9]{4}(?:[ -]?[0-9]{4}){3}\b/g;
/** 0555 000 00 00, +90 555 000 0000, (0212) 000 00 00, 0850 000 00 00 */
const PHONE = /(?<![0-9])(?:\+?90[ -]?)?\(?0?[2-9][0-9]{2}\)?[ -]?[0-9]{3}[ -]?[0-9]{2}[ -]?[0-9]{2}\b/g;
/** 444 0 444, 444 00 00 gibi çağrı merkezi numaraları. */
const CALL_CENTER = /\b444[ -]?[0-9][ -]?[0-9]{3}\b|\b444[ -]?[0-9]{2}[ -]?[0-9]{2}\b/g;
/** Kalan 4+ haneli sayılar: doğrulama kodu, takip no, müşteri no. Tutarlar ve yıllar kalır. */
const LONG_NUMBER = /\b[0-9]{4,}\b(?![ ]?(?:tl|₺|lira|try)\b)/gi;
const YEAR = /^(?:19|20)[0-9]{2}$/;

function maskPlainText(text: string): string {
  return text
    .replace(EMAIL, '[eposta]')
    .replace(IBAN, '[iban]')
    .replace(CARD, '[kart]')
    .replace(PHONE, '[numara]')
    .replace(CALL_CENTER, '[numara]')
    .replace(LONG_NUMBER, (digits) => (YEAR.test(digits) ? digits : '[kod]'));
}

/** Bağlantının adresi kalır; yolundaki uzun sayılar (kişiye özel takip kodları) gizlenir. */
function maskUrl(url: string): string {
  const slash = url.replace(/^https?:\/\//i, '').indexOf('/');
  if (slash === -1) return url;
  const cut = url.length - url.replace(/^https?:\/\//i, '').length + slash;
  return url.slice(0, cut) + url.slice(cut).replace(/[0-9]{4,}/g, '[kod]');
}

export function maskForAi(text: string): string {
  let result = '';
  let last = 0;
  for (const match of text.matchAll(URL)) {
    result += maskPlainText(text.slice(last, match.index)) + maskUrl(match[0]);
    last = match.index + match[0].length;
  }
  return result + maskPlainText(text.slice(last));
}
