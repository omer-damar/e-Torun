/**
 * Cihaz içi lojistik regresyon — bölüm 9.4 / 9.5. İnternet gerekmez.
 *
 * Model `model.json` (ml/src/export_model.py üretir, elle düzenlenmez):
 *   TF = 1 + ln(sayı) → × idf → L2 normalizasyon (yalnızca modeldeki n-gramlar) →
 *   z = intercept + Σ x·coef → p = 1 / (1 + e^−z)
 * ml/src/export_model.py `predict_from_export` ile aynı hesap; parity testi bunu doğrular.
 */

import rawModel from './model.json';
import { charWbNgrams } from './ngrams';
import { normalize } from './normalize';

export type DetectorModel = {
  version: string;
  ngramRange: [number, number];
  intercept: number;
  thresholds: { high: number; low: number };
  /** n-gram → [idf, katsayı] */
  features: Record<string, [number, number]>;
};

export const model = rawModel as unknown as DetectorModel;

let featureMap: Map<string, [number, number]> | null = null;

function features(): Map<string, [number, number]> {
  // 20.000 girdilik nesneden Map ilk kullanımda bir kez kurulur.
  featureMap ??= new Map(Object.entries(model.features));
  return featureMap;
}

/** Normalize edilmiş metnin şüpheli olma olasılığı (0–1). */
export function probabilityOfNormalized(normalized: string, m: DetectorModel = model): number {
  const table = m === model ? features() : new Map(Object.entries(m.features));
  const counts = new Map<string, number>();
  for (const gram of charWbNgrams(normalized, m.ngramRange[0], m.ngramRange[1])) {
    if (table.has(gram)) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let sumSquares = 0;
  const weights: [string, number][] = [];
  for (const [gram, count] of counts) {
    const weight = (1 + Math.log(count)) * table.get(gram)![0];
    weights.push([gram, weight]);
    sumSquares += weight * weight;
  }

  let z = m.intercept;
  const norm = Math.sqrt(sumSquares);
  if (norm > 0) {
    for (const [gram, weight] of weights) z += (weight / norm) * table.get(gram)![1];
  }
  return 1 / (1 + Math.exp(-z));
}

export function classify(text: string): { normalized: string; probability: number } {
  const normalized = normalize(text);
  return { normalized, probability: probabilityOfNormalized(normalized) };
}
