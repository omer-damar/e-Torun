import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { scaleFontSize } from '@/theme';

const mockFontScale = { value: 1 };

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale.value }),
}));

describe('scaleFontSize', () => {
  it('normal ayarda boyutu değiştirmez', () => {
    expect(scaleFontSize(20, 1)).toBe(20);
  });

  it('sistem ölçeğine göre büyütür', () => {
    expect(scaleFontSize(20, 1.2)).toBe(24);
  });

  it('en fazla 1.4 kat büyütür', () => {
    expect(scaleFontSize(20, 3.12)).toBe(28);
  });

  it('küçük yazı ayarında 20pt altına düşmez', () => {
    expect(scaleFontSize(20, 0.82)).toBe(20);
  });
});

describe('AppText', () => {
  afterEach(() => {
    mockFontScale.value = 1;
  });

  it('sistemin yazı ölçeğini kendisi uygular, sistem büyütmesini kapatır', async () => {
    mockFontScale.value = 1.2;
    await render(<AppText>Merhaba</AppText>);

    const text = screen.getByText('Merhaba');
    const style = StyleSheet.flatten(text.props.style);
    expect(text.props.allowFontScaling).toBe(false);
    expect(style.fontSize).toBe(24);
    expect(style.lineHeight).toBe(34);
  });

  it('en büyük iOS ayarında bile 1.4 katta kalır', async () => {
    mockFontScale.value = 3.12;
    await render(<AppText variant="title">Başlık</AppText>);

    expect(StyleSheet.flatten(screen.getByText('Başlık').props.style).fontSize).toBe(42);
  });
});
