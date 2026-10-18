import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { MIN_TOUCH_SIZE } from '@/theme';

describe('BigButton', () => {
  it('başlığı ve alt metni gösterir', async () => {
    await render(<BigButton title="İlaçlarım" subtitle="Sıradaki: 20:00 Tansiyon ilacı" onPress={() => {}} />);

    expect(screen.getByText('İlaçlarım')).toBeTruthy();
    expect(screen.getByText('Sıradaki: 20:00 Tansiyon ilacı')).toBeTruthy();
  });

  it('buton rolü ve başlık + alt metinden oluşan erişilebilirlik etiketi taşır', async () => {
    await render(
      <BigButton
        title="Acil Yardım"
        subtitle="Yakınınızı veya 112'yi arayın"
        accessibilityHint="Acil arama ekranını açar"
        onPress={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: "Acil Yardım. Yakınınızı veya 112'yi arayın" });
    expect(button.props.accessibilityHint).toBe('Acil arama ekranını açar');
  });

  it('verilen accessibilityLabel varsayılanı ezer', async () => {
    await render(<BigButton title="112" accessibilityLabel="112 Acil Çağrı Merkezini ara" onPress={() => {}} />);

    expect(screen.getByRole('button', { name: '112 Acil Çağrı Merkezini ara' })).toBeTruthy();
  });

  it('basılınca onPress çağrılır', async () => {
    const onPress = jest.fn();
    await render(<BigButton title="Ana Sayfa" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ana Sayfa' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('devre dışıyken onPress çağrılmaz', async () => {
    const onPress = jest.fn();
    await render(<BigButton title="Kaydet" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('dokunma alanı en az 64×64pt', async () => {
    await render(<BigButton title="Evet" onPress={() => {}} testID="btn" />);

    const style = StyleSheet.flatten(screen.getByTestId('btn').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
  });
});
