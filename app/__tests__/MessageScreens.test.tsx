import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { Linking } from 'react-native';

import MessageCheckScreen from '@/app/mesaj';
import MessageResultScreen, { SPEECH_OPTIONS } from '@/app/mesaj/sonuc';
import { buildAskRelativeSms, MAX_QUOTED_LENGTH, speechText } from '@/features/messages/askRelative';
import { clearMessageToCheck, peekMessageToCheck, setMessageToCheck } from '@/features/messages/messageBuffer';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';

jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn() }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => {}) }));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
const SCAM =
  'Sayın müşterimiz, hesabınızda şüpheli işlem tespit edilmiştir. Hesabınız 24 saat içinde bloke edilecektir. Hemen doğrulamak için tıklayın: https://banka-dogrula.xyz/giris';
const SAFE = 'Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?';

const store = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data }));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  clearMessageToCheck();
});

describe('askRelative', () => {
  it('hazır metin: selam, soru ve mesaj tırnak içinde', () => {
    expect(buildAskRelativeSms({ contactName: 'Ayşe', userName: 'Fatma', message: 'Kargonuz bekliyor' })).toBe(
      'Merhaba Ayşe, ben Fatma. Bana şu mesaj geldi, dolandırıcılık olabilir mi? Bir bakar mısın?\n\n"Kargonuz bekliyor"',
    );
  });

  it('çok uzun mesaj kısaltılır', () => {
    const text = buildAskRelativeSms({ contactName: 'A', userName: '', message: 'x'.repeat(MAX_QUOTED_LENGTH + 50) });
    expect(text.endsWith('…"')).toBe(true);
  });

  it('sesli okumada emoji okunmaz', () => {
    expect(speechText(['⛔ Dikkat', '✅ tamam'])).toBe('Dikkat tamam');
  });
});

describe('Mesajı Kontrol Et ekranı', () => {
  it('panodan yapıştırır ve sonuca geçer; mesaj yalnızca bellekte taşınır', async () => {
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(`  ${SCAM}  `);
    await render(<MessageCheckScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /Panodan yapıştır/ }));
    expect(screen.getByDisplayValue(SCAM)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Kontrol Et/ }));
    expect(router.push).toHaveBeenCalledWith('/mesaj/sonuc');
    expect(peekMessageToCheck()).toBe(SCAM);
    expect(await AsyncStorage.getAllKeys()).toEqual([]); // depoya hiçbir şey yazılmadı
  });

  it('pano boşsa kalıcı yönerge gösterir', async () => {
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('');
    await render(<MessageCheckScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Panodan yapıştır/ }));
    expect(screen.getByText(/Kopyalanmış bir mesaj bulunamadı/)).toBeTruthy();
  });

  it('çok kısa mesajda sonuca geçmez', async () => {
    await render(<MessageCheckScreen />);
    await fireEvent.changeText(screen.getByLabelText('Mesaj'), 'merhaba');
    await fireEvent.press(screen.getByRole('button', { name: /Kontrol Et/ }));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText(/mesaj çok kısa/)).toBeTruthy();
  });
});

describe('Sonuç ekranı', () => {
  async function renderResult(text: string, contacts: unknown[] = [], settings: object = {}) {
    await store(STORAGE_KEYS.contacts, contacts);
    await store(STORAGE_KEYS.settings, { userName: 'Fatma', onboardingDone: true, ...settings });
    setMessageToCheck(text);
    return render(
      <AppDataProvider>
        <MessageResultScreen />
      </AppDataProvider>,
    );
  }

  it('dolandırıcılık mesajı: kırmızı, ikon + metin, gerekçeler; yüzde gösterilmez', async () => {
    await renderResult(SCAM);
    expect(await screen.findByTestId('result-red')).toBeTruthy();
    expect(screen.getByText('⛔ Yüksek risk')).toBeTruthy();
    expect(screen.getByText(/Linke tıklamayın/)).toBeTruthy();
    expect(screen.getByText('Neden?')).toBeTruthy();
    expect(screen.queryByText(/%[0-9]|[0-9]+ ?%/)).toBeNull();
  });

  it('normal mesaj yeşil', async () => {
    await renderResult(SAFE);
    expect(await screen.findByTestId('result-green')).toBeTruthy();
  });

  it('sesli okuma Türkçe ve yavaş; ayar kapalıysa buton yok', async () => {
    const { unmount } = await renderResult(SCAM);
    await fireEvent.press(await screen.findByRole('button', { name: 'Sesli oku' }));
    expect(Speech.speak).toHaveBeenCalledWith(expect.stringContaining('DİKKAT!'), expect.objectContaining(SPEECH_OPTIONS));
    await unmount();

    await renderResult(SCAM, [], { speechEnabled: false });
    await screen.findByTestId('result-red');
    expect(screen.queryByRole('button', { name: 'Sesli oku' })).toBeNull();
  });

  it('Yakınıma sor: seçilen yakına mesajı hazır metinle açar', async () => {
    await renderResult(SCAM, [
      { id: 'a', name: 'Ali', relation: 'Oğlum', phone: '05550000001' },
      { id: 'b', name: 'Ayşe', relation: 'Kızım', phone: '05550000002' },
    ]);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Ayşe (Kızım)' }));
    await fireEvent.press(screen.getByRole('button', { name: /Ayşe kişisine sor/ }));
    const expected = buildAskRelativeSms({ contactName: 'Ayşe', userName: 'Fatma', message: SCAM });
    expect(openURL).toHaveBeenCalledWith(`sms:05550000002&body=${encodeURIComponent(expected)}`);
  });

  it('ekrandan çıkınca mesaj bellekten silinir ve okuma durur', async () => {
    const { unmount } = await renderResult(SCAM);
    await screen.findByTestId('result-red');
    await unmount();
    expect(peekMessageToCheck()).toBeNull();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
