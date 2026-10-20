/**
 * Model olasılıkları + kurallar → kırmızı / sarı / yeşil / reklam — PROJE_PLANI.md bölüm 8 ve 9.6.
 *
 * Model (v2) 3 sınıf verir: normal, reklam, dolandırıcılık. pD = dolandırıcılık, pR = reklam olasılığı.
 *
 *   YEŞİL   ← doğrulama kodu veren (istemeyen), bilinmeyen link içermeyen mesaj ∧ kural birleşimi yok
 *   YEŞİL   ← bütün linkleri kamu kurumu adresi (gov.tr …) ∧ para / şifre / arama / bahis / ödül yok
 *   REKLAM  ← yasal reklam işareti (RET/İYS/Mersis) ∧ pD < T_LOW ∧ tehlike işareti yok
 *   KIRMIZI ← pD ≥ T_HIGH
 *             veya kural birleşimi ∧ model reklam demiyor (pR < 0,5) ∧ (pD ≥ 0,1 ∨ kurum taklitli link)
 *   REKLAM  ← model reklam diyor (pR ≥ 0,5) ∧ pD < T_LOW ∧ tehlike işareti yok ∧ bilinmeyen link yok
 *   SARI    ← pD ≥ T_LOW, ya da kural birleşimi (model reklam diyorsa buraya düşer),
 *             ya da güçlü tek işaret (LINK, SHORT_LINK, GAMBLING, FAKE_LINK),
 *             ya da en az iki zayıf işaret ∧ model mesajı açıkça normal saymıyor
 *   YEŞİL   ← diğer durumlar
 *
 * Kural birleşimleri:
 *   LINK ∧ (kurum adı ∨ ödül ∨ acele ∨ kişisel bilgi)
 *   PAYMENT ∧ (acele ∨ (kurum adı ∧ iletişim kanalı))
 *   PERSONAL_INFO ∧ (acele ∨ (kurum adı ∧ iletişim kanalı))
 *   CALLBACK ∧ kurum adı ∧ acele
 * İletişim kanalı = link, "arayın" ya da acele ettirme.
 *
 * Neden böyle (v2 ölçümü, gerçek doğrulama+test mesajları ve 400 sentetik zor negatif):
 * - Kurallar tek başına karar verdiğinde gerçek reklamların 234/770'i kırmızı oluyordu (link + "hediye",
 *   banka adı + link). Bu kombinasyonların 263'ünde model mesajın reklam olduğunu biliyordu; gerçek
 *   dolandırıcılıkta ise 13 kombinasyonun 11'inde model reklam demiyordu. Bu yüzden kural kırmızısı
 *   model reklam demiyorsa verilir; diyorsa en fazla sarı.
 * - Kurum adı (banka, kargo, e-Devlet) meşru mesajların çoğunda geçer: ekstre, maaş, teslimat, kod.
 *   Bu yüzden ödeme/şifre kelimesiyle birlikte ancak bir iletişim kanalı (link, arama, acele) varsa
 *   kırmızı yapar; sarı sayımında da yalnızca link, arama, şifre veya ödeme ile birlikte sayılır.
 * - Reklam kılığındaki dolandırıcılık için: tehlike işareti (kişisel bilgi isteği, bahis, kurum taklitli
 *   link, kısa link + ödül, ödeme + acele) olan mesaj model ne derse desin "Reklam" gösterilmez.
 * - Model "Koçtaş'tan hediye kartı kazanın + link", "Migros anketi 1.000 TL" gibi sahte kampanyaları da
 *   reklam sanabiliyor (eğitimde kullanılmayan çeviri dolandırıcılık mesajlarının 100/555'i). 2021'den beri
 *   ticari SMS'te ret yöntemi zorunlu (6563 s. Kanun, İYS); bu yüzden yasal reklam işareti OLMAYAN ve
 *   bilinmeyen link içeren mesaja "Reklam" denmez, en az sarı verilir.
 */

import { type ClassProbabilities, classify, model } from './classify';
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
  /** Dolandırıcılık olasılığı. Geliştirici/rapor için; kullanıcıya yüzde olarak GÖSTERİLMEZ. */
  probability: number;
};

/** Karar için gereken model çıktısı. Yalnızca sayı verilirse dolandırıcılık olasılığı sayılır (pR = 0). */
export type ModelOutput = number | Pick<ClassProbabilities, 'dolandiricilik' | 'reklam'>;

export const MIN_MESSAGE_LENGTH = 15;
export const MAX_REASONS = 4;
/** Model bu olasılığın üstünde "reklam" diyorsa kural birleşimi tek başına kırmızı yapmaz. */
export const AD_PROBABILITY = 0.5;
/**
 * Kural birleşimi, dolandırıcılık olasılığı bunun altındaysa kırmızı değil sarı yapar (kurum taklitli link
 * hariç). Gerçek doğrulama+test dolandırıcılığında reklam sayılmayan birleşimlerin hepsinde olasılık
 * ≥ 0,58'di; bu sınırın altındaki birleşimler listede olmayan kurum adreslerinden gelen meşru mesajlardı.
 */
export const COMBINATION_MIN_FRAUD = 0.1;
/** Model bu olasılığın üstünde "normal" diyorsa iki zayıf işaret sarı yapmaz. */
export const NORMAL_PROBABILITY = 0.5;

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
const STRONG_SINGLE_RULES: RuleId[] = ['LINK', 'SHORT_LINK', 'GAMBLING', 'FAKE_LINK'];

const MODEL_REASON = 'Mesajın yazılışı, bilinen dolandırıcılık mesajlarına çok benziyor.';
const MODEL_AD_REASON = 'Mesajın yazılışı reklam ve kampanya mesajlarına benziyor.';

function has(rules: RuleId[], id: RuleId): boolean {
  return rules.includes(id);
}

/** Bir mesajı model ya da reklam işareti ne derse desin "Reklam" saymayı engelleyen işaretler. */
export function hasDangerForAd(rules: RuleId[]): boolean {
  const h = (id: RuleId) => has(rules, id);
  return (
    h('PERSONAL_INFO') ||
    h('GAMBLING') ||
    h('FAKE_LINK') ||
    (h('SHORT_LINK') && h('PRIZE')) ||
    (h('PAYMENT') && h('URGENCY'))
  );
}

/** Yasal reklam işareti taşıyan ve dolandırıcılık işareti OLMAYAN mesaj. */
export function isLegalAd(rules: RuleId[]): boolean {
  return has(rules, 'AD_MARKER') && !hasDangerForAd(rules);
}

/** Kural birleşimleri (bkz. dosya başı). */
export function hasRuleCombination(rules: RuleId[]): boolean {
  const h = (id: RuleId) => has(rules, id);
  const reachOut = h('LINK') || h('CALLBACK') || h('URGENCY');
  return (
    (h('LINK') && (h('IMPERSONATION') || h('PRIZE') || h('URGENCY') || h('PERSONAL_INFO'))) ||
    (h('PAYMENT') && (h('URGENCY') || (h('IMPERSONATION') && reachOut))) ||
    (h('PERSONAL_INFO') && (h('URGENCY') || (h('IMPERSONATION') && reachOut))) ||
    (h('CALLBACK') && h('IMPERSONATION') && h('URGENCY'))
  );
}

/**
 * Bütün linkleri kamu kurumu adresi (…gov.tr, …bel.tr, …edu.tr) olan ve para, şifre/kod, ödül istemeyen,
 * "şu numarayı arayın" demeyen bilgilendirme. Dolandırıcılığın asıl yolu kapalı olduğu için model şüphelense
 * de yeşil. (Telefonda: İŞKUR'un esube.iskur.gov.tr linkli iş ilanı bildirimi modelden kırmızı alıyordu; iş
 * ilanı dili eğitimdeki sahte iş ilanlarına benziyor.) Şirket ve platform adresleri bu istisnayı almaz:
 * çeviri dolandırıcılık mesajlarında YouTube videosu ya da Kariyer.net adı geçen örnekler vardı.
 */
export function isOnlyOfficialLinkNotice(rules: RuleId[]): boolean {
  return (
    has(rules, 'OFFICIAL_LINK') &&
    !['LINK', 'PERSONAL_INFO', 'PAYMENT', 'CALLBACK', 'GAMBLING', 'PRIZE'].some((id) => has(rules, id as RuleId))
  );
}

/** Sarı sayımındaki zayıf işaretler. Kurum adı yalnızca bir talep ya da iletişim kanalıyla birlikte sayılır. */
function weakSignals(rules: RuleId[]): RuleId[] {
  const institutionCounts = ['LINK', 'CALLBACK', 'PERSONAL_INFO', 'PAYMENT'].some((id) => has(rules, id as RuleId));
  return rules.filter(
    (id) =>
      id !== 'OTP_INFO' &&
      id !== 'OFFICIAL_LINK' &&
      id !== 'SHORT_LINK' &&
      id !== 'AD_MARKER' &&
      (id !== 'IMPERSONATION' || institutionCounts),
  );
}

export function decideFrom(
  output: ModelOutput,
  rules: RuleId[],
  thresholds = model.thresholds,
): Exclude<RiskLevel, 'too_short'> {
  const fraud = typeof output === 'number' ? output : output.dolandiricilik;
  const ad = typeof output === 'number' ? 0 : output.reklam;
  const normal = 1 - fraud - ad;
  const modelSaysAd = ad >= AD_PROBABILITY;
  const combination = hasRuleCombination(rules);

  // Kod VEREN (istemeyen), bilinmeyen link içermeyen mesaj: doğrulama kodu. Model şüphelense de yeşil;
  // ekranda "kodu kimseye söylemeyin" uyarısı gösterilir. (Telefonda: "Kariyer.net onay kod 482913".)
  if (has(rules, 'OTP_INFO') && !has(rules, 'PERSONAL_INFO') && !has(rules, 'LINK') && !combination) return 'green';
  if (isOnlyOfficialLinkNotice(rules)) return 'green';
  if (isLegalAd(rules) && fraud < thresholds.low) return 'ad';
  if (
    fraud >= thresholds.high ||
    (combination && !modelSaysAd && (fraud >= COMBINATION_MIN_FRAUD || has(rules, 'FAKE_LINK')))
  ) {
    return 'red';
  }
  if (modelSaysAd && fraud < thresholds.low && !hasDangerForAd(rules) && !has(rules, 'LINK')) return 'ad';
  if (
    fraud >= thresholds.low ||
    combination ||
    STRONG_SINGLE_RULES.some((id) => has(rules, id)) ||
    (weakSignals(rules).length >= 2 && normal < NORMAL_PROBABILITY)
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

  const { normalized, probabilities, probability } = classify(trimmed);
  const rules = findRules(trimmed, normalized);
  const level = decideFrom(probabilities, rules);

  // Yeşilde yalnızca bilgilendirici kural (doğrulama kodu uyarısı) gösterilir;
  // kurum adı tek başına "Neden?" listesine girmez.
  let shown: RuleId[];
  if (level === 'green') shown = rules.filter((id) => id === 'OTP_INFO' || id === 'OFFICIAL_LINK');
  else if (level === 'ad') shown = has(rules, 'AD_MARKER') ? ['AD_MARKER'] : [];
  else {
    shown = rules.filter(
      (id) => id !== 'AD_MARKER' && id !== 'OFFICIAL_LINK' && (id !== 'OTP_INFO' || rules.length === 1),
    );
  }
  const reasons = shown.map((id) => RULE_EXPLANATIONS[id]);
  if (level === 'ad' && reasons.length === 0) reasons.push(MODEL_AD_REASON);
  if ((level === 'red' || level === 'yellow') && probability >= model.thresholds.low && reasons.length < MAX_REASONS) {
    reasons.push(MODEL_REASON);
  }

  return { level, ...LEVEL_TEXT[level], reasons: reasons.slice(0, MAX_REASONS), rules, probability };
}
