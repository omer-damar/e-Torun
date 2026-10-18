import { Text, useWindowDimensions, type TextProps } from 'react-native';

import { colors, scaleFontSize, typography } from '@/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

/**
 * Uygulamadaki tüm metinler bunu kullanır: varsayılan 20pt gövde yazısı,
 * iOS yazı boyutu ayarına göre en fazla 1.4 kat büyür.
 *
 * Büyütme sisteme (`allowFontScaling`) bırakılmaz, burada hesaplanır: uygulama açıkken
 * yazı boyutu değiştirilince iOS'ta metinler yeniden ölçülmüyor, yandan ve alttan
 * kırpılıyordu. `fontScale` değişince bileşen yeni boyutla yeniden çizilir.
 */
export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  const { fontScale } = useWindowDimensions();
  const base = typography[variant];

  return (
    <Text
      allowFontScaling={false}
      style={[
        base,
        {
          fontSize: scaleFontSize(base.fontSize, fontScale),
          lineHeight: scaleFontSize(base.lineHeight, fontScale),
          color,
        },
        style,
      ]}
      {...rest}
    />
  );
}
