import { stepHour, stepMinute } from '@/components/TimePickerBig';
import {
  adjacentStep,
  draftToMedication,
  EMPTY_DRAFT,
  suggestNextTime,
  toggleDay,
  validateStep,
} from '@/features/medications/draft';

describe('TimePickerBig adımları', () => {
  it('saat 23 → 0 ve 0 → 23 döner', () => {
    expect(stepHour('23:15', 1)).toBe('00:15');
    expect(stepHour('00:15', -1)).toBe('23:15');
  });

  it('dakika 5er; 55 → 00 olurken saat değişmez', () => {
    expect(stepMinute('08:00', 1)).toBe('08:05');
    expect(stepMinute('08:55', 1)).toBe('08:00');
    expect(stepMinute('08:00', -1)).toBe('08:55');
  });

  it("5'in katı olmayan dakika önce yuvarlanır", () => {
    expect(stepMinute('08:07', 1)).toBe('08:10');
  });
});

describe('validateStep', () => {
  it('ad zorunlu, doz isteğe bağlı', () => {
    expect(validateStep('name', { ...EMPTY_DRAFT, name: '  ' })).toMatch(/adını yazın/);
    expect(validateStep('name', { ...EMPTY_DRAFT, name: 'Tansiyon' })).toBeNull();
    expect(validateStep('dose', EMPTY_DRAFT)).toBeNull();
  });

  it('aynı saat iki kez seçilemez', () => {
    expect(validateStep('times', { ...EMPTY_DRAFT, times: ['08:00', '08:00'] })).toMatch(/iki kez/);
    expect(validateStep('times', { ...EMPTY_DRAFT, times: [] })).toMatch(/En az bir saat/);
  });

  it('belirli günlerde en az bir gün', () => {
    expect(validateStep('days', { ...EMPTY_DRAFT, days: [] })).toMatch(/En az bir gün/);
    expect(validateStep('days', { ...EMPTY_DRAFT, days: [2] })).toBeNull();
  });
});

describe('suggestNextTime', () => {
  it('son saatten 4 saat sonrasını önerir, olanı atlar', () => {
    expect(suggestNextTime(['08:00'])).toBe('12:00');
    expect(suggestNextTime(['20:00'])).toBe('00:00');
    expect(suggestNextTime(['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'])).toBeNull();
  });
});

describe('toggleDay', () => {
  it('ekler / çıkarır ve sıralar', () => {
    expect(toggleDay([5], 1)).toEqual([1, 5]);
    expect(toggleDay([1, 5], 5)).toEqual([1]);
    expect(toggleDay('everyday', 3)).toEqual([3]);
  });
});

describe('draftToMedication', () => {
  it('temizler; 7 gün seçildiyse "her gün" olur; düzenlemede bildirim kimliklerini korur', () => {
    const med = draftToMedication(
      { ...EMPTY_DRAFT, name: ' Tansiyon ', dose: ' 1 tablet ', times: ['20:00', '08:00'], days: [7, 6, 5, 4, 3, 2, 1], color: 'mavi' },
      'm1',
      { id: 'm1', name: 'x', dose: '', times: [], days: 'everyday', color: 'beyaz', active: true, notificationIds: ['n1'] },
    );
    expect(med).toMatchObject({ name: 'Tansiyon', dose: '1 tablet', times: ['08:00', '20:00'], days: 'everyday', notificationIds: ['n1'] });
  });
});

describe('stok ve reçete adımları', () => {
  it('reçete adımı yalnızca stok takibi açıkken görünür', () => {
    const steps = ['name', 'dose', 'times', 'days', 'color', 'stock', 'refill', 'summary'];
    const off = { ...EMPTY_DRAFT, trackStock: false };
    const on = { ...EMPTY_DRAFT, trackStock: true };
    expect(steps[adjacentStep(steps.indexOf('stock'), 1, off)]).toBe('summary');
    expect(steps[adjacentStep(steps.indexOf('summary'), -1, off)]).toBe('stock');
    expect(steps[adjacentStep(steps.indexOf('stock'), 1, on)]).toBe('refill');
  });

  it('stok açıkken sayılar zorunlu ve geçerli olmalı', () => {
    expect(validateStep('stock', { ...EMPTY_DRAFT, trackStock: true, stockUnits: '' })).toMatch(/rakamla/);
    expect(validateStep('stock', { ...EMPTY_DRAFT, trackStock: true, stockUnits: '30', unitsPerDose: '0' })).toMatch(/kaç tane/);
    expect(validateStep('stock', { ...EMPTY_DRAFT, trackStock: true, stockUnits: '30', unitsPerDose: '0,5' })).toBeNull();
    expect(validateStep('stock', { ...EMPTY_DRAFT, trackStock: false, stockUnits: 'x' })).toBeNull();
  });

  it('kayıtta stok ve dolu reçete alanları saklanır; stok kapalıyken ikisi de yok', () => {
    const now = new Date(2026, 9, 19);
    const on = draftToMedication(
      {
        ...EMPTY_DRAFT,
        name: 'Tansiyon',
        trackStock: true,
        stockUnits: '30',
        unitsPerDose: '0,5',
        refill: { department: 'Kardiyoloji', doctor: ' ', hospital: '', contactId: 'c1' },
      },
      'm1',
      undefined,
      now,
    );
    expect(on.stock).toEqual({ unitsPerDose: 0.5, remainingUnits: 30, updatedAt: now.toISOString() });
    expect(on.refill).toEqual({ department: 'Kardiyoloji', contactId: 'c1' });

    const off = draftToMedication({ ...EMPTY_DRAFT, name: 'X', refill: { department: 'Dahiliye', doctor: '', hospital: '', contactId: '' } }, 'm2');
    expect(off.stock).toBeUndefined();
    expect(off.refill).toBeUndefined();
  });
});
