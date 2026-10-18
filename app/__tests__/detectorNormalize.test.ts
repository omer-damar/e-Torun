import { normalize } from '@/detector/normalize';
// Python testleriyle (ml/tests/test_normalize.py) AYNI dosya: iki taraf aynı çıktıyı vermeli.
import CASES from '../../ml/tests/normalize_cases.json';

describe('normalize (Python ile ortak örnekler)', () => {
  it('en az 30 örnek var', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(CASES.map((c) => [c.input.slice(0, 30) || '<boş>', c] as const))('%s', (_label, c) => {
    expect(normalize(c.input)).toBe(c.expected);
  });

  it('İ tek karakter i olur', () => {
    expect(normalize('İ')).toBe('i');
  });

  it('ayrık yazılmış ş (s + U+0327) da s olur', () => {
    expect(normalize('şifre')).toBe('sifre');
  });

  it('emoji (surrogate çifti) tek boşluk gibi davranır', () => {
    expect(normalize('a🎁b')).toBe('a b');
  });
});
