import { getGreeting, getNextDoseText } from '@/features/home/homeSummary';

describe('getGreeting', () => {
  it('isim varsa ismi ekler', () => {
    expect(getGreeting('Ayşe')).toBe('Merhaba, Ayşe');
  });

  it('isim boş ya da yoksa yalnızca "Merhaba" der', () => {
    expect(getGreeting('')).toBe('Merhaba');
    expect(getGreeting('   ')).toBe('Merhaba');
    expect(getGreeting(null)).toBe('Merhaba');
  });
});

describe('getNextDoseText', () => {
  it('sıradaki dozu saatle yazar', () => {
    expect(getNextDoseText({ time: '20:00', name: 'Tansiyon ilacı' })).toBe('Sıradaki: 20:00 Tansiyon ilacı');
  });

  it('doz yoksa sakin bir mesaj verir', () => {
    expect(getNextDoseText(null)).toBe('Bugün başka ilaç yok');
  });
});
