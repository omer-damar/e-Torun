import type { Medication } from '@/features/medications/model';
import {
  addUnits,
  applyTaken,
  applyUndo,
  buildRefillSms,
  describeDaysLeft,
  getDailyUnits,
  getDaysLeft,
  getRefillReminderDate,
  getRefillStatus,
  parseUnits,
  withDative,
} from '@/features/medications/stock';

const now = new Date(2026, 9, 19, 12, 0); // 19 Ekim 2026

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  name: 'Tansiyon ilacı',
  dose: '1 tablet',
  times: ['08:00', '20:00'],
  days: 'everyday',
  color: 'beyaz',
  active: true,
  notificationIds: [],
  stock: { unitsPerDose: 1, remainingUnits: 10, updatedAt: '' },
  ...over,
});

describe('kalan gün', () => {
  it('plan kabul kriteri: 10 tablet, günde 2 doz → 5 gün; 3 ALDIM sonrası → 3 gün', () => {
    expect(getDaysLeft(med())).toBe(5);
    let stock = med().stock!;
    for (let i = 0; i < 3; i++) stock = applyTaken(stock, now);
    expect(stock.remainingUnits).toBe(7);
    expect(getDaysLeft(med({ stock }))).toBe(3);
  });

  it('belirli günlerde haftalık ortalama kullanılır', () => {
    // Haftada 3 gün × 1 doz = günde 3/7 tablet; 6 tablet → 14 gün
    const weekly = med({ times: ['08:00'], days: [1, 3, 5], stock: { unitsPerDose: 1, remainingUnits: 6, updatedAt: '' } });
    expect(getDailyUnits(weekly)).toBeCloseTo(3 / 7);
    expect(getDaysLeft(weekly)).toBe(14);
  });

  it('yarım tablet desteklenir', () => {
    const half = med({ times: ['08:00'], stock: { unitsPerDose: 0.5, remainingUnits: 5, updatedAt: '' } });
    expect(getDaysLeft(half)).toBe(10);
    expect(applyTaken(half.stock!, now).remainingUnits).toBe(4.5);
  });

  it('stok takibi yoksa null ve hiçbir uyarı yok', () => {
    expect(getDaysLeft(med({ stock: undefined }))).toBeNull();
    expect(getRefillStatus(med({ stock: undefined }), 10)).toBe('unknown');
    expect(describeDaysLeft(med({ stock: undefined }), now)).toBeNull();
  });
});

describe('stok değişimleri', () => {
  it('stok 0 altına inmez; geri al geri ekler; yeni kutu eklenir', () => {
    const empty = applyTaken({ unitsPerDose: 1, remainingUnits: 0, updatedAt: '' }, now);
    expect(empty.remainingUnits).toBe(0);
    expect(applyUndo({ unitsPerDose: 1, remainingUnits: 7, updatedAt: '' }, now).remainingUnits).toBe(8);
    expect(addUnits({ unitsPerDose: 1, remainingUnits: 2, updatedAt: '' }, 28, now).remainingUnits).toBe(30);
  });

  it('parseUnits: virgül ve nokta kabul, geçersiz null', () => {
    expect(parseUnits('30')).toBe(30);
    expect(parseUnits('1,5')).toBe(1.5);
    expect(parseUnits('abc')).toBeNull();
    expect(parseUnits('-1')).toBeNull();
    expect(parseUnits('')).toBeNull();
    expect(parseUnits('  ')).toBeNull();
  });
});

describe('getRefillStatus', () => {
  const withUnits = (remainingUnits: number) => med({ stock: { unitsPerDose: 1, remainingUnits, updatedAt: '' } });
  it('eşiklere göre (günde 2 tablet)', () => {
    expect(getRefillStatus(withUnits(40), 10)).toBe('ok'); // 20 gün
    expect(getRefillStatus(withUnits(20), 10)).toBe('soon'); // 10 gün
    expect(getRefillStatus(withUnits(6), 10)).toBe('critical'); // 3 gün
    expect(getRefillStatus(withUnits(0), 10)).toBe('empty');
  });
});

describe('getRefillReminderDate', () => {
  it('bitişten uyarı günü kadar önce saat 10:00', () => {
    // 40 tablet / günde 2 = 20 gün → 8 Kasım bitiş; 10 gün önce = 29 Ekim 10:00
    const at = getRefillReminderDate(med({ stock: { unitsPerDose: 1, remainingUnits: 40, updatedAt: '' } }), now, 10)!;
    expect([at.getMonth(), at.getDate(), at.getHours()]).toEqual([9, 29, 10]);
  });

  it('zamanı geçmişse ya da stok yoksa null', () => {
    expect(getRefillReminderDate(med(), now, 10)).toBeNull(); // 5 gün kaldı, uyarı zamanı geçti
    expect(getRefillReminderDate(med({ stock: undefined }), now, 10)).toBeNull();
  });
});

describe('describeDaysLeft', () => {
  it('yaklaşık gün ve tarih', () => {
    expect(describeDaysLeft(med(), now)).toBe('Tansiyon ilacı yaklaşık 5 gün yetecek (24 Ekim).');
    expect(describeDaysLeft(med({ stock: { unitsPerDose: 1, remainingUnits: 0, updatedAt: '' } }), now)).toBe(
      'Tansiyon ilacı bitmiş olabilir.',
    );
  });
});

describe('withDative', () => {
  it.each([
    ['Dr. Mehmet Yılmaz', "Dr. Mehmet Yılmaz'a"],
    ['Dr. Ayşe Demir', "Dr. Ayşe Demir'e"],
    ['Dr. Ali Kaya', "Dr. Ali Kaya'ya"],
    ['Dr. Can Öztürk', "Dr. Can Öztürk'e"],
    ['Dr. Elif Şahin', "Dr. Elif Şahin'e"],
  ])('%s → %s', (name, expected) => {
    expect(withDative(name)).toBe(expected);
  });
});

describe('buildRefillSms', () => {
  it('plandaki örnek metin', () => {
    expect(
      buildRefillSms({
        medicationName: 'Tansiyon ilacı',
        daysLeft: 8,
        contactName: 'Ayşe',
        userName: 'Fatma',
        department: 'Kardiyoloji',
        doctor: 'Mehmet Yılmaz',
        hospital: 'Manisa Şehir Hastanesi',
      }),
    ).toBe(
      "Merhaba Ayşe, ben Fatma. Tansiyon ilacım yaklaşık 8 gün sonra bitecek. Reçete yazdırmak için Kardiyoloji bölümünden Dr. Mehmet Yılmaz'a (Manisa Şehir Hastanesi) MHRS'den randevu alabilir misin? Teşekkürler.",
    );
  });

  it('eksik bilgiler cümleden çıkarılır', () => {
    expect(buildRefillSms({ medicationName: 'Coraspin', daysLeft: 3, contactName: 'Ali', userName: '' })).toBe(
      "Merhaba Ali. Coraspin ilacım yaklaşık 3 gün sonra bitecek. Reçete yazdırmak için doktorumdan MHRS'den randevu alabilir misin? Teşekkürler.",
    );
    expect(buildRefillSms({ medicationName: 'Şeker ilacı', daysLeft: 0, contactName: 'Ali', userName: '', department: 'Dahiliye' })).toContain(
      'Şeker ilacım bitti. Reçete yazdırmak için Dahiliye bölümüne',
    );
  });

  it('kimlik numarası gibi kişisel bilgi içermez', () => {
    const text = buildRefillSms({ medicationName: 'X', daysLeft: 5, contactName: 'A', userName: 'B' });
    expect(text).not.toMatch(/[0-9]{11}/);
  });
});
