import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MedicationsTodayScreen, { UNDO_WINDOW_MS } from '@/app/ilaclar';
import { localDateKey } from '@/features/medications/schedule';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

// İzin hook'u ekran odağını (navigasyon) dinler; testte navigasyon yok.
jest.mock('@/features/notifications/permission', () => ({ useNotificationPermission: () => 'granted' }));

const store = (key: string, data: unknown) =>
  AsyncStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data }));

const med = {
  id: 'm1',
  name: 'Tansiyon ilacı',
  dose: '1 tablet',
  times: ['23:59'],
  days: 'everyday',
  color: 'beyaz',
  active: true,
  notificationIds: [],
};

async function renderToday() {
  await render(
    <AppDataProvider>
      <MedicationsTodayScreen />
    </AppDataProvider>,
  );
}

async function storedLog() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.doseLog);
  return raw ? JSON.parse(raw).data : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Bugünkü ilaçlarım', () => {
  it('ilaç yoksa ekleme önerir', async () => {
    await renderToday();
    expect(await screen.findByText('Henüz ilaç eklenmedi.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'İlaç ekle' })).toBeTruthy();
  });

  it('ALDIM kaydeder; Geri al süre içinde görünür ve kaydı siler', async () => {
    await store(STORAGE_KEYS.medications, [med]);
    await renderToday();

    const take = await screen.findByRole('button', { name: '23:59 Tansiyon ilacı ilacını aldım' });
    expect(screen.getByText('⏳ Bekliyor')).toBeTruthy();

    await fireEvent.press(take);
    expect(await screen.findByText(/✅ Alındı/)).toBeTruthy();
    const log = await storedLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ medicationId: 'm1', scheduledAt: `${localDateKey(new Date())}T23:59`, status: 'taken' });

    await fireEvent.press(screen.getByRole('button', { name: 'Tansiyon ilacı için Aldım işaretini geri al' }));
    expect(await screen.findByText('⏳ Bekliyor')).toBeTruthy();
    expect(await storedLog()).toEqual([]);
  });

  it('Geri al 10 saniye sonra kaybolur, işaret kalır', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      await store(STORAGE_KEYS.medications, [med]);
      await renderToday();

      await fireEvent.press(await screen.findByRole('button', { name: '23:59 Tansiyon ilacı ilacını aldım' }));
      expect(screen.getByRole('button', { name: /geri al/ })).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(UNDO_WINDOW_MS + 200);
      });
      expect(screen.queryByRole('button', { name: /geri al/ })).toBeNull();
      expect(screen.getByText(/✅ Alındı/)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
