import { stepHour, stepMinute } from '@/components/TimePickerBig';
import {
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
      { name: ' Tansiyon ', dose: ' 1 tablet ', times: ['20:00', '08:00'], days: [7, 6, 5, 4, 3, 2, 1], color: 'mavi' },
      'm1',
      { id: 'm1', name: 'x', dose: '', times: [], days: 'everyday', color: 'beyaz', active: true, notificationIds: ['n1'] },
    );
    expect(med).toMatchObject({ name: 'Tansiyon', dose: '1 tablet', times: ['08:00', '20:00'], days: 'everyday', notificationIds: ['n1'] });
  });
});
