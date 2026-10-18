import { WEEKDAY_NAMES, type Medication } from '@/features/medications/model';
import {
  countTriggers,
  describeDays,
  getDoseStatus,
  getDosesForDate,
  getHistory,
  getNextDose,
  isoWeekday,
  normalizeTimes,
  pruneLog,
  recordDose,
  toExpoWeekday,
  undoDose,
  wouldExceedTriggerLimit,
} from '@/features/medications/schedule';

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  name: 'Tansiyon ilacı',
  dose: '1 tablet',
  times: ['08:00', '20:00'],
  days: 'everyday',
  color: 'beyaz',
  active: true,
  notificationIds: [],
  ...over,
});

// 19 Ekim 2026 Pazartesi
const monday = (h = 12, m = 0) => new Date(2026, 9, 19, h, m);

describe('gün dönüşümleri', () => {
  it('isoWeekday: Pazar 7, Pazartesi 1', () => {
    expect(isoWeekday(new Date(2026, 9, 18))).toBe(7);
    expect(isoWeekday(monday())).toBe(1);
  });

  it('toExpoWeekday: ISO 1 (Pzt) → 2, ISO 7 (Paz) → 1, ISO 6 (Cmt) → 7', () => {
    expect(toExpoWeekday(1)).toBe(2);
    expect(toExpoWeekday(7)).toBe(1);
    expect(toExpoWeekday(6)).toBe(7);
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => toExpoWeekday(d as 1))).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });
});

describe('normalizeTimes', () => {
  it('sıralar, tekrarları ve geçersizleri atar', () => {
    expect(normalizeTimes(['20:00', '08:00', '20:00', '25:00', 'x'])).toEqual(['08:00', '20:00']);
  });
});

describe('getDosesForDate', () => {
  it('saat sırasıyla dozları üretir', () => {
    const doses = getDosesForDate([med(), med({ id: 'm2', name: 'Şeker ilacı', times: ['07:30'] })], monday());
    expect(doses.map((d) => `${d.time} ${d.name}`)).toEqual(['07:30 Şeker ilacı', '08:00 Tansiyon ilacı', '20:00 Tansiyon ilacı']);
    expect(doses[0].scheduledAt).toBe('2026-10-19T07:30');
  });

  it('belirli günlerde yalnızca o günler; pasif ilaç hiç', () => {
    const weekly = med({ days: [3, 5] });
    expect(getDosesForDate([weekly], monday())).toEqual([]);
    expect(getDosesForDate([weekly], new Date(2026, 9, 21))).toHaveLength(2); // Çarşamba
    expect(getDosesForDate([med({ active: false })], monday())).toEqual([]);
  });
});

describe('getDoseStatus', () => {
  const [morning] = getDosesForDate([med()], monday());

  it('saatinden önce ve 60 dk içinde bekliyor, sonra saati geçti', () => {
    expect(getDoseStatus(morning, [], monday(7, 0))).toBe('pending');
    expect(getDoseStatus(morning, [], monday(8, 59))).toBe('pending');
    expect(getDoseStatus(morning, [], monday(9, 0))).toBe('missed');
  });

  it('işaretlenen doz alındı; geri alınınca eski durumuna döner', () => {
    const log = recordDose([], morning, 'taken', monday(8, 5));
    expect(getDoseStatus(morning, log, monday(10))).toBe('taken');
    expect(getDoseStatus(morning, undoDose(log, morning), monday(10))).toBe('missed');
  });

  it('aynı doz iki kez işaretlenirse tek kayıt kalır', () => {
    const log = recordDose(recordDose([], morning, 'taken', monday(8)), morning, 'taken', monday(8, 1));
    expect(log).toHaveLength(1);
  });
});

describe('getNextDose', () => {
  it('bugünün alınmamış ve saati geçmemiş ilk dozu', () => {
    expect(getNextDose([med()], [], monday(7))?.time).toBe('08:00');
    expect(getNextDose([med()], [], monday(12))?.time).toBe('20:00');
  });

  it('sabah dozu alındıysa akşamı gösterir; hepsi bittiyse null', () => {
    const [morning, evening] = getDosesForDate([med()], monday());
    const log = recordDose([], morning, 'taken', monday(8));
    expect(getNextDose([med()], log, monday(8, 10))?.time).toBe('20:00');
    expect(getNextDose([med()], recordDose(log, evening, 'taken', monday(20)), monday(20, 5))).toBeNull();
    expect(getNextDose([med()], [], monday(23))).toBeNull();
  });
});

describe('bildirim sayısı', () => {
  it('her gün: saat sayısı; belirli günler: saat × gün', () => {
    expect(countTriggers([med()])).toBe(2);
    expect(countTriggers([med({ days: [1, 3, 5] })])).toBe(6);
    expect(countTriggers([med({ active: false })])).toBe(0);
  });

  it('60 sınırı: düzenlenen ilaç kendisiyle iki kez sayılmaz', () => {
    const big = med({ times: ['08:00', '12:00', '16:00', '20:00'], days: [1, 2, 3, 4, 5, 6] }); // 24
    const meds = [big, { ...big, id: 'm2' }]; // 48
    expect(wouldExceedTriggerLimit(meds, { ...big, id: 'm3', days: [1, 2] })).toBe(false); // 56
    expect(wouldExceedTriggerLimit(meds, { ...big, id: 'm3', days: [1, 2, 3, 4] })).toBe(true); // 64
    expect(wouldExceedTriggerLimit(meds, { ...big, days: [1, 2, 3, 4, 5, 6, 7] })).toBe(false); // 28 + 24
  });
});

describe('pruneLog', () => {
  it('30 günden eski kayıtları siler', () => {
    const log = [
      { medicationId: 'm1', scheduledAt: '2026-09-18T08:00', status: 'taken' as const, recordedAt: '' },
      { medicationId: 'm1', scheduledAt: '2026-09-19T08:00', status: 'taken' as const, recordedAt: '' },
    ];
    expect(pruneLog(log, monday()).map((e) => e.scheduledAt)).toEqual(['2026-09-19T08:00']);
  });
});

describe('getHistory', () => {
  it('bugün dahil 7 gün, en yeni en üstte, geçmiş dozlar alınmadı sayılır', () => {
    const history = getHistory([med()], [], monday(12));
    expect(history).toHaveLength(7);
    expect(history[0].date.getDate()).toBe(19);
    expect(history[6].date.getDate()).toBe(13);
    expect(history[0].doses.map((d) => d.status)).toEqual(['missed', 'pending']);
    expect(history[1].doses.every((d) => d.status === 'missed')).toBe(true);
  });
});

describe('describeDays', () => {
  it('her gün ya da gün adları', () => {
    expect(describeDays('everyday', WEEKDAY_NAMES)).toBe('Her gün');
    expect(describeDays([5, 1, 3], WEEKDAY_NAMES)).toBe('Pazartesi, Çarşamba, Cuma');
    expect(describeDays([1, 2, 3, 4, 5, 6, 7], WEEKDAY_NAMES)).toBe('Her gün');
  });
});
