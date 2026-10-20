import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

import EmergencyScreen from '@/app/acil';
import SettingsScreen from '@/app/ayarlar';
import MedicationEditScreen from '@/app/ilaclar/duzenle';
import MedicationHistoryScreen from '@/app/ilaclar/gecmis';
import MedicationsTodayScreen from '@/app/ilaclar';
import MedicationListScreen from '@/app/ilaclar/liste';
import RefillAppointmentScreen from '@/app/ilaclar/randevu';
import StockScreen from '@/app/ilaclar/stok';
import HomeScreen from '@/app/index';
import ContactScreen from '@/app/kisi';
import SetupScreen from '@/app/kurulum';
import MessageCheckScreen from '@/app/mesaj';
import MessageResultScreen, { LEVEL_STYLE } from '@/app/mesaj/sonuc';
import { clearMessageToCheck, setMessageToCheck } from '@/features/messages/messageBuffer';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';
import { contrastRatio } from '@/theme/contrast';
import { colors } from '@/theme/colors';

import { auditTree, MIN_CONTRAST } from '../test-utils/a11yAudit';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => mockParams.current,
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));
jest.mock('@/features/notifications/permission', () => ({ useNotificationPermission: () => 'granted' }));
jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn(async () => '') }));
// En kötü durum: sistem yazı büyütmesi kapalı (ölçek 1). Jest varsayılanı 2 olduğundan yazılar büyük ölçülürdü.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => {}) }));

const store = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data }));

const contact = { id: 'c1', name: 'Ayşe', relation: 'Kızım', phone: '05550000000' };
const med = {
  id: 'm1',
  name: 'Tansiyon ilacı',
  dose: '1 tablet',
  times: ['08:00', '20:00'],
  days: 'everyday',
  color: 'beyaz',
  active: true,
  notificationIds: [],
  stock: { unitsPerDose: 1, remainingUnits: 6, updatedAt: '' },
  refill: { department: 'Kardiyoloji', doctor: 'Mehmet Yılmaz', contactId: 'c1' },
};

/** Arayüzde Türkçe karşılığı olan İngilizce sözcükler (bölüm 10: yabancı terim yok). */
const ENGLISH_TERMS = [
  'ok', 'cancel', 'settings', 'error', 'loading', 'back', 'next', 'done', 'delete', 'save', 'edit', 'home',
  'yes', 'no', 'close', 'menu', 'link', 'online', 'offline', 'download', 'upload', 'click', 'update', 'reset',
];
const ENGLISH = new RegExp(`(?<![\\p{L}])(${ENGLISH_TERMS.join('|')})(?![\\p{L}])`, 'iu');

const SCREENS: { name: string; Screen: ComponentType; params?: Record<string, string>; message?: string }[] = [
  { name: 'Ana ekran', Screen: HomeScreen },
  { name: 'Kurulum', Screen: SetupScreen },
  { name: 'Ayarlar', Screen: SettingsScreen },
  { name: 'Acil', Screen: EmergencyScreen },
  { name: 'Kişi', Screen: ContactScreen, params: { id: 'c1' } },
  { name: 'Bugünkü ilaçlar', Screen: MedicationsTodayScreen },
  { name: 'İlaç listesi', Screen: MedicationListScreen },
  { name: 'İlaç düzenle', Screen: MedicationEditScreen, params: { id: 'm1' } },
  { name: 'İlaç geçmişi', Screen: MedicationHistoryScreen },
  { name: 'Stok', Screen: StockScreen, params: { id: 'm1' } },
  { name: 'Randevu', Screen: RefillAppointmentScreen, params: { id: 'm1' } },
  { name: 'Mesaj kontrol', Screen: MessageCheckScreen },
  {
    name: 'Mesaj sonucu (kırmızı)',
    Screen: MessageResultScreen,
    message: 'Sayın müşterimiz, hesabınız 24 saat içinde bloke edilecektir. Hemen doğrulayın: https://banka-dogrula.xyz/giris',
  },
  { name: 'Mesaj sonucu (yeşil)', Screen: MessageResultScreen, message: 'Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?' },
];

beforeEach(async () => {
  await AsyncStorage.clear();
  clearMessageToCheck();
  await store(STORAGE_KEYS.settings, {
    userName: 'Fatma',
    onboardingDone: true,
    fontScale: 'buyuk',
    speechEnabled: true,
    refillWarningDays: 10,
  });
  await store(STORAGE_KEYS.contacts, [contact]);
  await store(STORAGE_KEYS.medications, [med]);
});

describe('Renk kontrastı (≥ 7:1)', () => {
  it('WCAG formülü bilinen değerleri verir', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFF', '#FFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('rgba(0,0,0,1)', '#FFF')).toBeNull();
  });

  const pairs: [string, string, string][] = [
    ['metin / zemin', colors.text, colors.background],
    ['ikincil metin / zemin', colors.textSecondary, colors.background],
    ['metin / nötr buton', colors.text, colors.neutralBackground],
    ['beyaz / ana renk', colors.textOnColor, colors.primary],
    ['beyaz / tehlike', colors.textOnColor, colors.danger],
    ['beyaz / başarı', colors.textOnColor, colors.success],
    ['uyarı metni / uyarı zemini', colors.warningText, colors.warningBackground],
    ...Object.entries(LEVEL_STYLE).map(
      ([level, s]) => [`sonuç ${level}`, s.text, s.background] as [string, string, string],
    ),
  ];

  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});

describe('Denetleyicinin kendisi', () => {
  it('küçük yazı, düşük kontrast, rolsüz ve küçük buton ile başlıksız ekranı yakalar', async () => {
    await render(
      <View>
        <Text style={{ fontSize: 14, color: '#777777' }}>Küçük gri yazı</Text>
        <Pressable onPress={() => {}} style={{ minHeight: 40 }}>
          <Text style={{ fontSize: 24, color: '#111111' }}>Tamam</Text>
        </Pressable>
      </View>,
    );
    const { violations } = auditTree(screen.toJSON() as never);
    expect(violations).toEqual([
      'yazı 14pt < 20: "Küçük gri yazı"',
      'kontrast 4.5:1 (#777777 / #FFFFFF): "Küçük gri yazı"',
      'basılabilir öğede rol yok: "Tamam"',
      'dokunma alanı 40pt < 64: "Tamam"',
      'ekranda başlık (accessibilityRole="header") yok',
    ]);
  });
});

describe('Ekran denetimi', () => {
  it.each(SCREENS.map((s) => [s.name, s] as const))('%s', async (_name, { Screen, params, message }) => {
    mockParams.current = params ?? {};
    if (message) setMessageToCheck(message);
    await render(
      <AppDataProvider>
        <Screen />
      </AppDataProvider>,
    );
    await screen.findAllByText(/\S/);

    const report = auditTree(screen.toJSON() as never);
    const english = report.texts.filter((t) => ENGLISH.test(t.text)).map((t) => `İngilizce terim: "${t.text}"`);
    expect([...report.violations, ...english]).toEqual([]);
  });
});
