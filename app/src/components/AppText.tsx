import { Text, type TextProps } from 'react-native';

import { colors, MAX_FONT_SIZE_MULTIPLIER, typography } from '@/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

/**
 * Uygulamadaki tüm metinler bunu kullanır: varsayılan 20pt gövde yazısı,
 * Dynamic Type açık ama en fazla 1.4 kat büyütme.
 */
export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      style={[typography[variant], { color }, style]}
      {...rest}
    />
  );
}
