import * as Notifications from 'expo-notifications';

import type { Medication } from '@/features/medications/model';
import { buildRequests, syncMedicationNotifications } from '@/features/medications/notifications';

// Bellek içi sahte bildirim deposu: planlanan / iptal edilen bildirimleri gerçekten tutar.
jest.mock('expo-notifications', () => {
  let store: { identifier: string; content: unknown; trigger: unknown }[] = [];
  let nextId = 1;
  return {
    SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
    scheduleNotificationAsync: jest.fn(async ({ content, trigger }) => {
      const identifier = `n${nextId++}`;
      store.push({ identifier, content, trigger });
      return identifier;
    }),
    cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
      store = store.filter((n) => n.identifier !== id);
    }),
    getAllScheduledNotificationsAsync: jest.fn(async () => [...store]),
    __reset: () => {
      store = [];
      nextId = 1;
    },
  };
});

const mocked = Notifications as unknown as {
  getAllScheduledNotificationsAsync: () => Promise<{ identifier: string; content: { data: { medicationId: string } } }[]>;
  scheduleNotificationAsync: jest.Mock;
  __reset: () => void;
};

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

const scheduledFor = async (medicationId: string) =>
  (await mocked.getAllScheduledNotificationsAsync()).filter((n) => n.content.data.medicationId === medicationId);

beforeEach(() => {
  mocked.__reset();
  mocked.scheduleNotificationAsync.mockClear();
});

describe('buildRequests', () => {
  it('her gün → saat başına bir DAILY', () => {
    const requests = buildRequests(med());
    expect(requests.map((r) => r.trigger)).toEqual([
      { type: 'daily', hour: 8, minute: 0 },
      { type: 'daily', hour: 20, minute: 0 },
    ]);
    expect(requests[0].content).toMatchObject({ title: '💊 İlaç saati', body: 'Tansiyon ilacı – 1 tablet' });
  });

  it('belirli günler → gün başına WEEKLY, Expo gün numarasıyla (Pzt = 2, Paz = 1)', () => {
    const requests = buildRequests(med({ times: ['09:30'], days: [1, 7] }));
    expect(requests.map((r) => r.trigger)).toEqual([
      { type: 'weekly', weekday: 2, hour: 9, minute: 30 },
      { type: 'weekly', weekday: 1, hour: 9, minute: 30 },
    ]);
  });

  it('pasif ilaç için bildirim yok', () => {
    expect(buildRequests(med({ active: false }))).toEqual([]);
  });
});

describe('syncMedicationNotifications', () => {
  it('eksikleri planlar ve kimlikleri döndürür', async () => {
    const ids = await syncMedicationNotifications([med()]);
    expect(ids.m1).toHaveLength(2);
    expect(await scheduledFor('m1')).toHaveLength(2);
  });

  it('değişiklik yoksa yeniden planlamaz (art arda çağrılar sayıyı artırmaz)', async () => {
    await syncMedicationNotifications([med()]);
    await syncMedicationNotifications([med()]);
    await Promise.all([syncMedicationNotifications([med()]), syncMedicationNotifications([med()])]);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(await scheduledFor('m1')).toHaveLength(2);
  });

  it('saat değişince eski saat iptal edilir, yalnızca yeni saat kalır', async () => {
    await syncMedicationNotifications([med()]);
    await syncMedicationNotifications([med({ times: ['09:00'] })]);
    const remaining = await scheduledFor('m1');
    expect(remaining).toHaveLength(1);
    expect((remaining[0] as unknown as { trigger: { hour: number } }).trigger.hour).toBe(9);
  });

  it('silinen ya da durdurulan ilacın bildirimleri iptal edilir, diğerlerine dokunulmaz', async () => {
    await syncMedicationNotifications([med(), med({ id: 'm2', times: ['12:00'] })]);
    await syncMedicationNotifications([med({ id: 'm2', times: ['12:00'] })]);
    expect(await scheduledFor('m1')).toHaveLength(0);
    expect(await scheduledFor('m2')).toHaveLength(1);

    await syncMedicationNotifications([med({ id: 'm2', times: ['12:00'], active: false })]);
    expect(await scheduledFor('m2')).toHaveLength(0);
  });

  it('dışarıdan silinmiş bir bildirimi fark edip tamamlar', async () => {
    const ids = await syncMedicationNotifications([med()]);
    await Notifications.cancelScheduledNotificationAsync(ids.m1[0]);
    await syncMedicationNotifications([med()]);
    expect(await scheduledFor('m1')).toHaveLength(2);
  });
});
