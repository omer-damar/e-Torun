import { Text, useWindowDimensions, type TextProps } from 'react-native';

import { colors, getTypography, scaleFontSize, typography, useFontScale } from '@/theme';
import { hasDecoration, spokenText } from '@/utils/a11y';

/**
 * Düz metinde emoji/madde işareti varsa VoiceOver'a onlarsız hâli verilir ("⏳ Bekliyor" → "Bekliyor").
 * İç içe öğe varsa (ör. kalın yazılı bir kelime) dokunulmaz; açık `accessibilityLabel` her zaman önceliklidir.
 */
function defaultLabel(children: unknown): string | undefined {
  const parts = Array.isArray(children) ? children : [children];
  if (!parts.every((p) => typeof p === 'string' || typeof p === 'number')) return undefined;
  const text = parts.join('');
  return hasDecoration(text) ? spokenText(text) : undefined;
}

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

/**
 * Uygulamadaki tüm metinler bunu kullanır: varsayılan 20pt gövde yazısı (Ayarlar'da
 * "Çok büyük" seçilirse 24pt), iOS yazı boyutu ayarına göre en fazla 1.4 kat büyür.
 *
 * Büyütme sisteme (`allowFontScaling`) bırakılmaz, burada hesaplanır: uygulama açıkken
 * yazı boyutu değiştirilince iOS'ta metinler yeniden ölçülmüyor, yandan ve alttan
 * kırpılıyordu. `fontScale` değişince bileşen yeni boyutla yeniden çizilir.
 */
export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  const { fontScale } = useWindowDimensions();
  const base = getTypography(useFontScale())[variant];

  return (
    <Text
      allowFontScaling={false}
      accessibilityLabel={defaultLabel(rest.children)}
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
