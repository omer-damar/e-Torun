/**
 * Açıklanabilir kurallar — PROJE_PLANI.md bölüm 8 "Kurallar".
 *
 * Anahtar kelimeler NORMALİZE edilmiş metinde aranır (Türkçe karaktersiz yazım da yakalanır:
 * "hesabiniz bloke"). Her kelime kelime BAŞINDA eşleşir (kök): "bloke" → "bloke", "blokeli";
 * ama "kargo" → "ekargo" içinde değil. Link ve kısa link ham metinde de aranır.
 */

import { normalize } from './normalize';

export type RuleId =
  | 'LINK'
  | 'SHORT_LINK'
  | 'URGENCY'
  | 'IMPERSONATION'
  | 'PRIZE'
  | 'PERSONAL_INFO'
  | 'PAYMENT'
  | 'GAMBLING'
  | 'CALLBACK'
  | 'OTP_INFO';

/** Kullanıcıya gösterilecek sade açıklamalar ("Neden?" listesi). */
export const RULE_EXPLANATIONS: Record<RuleId, string> = {
  LINK: 'Mesajda bir internet bağlantısı var. Bankalar ve devlet kurumları SMS\'teki bağlantıdan bilgi girmenizi istemez.',
  SHORT_LINK: 'Bağlantı kısaltılmış; nereye gittiği gizleniyor.',
  URGENCY: 'Sizi acele ettirmeye ya da korkutmaya çalışıyor. Dolandırıcılar düşünmenize fırsat vermek istemez.',
  IMPERSONATION: 'Resmi bir kurum veya şirket adına yazılmış gibi görünüyor.',
  PRIZE: 'Ödül, hediye veya para iadesi vaat ediyor.',
  PERSONAL_INFO: 'Şifrenizi, kart bilgilerinizi, kimlik bilgilerinizi veya size gelen kodu istiyor.',
  PAYMENT: 'Para göndermenizi veya ödeme yapmanızı istiyor.',
  GAMBLING: 'Yasa dışı bahis reklamı olabilir.',
  CALLBACK:
    'Sizden mesajdaki numarayı aramanızı istiyor. Kurumu aramanız gerekiyorsa numarayı mesajdan değil, resmi sitesinden bulun.',
  OTP_INFO:
    'Bu bir doğrulama kodu. Sizi arayan kişi banka görevlisi olsa bile bu kodu kimseye söylemeyin.',
};

/** "Neden?" listesindeki sıra: en tehlikeli işaret en üstte. */
export const RULE_PRIORITY: RuleId[] = [
  'PERSONAL_INFO',
  'PAYMENT',
  'LINK',
  'SHORT_LINK',
  'URGENCY',
  'CALLBACK',
  'IMPERSONATION',
  'PRIZE',
  'GAMBLING',
  'OTP_INFO',
];

// Normalize edilmiş biçimde (küçük harf, Türkçe karaktersiz, rakamlar "num").
const KEYWORDS: Record<Exclude<RuleId, 'LINK' | 'SHORT_LINK' | 'OTP_INFO'>, string[]> = {
  URGENCY: [
    'hemen', 'acil', 'derhal', 'son gun', 'son gunu', 'son gundur', 'bugun son', 'num saat icinde', 'saat icinde',
    'aksi takdirde', 'aksi halde', 'bloke', 'askiya', 'iptal edil', 'kapatil', 'kapanacak', 'son uyari', 'haciz',
    'ceza uygulan', 'yasal islem', 'suresi dol', 'yasal sure', 'magduriyet', 'magdur olmamak', 'hapis ceza', 'hapse', 'gozalti', 'durdurulacak',
  ],
  IMPERSONATION: [
    'e devlet', 'edevlet', 'turkiye gov', 'ptt', 'kargo', 'yurtici', 'aras kargo', 'mng kargo', 'surat kargo', 'trendyol',
    'hepsiburada', 'banka', 'bankasi', 'ziraat', 'garanti', 'akbank', 'is bankasi', 'yapi kredi', 'halkbank',
    'vakifbank', 'qnb', 'denizbank', 'enpara', 'vergi', 'gelir idaresi', 'icra', 'sgk', 'emniyet', 'savcilik',
    'mahkeme', 'masak', 'turkcell', 'vodafone', 'turk telekom', 'hgs', 'ogs', 'karayollari', 'kgm', 'ispark',
    'uyap', 'tebligat', 'e tebligat', 'hukuk burosu', 'avukat', 'av ', 'uzlastirma', 'uzlasma', 'arabulucu', 'btk',
    'saglik bakanligi', 'e nabiz', 'mhrs', 'binance', 'jandarma', 'polis',
  ],
  PRIZE: [
    'kazandiniz', 'kazandin', 'hediye', 'odul', 'cekilis', 'iade', 'bonus', 'tebrikler', 'sansli', 'puaniniz',
    'puanlariniz', 'para iadesi', 'aidat iade', 'destek odemesi', 'yardim odemesi',
  ],
  PERSONAL_INFO: [
    'sifre', 'parola', 'kart bilgi', 'kart numara', 'kart no', 'cvv', 'cvc', 'guvenlik kodu', 'son kullanma',
    'tc kimlik', 'tc no', 'kimlik numara', 'kimlik bilgi', 'kimlik dogrula', 'bilgilerinizi dogrula',
    'bilgilerinizi guncelle', 'bilgilerinizi gir', 'bilgilerinizi onayla', 'banka bilgi', 'iban inizi',
    'ibaninizi', 'gelen kodu', 'kodu bize', 'kodu iletin', 'kodu paylas', 'kodu bana',
  ],
  PAYMENT: [
    'ibantoken', 'odeme yap', 'odemeniz', 'odeyin', 'odeyiniz', 'odemezseniz', 'gumruk', 'borcunuz', 'borcu ',
    'borc ', 'havale', 'eft', 'para gonder', 'gonderin', 'yatirin', 'aktarin', 'hizmet bedel', 'teslimat ucret',
    'kargo ucret', 'ucretini ode', 'masraf', 'icra masraf', 'guvenli hesap',
  ],
  GAMBLING: ['bahis', 'casino', 'deneme bonusu', 'freespin', 'free spin', 'slot', 'iddaa', 'jackpot', 'rulet', 'betting'],
  CALLBACK: [
    'arayiniz', 'arayin', 'aramaniz', 'irtibata gec', 'iletisime gec', 'donus sagla', 'geri donus', 'bize ulas',
    'ulasin',
  ],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Kelime başında eşleşme: "(^| )kök". Sondaki boşluklu kökler ("borc ") tam kelime içindir.
const PATTERNS = Object.fromEntries(
  Object.entries(KEYWORDS).map(([id, words]) => [id, new RegExp(`(?:^| )(?:${words.map(escape).join('|')})`)]),
) as Record<keyof typeof KEYWORDS, RegExp>;

const SHORT_LINK = /(?:^|[^a-z0-9.])(?:bit\.ly|tinyurl\.com|cutt\.ly|t\.ly|rebrand\.ly|goo\.gl|t\.co|qrsu\.io|is\.gd|ow\.ly|shorturl\.at|s\.id|rb\.gy|tiny\.cc)(?:\/|$|[^a-z0-9])/i;
const OTP = /(?:^| )(?:dogrulama|onay|guvenlik|sms|giris|tek kullanimlik) (?:kodu|kodunuz|sifre|sifreniz)/;
/** Kodu veren gerçek kurum mesajlarındaki uyarı: "kimseyle paylaşmayın". */
const DO_NOT_SHARE = /(?:^| )(?:kimseyle|kimseye|paylasmayin|paylasmayiniz|vermeyin|vermeyiniz|soylemeyin|soylemeyiniz)/;

/**
 * Link adresinde kurum adı ("ptt-kargo.xyz", "e-devlet-iade.com", "turkiye.gov.clskl.com").
 * Normalize, linkleri "urltoken" yaptığı için bu kontrol ham metindeki adreslerde yapılır.
 */
const URL_IN_RAW = /(?:https?:\/\/|www\.)[^ \t\n\r]+|[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^ \t\n\r]*)?/gi;
const IMPERSONATING_HOST =
  /e-?devlet|turkiye|gov|ptt|kargo|yurtici|aras|mng|banka|bank|ziraat|garanti|akbank|isbank|yapikredi|halkbank|vakif|vergi|gib|icra|sgk|hgs|ogs|kgm|ispark|uyap|tebligat|mhrs|enabiz|turkcell|vodafone|telekom/;

function linksIn(raw: string): string[] {
  const folded = raw.toLowerCase().replace(/[çğıöşü]/g, (ch) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[ch]!);
  return folded.match(URL_IN_RAW) ?? [];
}

/** "https://www.turkiye.gov.tr/x" → "www.turkiye.gov.tr" */
function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, '').split(/[/?#:]/)[0];
}

/**
 * Resmi devlet alan adı (*.gov.tr). Dolandırıcılar bu uzantıyı alamaz; "turkiye.gov.tr.xyz.com"
 * gibi taklitler .gov.tr ile BİTMEDİĞİ için yakalanır.
 */
export function isOfficialGovLink(url: string): boolean {
  const host = hostOf(url);
  return host === 'gov.tr' || host.endsWith('.gov.tr');
}

function hasImpersonatingLink(raw: string): boolean {
  return linksIn(raw).some((url) => !isOfficialGovLink(url) && IMPERSONATING_HOST.test(url));
}

/** Mesajdaki bütün linkler resmi .gov.tr adresiyse link kuralı uygulanmaz. */
function onlyOfficialLinks(raw: string): boolean {
  const links = linksIn(raw);
  return links.length > 0 && links.every(isOfficialGovLink);
}

/** Mesajdaki kural tetiklerini bulur (sıra: RULE_PRIORITY). */
export function findRules(raw: string, normalized: string = normalize(raw)): RuleId[] {
  const found = new Set<RuleId>();
  const text = ` ${normalized} `;

  if (normalized.includes('urltoken') && !onlyOfficialLinks(raw)) found.add('LINK');
  if (SHORT_LINK.test(raw)) {
    found.add('SHORT_LINK');
    found.add('LINK');
  }
  for (const id of Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]) {
    if (PATTERNS[id].test(text)) found.add(id);
  }
  if (found.has('LINK') && hasImpersonatingLink(raw)) found.add('IMPERSONATION');

  // Kod içeren mesaj: bilgilendirici (bkz. decide.ts). Kodu VERİP "kimseyle paylaşmayın" diyorsa
  // ve link yoksa "şifre/kod istiyor" sayılmaz (bankanın gerçek doğrulama mesajı).
  if (OTP.test(text) && / num /.test(text)) {
    found.add('OTP_INFO');
    if (DO_NOT_SHARE.test(text) && !found.has('LINK')) found.delete('PERSONAL_INFO');
  }

  return RULE_PRIORITY.filter((id) => found.has(id));
}
