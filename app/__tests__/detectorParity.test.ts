import { classify, model } from '@/detector/classify';
import { charWbNgrams } from '@/detector/ngrams';
import VECTORS from '../../ml/exports/parity_vectors.json';

/**
 * Python ↔ TS eşitliği (bölüm 9.5): ml/src/export_model.py'nin ürettiği vektörlerde
 * normalize metin birebir aynı, olasılık farkı < 1e-4 olmalı.
 */

describe('char_wb n-gramları (sklearn ile aynı)', () => {
  it('kelime " w " olarak sarılır ve 3–5 n-gram üretilir', () => {
    expect(charWbNgrams('ab', 3, 5)).toEqual([' ab', 'ab ', ' ab ']);
  });

  it("kelime n'den kısaysa bir kez sayılır, büyük n'lere geçilmez", () => {
    // " a " (3 karakter): n=3 → " a ", offset 0'da kaldı → n=4,5 yok.
    expect(charWbNgrams('a', 3, 5)).toEqual([' a ']);
  });

  it('boş metin', () => {
    expect(charWbNgrams('', 3, 5)).toEqual([]);
  });
});

describe('Python ↔ TS parity', () => {
  it(`en az 150 vektör (şu an ${VECTORS.length})`, () => {
    expect(VECTORS.length).toBeGreaterThanOrEqual(150);
  });

  it('model.json yüklü ve beklenen biçimde (3 sınıf)', () => {
    expect(model.classes).toEqual(['normal', 'reklam', 'dolandiricilik']);
    expect(model.intercepts).toHaveLength(3);
    expect(model.ngramRange).toEqual([3, 5]);
    expect(Object.keys(model.features).length).toBeGreaterThan(1000);
    expect(Object.values(model.features)[0]).toHaveLength(4);
    expect(model.thresholds.low).toBeLessThan(model.thresholds.high);
  });

  it('tüm vektörlerde normalize birebir, her sınıfın olasılık farkı < 1e-4', () => {
    let maxDiff = 0;
    const mismatches: string[] = [];
    for (const v of VECTORS) {
      const { normalized, probabilities, probability } = classify(v.text);
      if (normalized !== v.normalized) mismatches.push(`${JSON.stringify(v.text)} → ${normalized} ≠ ${v.normalized}`);
      model.classes.forEach((name, k) => {
        maxDiff = Math.max(maxDiff, Math.abs(probabilities[name] - v.probabilities[k]));
      });
      expect(probability).toBe(probabilities.dolandiricilik);
    }
    expect(mismatches).toEqual([]);
    expect(maxDiff).toBeLessThan(1e-4);
  });
});
