/**
 * Cihaz içi 3 sınıflı lojistik regresyon (normal / reklam / dolandırıcılık) — bölüm 9.4 / 9.6.
 * İnternet gerekmez.
 *
 * Model `model.json` (ml/src/export_model.py üretir, elle düzenlenmez):
 *   TF = 1 + ln(sayı) → × idf → L2 normalizasyon (yalnızca modeldeki n-gramlar) →
 *   z_k = intercept_k + Σ x·coef_k → softmax
 * ml/src/export_model.py `predict_from_export` ile aynı hesap; parity testi bunu doğrular.
 */

import rawModel from './model.json';
import { charWbNgrams } from './ngrams';
import { normalize } from './normalize';

export type DetectorClass = 'normal' | 'reklam' | 'dolandiricilik';

export type DetectorModel = {
  version: string;
  classes: DetectorClass[];
  ngramRange: [number, number];
  intercepts: number[];
  /** Dolandırıcılık olasılığı eşikleri: high → KIRMIZI, low → SARI. */
  thresholds: { high: number; low: number };
  /** n-gram → [idf, sınıf başına katsayılar...] */
  features: Record<string, number[]>;
};

export type ClassProbabilities = Record<DetectorClass, number>;

export const model = rawModel as unknown as DetectorModel;

let featureMap: Map<string, number[]> | null = null;

function features(): Map<string, number[]> {
  // 20.000 girdilik nesneden Map ilk kullanımda bir kez kurulur.
  featureMap ??= new Map(Object.entries(model.features));
  return featureMap;
}

/** Normalize edilmiş metnin sınıf olasılıkları (toplamı 1). */
export function probabilitiesOfNormalized(normalized: string, m: DetectorModel = model): ClassProbabilities {
  const table = m === model ? features() : new Map(Object.entries(m.features));
  const counts = new Map<string, number>();
  for (const gram of charWbNgrams(normalized, m.ngramRange[0], m.ngramRange[1])) {
    if (table.has(gram)) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let sumSquares = 0;
  const weights: [number[], number][] = [];
  for (const [gram, count] of counts) {
    const row = table.get(gram)!;
    const weight = (1 + Math.log(count)) * row[0];
    weights.push([row, weight]);
    sumSquares += weight * weight;
  }

  const z = [...m.intercepts];
  const norm = Math.sqrt(sumSquares);
  if (norm > 0) {
    for (const [row, weight] of weights) {
      for (let k = 0; k < z.length; k++) z[k] += (weight / norm) * row[k + 1];
    }
  }
  const top = Math.max(...z);
  const exp = z.map((v) => Math.exp(v - top));
  const total = exp.reduce((a, b) => a + b, 0);
  return Object.fromEntries(m.classes.map((name, k) => [name, exp[k] / total])) as ClassProbabilities;
}

export function classify(text: string): {
  normalized: string;
  probabilities: ClassProbabilities;
  /** Dolandırıcılık olasılığı (eşikler buna uygulanır). */
  probability: number;
} {
  const normalized = normalize(text);
  const probabilities = probabilitiesOfNormalized(normalized);
  return { normalized, probabilities, probability: probabilities.dolandiricilik };
}
