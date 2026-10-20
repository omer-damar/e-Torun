/**
 * Olasılık + kurallar → kırmızı / sarı / yeşil — PROJE_PLANI.md bölüm 8 "Karar mantığı".
 *
 *   KIRMIZI ← p ≥ T_HIGH
 *             veya LINK ∧ (IMPERSONATION ∨ PRIZE ∨ URGENCY ∨ PERSONAL_INFO)
 *             veya PAYMENT ∧ (URGENCY ∨ IMPERSONATION)
 *             veya PERSONAL_INFO ∧ (IMPERSONATION ∨ URGENCY)          (ek: kod/şifre isteyen kurum taklidi)
 *             veya CALLBACK ∧ IMPERSONATION ∧ URGENCY                (ek: "dosyanız son gün, arayın")
 *   SARI     ← p ≥ T_LOW
 *             veya güçlü tek işaret (LINK, SHORT_LINK, GAMBLING)
 *             veya en az iki farklı işaret (OTP_INFO hariç)
 *   YEŞİL    ← diğer durumlar
 *
 * Plandan bilinçli fark: plan "herhangi bir kural → sarı" diyordu. Gerçek test setinde (806 mesaj)
 * bu, günlük sohbetteki tek kelimeleri ("hemen", "acil", "hediyeler için teşekkürler", "wifi
 * şifresi") uyarıya çevirip yanlış alarmı %1,3'ten %4,3'e çıkarıyordu (hedef ≤ %3). Bu yüzden
 * zayıf işaretler (acele, kurum adı, ödül, şifre, ödeme, "arayın") tek başına sarı yapmaz;
 * birlikte görülürlerse ya da model de şüphelenirse yapar. Kırmızı kombinasyonları değişmedi.
 */

import { classify, model } from './classify';
import { findRules, RULE_EXPLANATIONS, type RuleId } from './rules';

/** 'ad': yasal reklam / kampanya mesajı (dolandırıcılık işareti yok). Kullanıcıya güvenli olarak gösterilir. */
export type RiskLevel = 'red' | 'yellow' | 'green' | 'ad' | 'too_short';

export type Decision = {
  level: RiskLevel;
  title: string;
  advice: string;
  /** "Neden?" listesi, en fazla 4 madde. */
  reasons: string[];
  rules: RuleId[];
  /** Geliştirici/rapor için; kullanıcıya yüzde olarak GÖSTERİLMEZ. */
  probability: number;
};

export const MIN_MESSAGE_LENGTH = 15;
export const MAX_REASONS = 4;

export const LEVEL_TEXT: Record<Exclude<RiskLevel, 'too_short'>, { title: string; advice: string }> = {
  red: {
    title: 'DİKKAT! Bu mesaj büyük ihtimalle dolandırıcılık.',
    advice: 'Linke tıklamayın, kimseye şifre veya kod söylemeyin, para göndermeyin.',
  },
  yellow: {
    title: 'Bu mesajda şüpheli işaretler var.',
    advice: 'Emin olmadan işlem yapmayın, yakınınıza danışın.',
  },
  green: {
    title: 'Belirgin bir tehlike işareti bulunmadı.',
    advice: 'Yine de para veya şifre isteyen mesajlara dikkat edin.',
  },
  ad: {
    title: 'Bu bir reklam / kampanya mesajı.',
    advice:
      'Belirgin bir dolandırıcılık işareti görünmüyor. İstemiyorsanız mesajdaki "RET" yöntemiyle bu reklamları durdurabilirsiniz.',
  },
};

/** Tek başına görülse de sarı uyarı gerektiren işaretler. */
const STRONG_SINGLE_RULES: RuleId[] = ['LINK', 'SHORT_LINK', 'GAMBLING'];

const MODEL_REASON = 'Mesajın yazılışı, bilinen dolandırıcılık ve istenmeyen mesajlara çok benziyor.';

/**
 * ARA ÖNLEM (yeni 3 sınıflı model gelene kadar): mevcut model "spam" verisinin büyük çoğunluğu
 * yasal reklam olduğu için reklamları da yüksek olasılıkla işaretliyor. Yasal reklam işareti
 * (RET / İYS / Mersis) taşıyan ve dolandırıcılık işareti OLMAYAN mesaj, model ne derse desin
 * "Reklam" gösterilir. Dolandırıcılık işareti: kod/şifre isteme, kısa link, kurum taklitli link,
 * bahis, acele ettiren ödeme isteği.
 */
export function isLegalAd(rules: RuleId[]): boolean {
  const has = (id: RuleId) => rules.includes(id);
  return (
    has('AD_MARKER') &&
    !has('PERSONAL_INFO') &&
    !has('SHORT_LINK') &&
    !(has('LINK') && has('IMPERSONATION')) &&
    !has('GAMBLING') &&
    !(has('PAYMENT') && has('URGENCY'))
  );
}

export function decideFrom(probability: number, rules: RuleId[], thresholds = model.thresholds): Exclude<RiskLevel, 'too_short'> {
  const has = (id: RuleId) => rules.includes(id);
  if (isLegalAd(rules)) return 'ad';
  if (
    probability >= thresholds.high ||
    (has('LINK') && (has('IMPERSONATION') || has('PRIZE') || has('URGENCY') || has('PERSONAL_INFO'))) ||
    (has('PAYMENT') && (has('URGENCY') || has('IMPERSONATION'))) ||
    (has('PERSONAL_INFO') && (has('IMPERSONATION') || has('URGENCY'))) ||
    (has('CALLBACK') && has('IMPERSONATION') && has('URGENCY'))
  ) {
    return 'red';
  }
  // Kısa link zaten LINK'i de ekler; reklam işareti bir tehlike işareti değildir.
  const signals = rules.filter((id) => id !== 'OTP_INFO' && id !== 'SHORT_LINK' && id !== 'AD_MARKER');
  if (
    probability >= thresholds.low ||
    STRONG_SINGLE_RULES.some((id) => has(id)) ||
    signals.length >= 2
  ) {
    return 'yellow';
  }
  return 'green';
}

export function decide(text: string): Decision {
  const trimmed = text.trim();
  if (Array.from(trimmed).length < MIN_MESSAGE_LENGTH) {
    return {
      level: 'too_short',
      title: 'Kontrol için mesaj çok kısa.',
      advice: 'Lütfen mesajın tamamını yapıştırın.',
      reasons: [],
      rules: [],
      probability: 0,
    };
  }

  const { normalized, probability } = classify(trimmed);
  const rules = findRules(trimmed, normalized);
  const level = decideFrom(probability, rules);

  // Yeşilde yalnızca bilgilendirici kural (doğrulama kodu uyarısı) gösterilir;
  // kurum adı tek başına "Neden?" listesine girmez.
  const shown =
    level === 'green'
      ? rules.filter((id) => id === 'OTP_INFO')
      : level === 'ad'
        ? (['AD_MARKER'] as RuleId[])
        : rules.filter((id) => id !== 'AD_MARKER' && (id !== 'OTP_INFO' || rules.length === 1));
  const reasons = shown.map((id) => RULE_EXPLANATIONS[id]);
  if ((level === 'red' || level === 'yellow') && probability >= model.thresholds.low && reasons.length < MAX_REASONS) {
    reasons.push(MODEL_REASON);
  }

  return { level, ...LEVEL_TEXT[level], reasons: reasons.slice(0, MAX_REASONS), rules, probability };
}
