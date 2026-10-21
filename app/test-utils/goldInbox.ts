/**
 * Altın test: kullanıcının gerçek gelen kutusundan etiketlediği mesajlar (docs/PROJE_PLANI.md bölüm 9.6).
 * Dosya biçimi `ml/data/inbox_ornek.txt`'de anlatılır; Python tarafı (`ml/src/gold_inbox.py`) aynı kurallarla okur.
 * Bu set yalnızca ölçümdür, eğitimde kullanılmaz.
 */
import type { RiskLevel } from '../src/detector/decide';
import type { RuleId } from '../src/detector/rules';

export const GOLD_LABELS = ['normal', 'reklam', 'dolandiricilik', 'emin_degilim'] as const;
export type GoldLabel = (typeof GOLD_LABELS)[number];

export type GoldItem = {
  /** Dosyadaki sırası (1'den). */
  index: number;
  label: GoldLabel;
  text: string;
  /** Kurallar bu mesaja bakılarak düzeltildi: asıl ölçüme girmez. */
  tuned: boolean;
};

export type ParseResult = { items: GoldItem[]; errors: string[]; duplicates: number };

const TURKISH: Record<string, string> = { ı: 'i', ğ: 'g', ş: 's', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' };

function asciiLower(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[ığşçöüâîû]/g, (ch) => TURKISH[ch])
    .trim()
    .replace(/\s+/g, ' ');
}

/** "Dolandırıcılık ayarlandi" → { label: 'dolandiricilik', tuned: true }; tanınmazsa null. */
export function parseLabel(line: string): { label: GoldLabel; tuned: boolean } | null {
  let value = asciiLower(line);
  const tuned = / ayarlandi$/.test(value);
  if (tuned) value = value.slice(0, -' ayarlandi'.length);
  value = value.replace(/ /g, '_');
  return (GOLD_LABELS as readonly string[]).includes(value) ? { label: value as GoldLabel, tuned } : null;
}

export function parseInbox(content: string): ParseResult {
  const items: GoldItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const blocks = content.replace(/\r\n?/g, '\n').split(/^---[ \t]*$/m);

  blocks.forEach((block, i) => {
    const lines = block.split('\n');
    // Etiketten önceki boş ve "#" satırları açıklamadır.
    let start = 0;
    while (start < lines.length && (!lines[start].trim() || lines[start].trimStart().startsWith('#'))) start += 1;
    if (start === lines.length) return;

    const parsed = parseLabel(lines[start]);
    const text = lines.slice(start + 1).join('\n').trim();
    if (!parsed) {
      errors.push(`${i + 1}. blok: etiket tanınmadı: "${lines[start].trim()}"`);
      return;
    }
    if (!text) {
      errors.push(`${i + 1}. blok: mesaj metni yok`);
      return;
    }
    if (seen.has(text)) {
      duplicates += 1;
      return;
    }
    seen.add(text);
    items.push({ index: items.length + 1, label: parsed.label, text, tuned: parsed.tuned });
  });

  return { items, errors, duplicates };
}

export type GoldDecision = { level: RiskLevel; probability: number; rules: RuleId[] };
type LevelCounts = Record<RiskLevel, number> & { n: number };

const emptyCounts = (): LevelCounts => ({ n: 0, red: 0, yellow: 0, ad: 0, green: 0, too_short: 0 });

/** Uygulamanın gözünden hata: dolandırıcılığı kaçırmak, normale alarm vermek, reklama kırmızı demek. */
export function isMistake(label: GoldLabel, level: RiskLevel): boolean {
  if (label === 'dolandiricilik') return level === 'green' || level === 'ad' || level === 'too_short';
  if (label === 'normal') return level === 'red' || level === 'yellow';
  if (label === 'reklam') return level === 'red';
  return false;
}

const rate = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 1000 : null);

export type GoldReport = {
  olcum: Record<Exclude<GoldLabel, 'emin_degilim'>, LevelCounts>;
  ozet: Record<string, number | null>;
  ayarlanmis: Record<GoldLabel, LevelCounts>;
  emin_degilim: LevelCounts;
  hatalar: { index: number; label: GoldLabel; level: RiskLevel; probability: number; rules: RuleId[]; text: string }[];
};

export function evaluate(items: GoldItem[], decideFn: (text: string) => GoldDecision): GoldReport {
  const olcum = { normal: emptyCounts(), reklam: emptyCounts(), dolandiricilik: emptyCounts() };
  const ayarlanmis = { normal: emptyCounts(), reklam: emptyCounts(), dolandiricilik: emptyCounts(), emin_degilim: emptyCounts() };
  const unsure = emptyCounts();
  const hatalar: GoldReport['hatalar'] = [];

  for (const item of items) {
    const decision = decideFn(item.text);
    const bucket = item.tuned ? ayarlanmis[item.label] : item.label === 'emin_degilim' ? unsure : olcum[item.label];
    bucket.n += 1;
    bucket[decision.level] += 1;
    if (!item.tuned && isMistake(item.label, decision.level)) {
      hatalar.push({ index: item.index, label: item.label, level: decision.level, probability: decision.probability, rules: decision.rules, text: item.text });
    }
  }

  const { normal, reklam, dolandiricilik: fraud } = olcum;
  return {
    olcum,
    ozet: {
      dolandiricilik_kirmizi: rate(fraud.red, fraud.n),
      dolandiricilik_kirmizi_veya_sari: rate(fraud.red + fraud.yellow, fraud.n),
      normal_yanlis_alarm_kirmizi: rate(normal.red, normal.n),
      normal_yanlis_alarm_kirmizi_veya_sari: rate(normal.red + normal.yellow, normal.n),
      reklam_reklam_olarak: rate(reklam.ad, reklam.n),
      reklam_kirmizi: rate(reklam.red, reklam.n),
    },
    ayarlanmis,
    emin_degilim: unsure,
    hatalar,
  };
}

/** Hatalar CSV'si (yalnızca yerelde, `ml/reports/misclassified_gold.csv` gitignore'dadır). */
export function mistakesCsv(hatalar: GoldReport['hatalar']): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = hatalar.map((h) =>
    [h.index, h.label, h.level, h.probability.toFixed(4), quote(h.rules.join(' ')), quote(h.text)].join(','),
  );
  return ['sira,etiket,sonuc,p_dolandiricilik,kurallar,metin', ...rows].join('\n') + '\n';
}
