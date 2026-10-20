import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import MessageCheckScreen from '@/app/mesaj';
import { AppText, BigButton, Notice } from '@/components';
import { TimePickerBig } from '@/components/TimePickerBig';
import { speechText } from '@/features/messages/askRelative';
import { announce, spokenText } from '@/utils/a11y';

jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn(async () => '') }));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

beforeEach(() => announced.mockClear());

describe('spokenText', () => {
  it.each([
    ['⏳ Bekliyor', 'Bekliyor'],
    ['⚠️ Saati geçti, alınmadı', 'Saati geçti, alınmadı'],
    ['⏭️ Atlandı', 'Atlandı'],
    ['• Bağlantı adresi şüpheli', 'Bağlantı adresi şüpheli'],
    ['👨‍👩‍👧 Yakınıma sor', 'Yakınıma sor'],
    ['ℹ️ Resmi uygulama değildir', 'Resmi uygulama değildir'],
    ['↩️ Geri al', 'Geri al'],
    ['Saat 08:00, 1/2 tablet — 112', 'Saat 08:00, 1/2 tablet — 112'],
  ])('%s → %s', (input, expected) => {
    expect(spokenText(input)).toBe(expected);
  });

  it('sesli okuma da aynı temizliği kullanır', () => {
    expect(speechText(['⛔ Yüksek risk', '• Link var'])).toBe('Yüksek risk Link var');
  });

  it('announce boş metni okumaz', () => {
    announce('✅');
    expect(announced).not.toHaveBeenCalled();
    announce('✅ Kaydedildi');
    expect(announced).toHaveBeenCalledWith('Kaydedildi');
  });
});

describe('VoiceOver etiketleri', () => {
  it('düz metindeki emoji etikete girmez, iç içe metne dokunulmaz', async () => {
    await render(
      <>
        <AppText>⏳ Bekliyor</AppText>
        <AppText>Düz metin</AppText>
        <AppText>
          Basılı tutup <AppText variant="bodyBold">Kopyala</AppText> deyin
        </AppText>
      </>,
    );
    expect(screen.getByText('⏳ Bekliyor').props.accessibilityLabel).toBe('Bekliyor');
    expect(screen.getByText('Düz metin').props.accessibilityLabel).toBeUndefined();
    expect(screen.getByText('Kopyala').props.accessibilityLabel).toBeUndefined();
  });

  it('buton etiketinde emoji okunmaz', async () => {
    await render(<BigButton title="İlaçlarım" subtitle="⚠️ 1 ilacınız bitmek üzere" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'İlaçlarım. 1 ilacınız bitmek üzere' })).toBeTruthy();
  });
});

describe('Duyurular', () => {
  it('Notice yalnızca announce verilirse okunur', async () => {
    await render(<Notice title="Bildirimler kapalı" />);
    expect(announced).not.toHaveBeenCalled();
    await render(<Notice title="Mesaj çok kısa" message="Tamamını yapıştırın." announce />);
    expect(announced).toHaveBeenCalledWith('Mesaj çok kısa. Tamamını yapıştırın.');
  });

  it('saat seçicide + / − sonrası yeni saat söylenir', async () => {
    const onChange = jest.fn();
    await render(<TimePickerBig value="08:00" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Saati bir artır' }));
    expect(onChange).toHaveBeenCalledWith('09:00');
    expect(announced).toHaveBeenCalledWith('saat 9 tam');
    await fireEvent.press(screen.getByRole('button', { name: 'Dakikayı beş artır' }));
    expect(announced).toHaveBeenLastCalledWith('saat 8, 5 geçe');
  });

  it('boş mesajla Kontrol Et devre dışı değil; ne yapılacağını söyler', async () => {
    await render(<MessageCheckScreen />);
    const check = screen.getByRole('button', { name: /Kontrol Et/ });
    expect(check.props.accessibilityState?.disabled).toBe(false);
    await act(async () => {
      fireEvent.press(check);
    });
    expect(screen.getByText(/Önce mesajı yapıştırın/)).toBeTruthy();
    expect(announced).toHaveBeenCalledWith(expect.stringContaining('Önce mesajı yapıştırın'));
  });
});
