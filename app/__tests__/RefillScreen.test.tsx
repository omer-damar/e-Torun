import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import RefillAppointmentScreen from '@/app/ilaclar/randevu';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'm1' }),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
const store = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data }));

const med = {
  id: 'm1',
  name: 'Tansiyon ilacı',
  dose: '1 tablet',
  times: ['08:00', '20:00'],
  days: 'everyday',
  color: 'beyaz',
  active: true,
  notificationIds: [],
  stock: { unitsPerDose: 1, remainingUnits: 16, updatedAt: '' },
  refill: { department: 'Kardiyoloji', doctor: 'Mehmet Yılmaz', contactId: 'c2' },
};

async function renderRefill(contacts: unknown[]) {
  await store(STORAGE_KEYS.medications, [med]);
  await store(STORAGE_KEYS.contacts, contacts);
  await store(STORAGE_KEYS.settings, { userName: 'Fatma', onboardingDone: true });
  await render(
    <AppDataProvider>
      <RefillAppointmentScreen />
    </AppDataProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  openURL.mockClear();
});

describe('Randevu ekranı', () => {
  it("ALO 182'yi arar ve MHRS'yi açar", async () => {
    await renderRefill([]);
    await fireEvent.press(await screen.findByRole('button', { name: /ALO 182/ }));
    expect(openURL).toHaveBeenCalledWith('tel:182');
    await fireEvent.press(screen.getByRole('button', { name: /MHRS'yi aç/ }));
    expect(openURL).toHaveBeenCalledWith('https://www.mhrs.gov.tr');
  });

  it('ilaçta seçili yakını önceden seçer, hazır metinle Mesajlar\'ı açar (kendisi göndermez)', async () => {
    await renderRefill([
      { id: 'c1', name: 'Ali', relation: 'Oğlum', phone: '05550000001' },
      { id: 'c2', name: 'Ayşe', relation: 'Kızım', phone: '05550000002' },
    ]);

    expect(await screen.findByText('Ayşe (Kızım) kişisine gidecek mesaj:')).toBeTruthy();
    const expected =
      "Merhaba Ayşe, ben Fatma. Tansiyon ilacım yaklaşık 8 gün sonra bitecek. Reçete yazdırmak için Kardiyoloji bölümünden Dr. Mehmet Yılmaz'a MHRS'den randevu alabilir misin? Teşekkürler.";
    expect(screen.getByText(expected)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Mesajı hazırla/ }));
    expect(openURL).toHaveBeenCalledWith(`sms:05550000002&body=${encodeURIComponent(expected)}`);
  });

  it('yakın yoksa Ayarlar\'a yönlendirir', async () => {
    await renderRefill([]);
    expect(await screen.findByText(/Henüz yakın eklenmedi/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Mesajı hazırla/ })).toBeNull();
  });
});
