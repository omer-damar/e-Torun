import { formatTurkishDate } from '@/utils/date';

describe('formatTurkishDate', () => {
  it('"gün ay haftagünü" biçiminde yazar', () => {
    expect(formatTurkishDate(new Date(2026, 9, 18))).toBe('18 Ekim Pazar');
  });

  it('Türkçe karakterli ay ve gün adlarını doğru yazar', () => {
    expect(formatTurkishDate(new Date(2026, 1, 4))).toBe('4 Şubat Çarşamba');
    expect(formatTurkishDate(new Date(2026, 4, 19))).toBe('19 Mayıs Salı');
    expect(formatTurkishDate(new Date(2026, 7, 1))).toBe('1 Ağustos Cumartesi');
  });
});
