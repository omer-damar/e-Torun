import type { TextStyle } from 'react-native';

/** Ayarlardaki yazı boyutu seçeneği (PROJE_PLANI.md bölüm 4, `settings.fontScale`). */
export type FontScale = 'buyuk' | 'cokBuyuk';

/**
 * iOS Dynamic Type büyütmesine izin verilir, ama taşmayı önlemek için en fazla 1.4 kat.
 * Büyütmeyi `AppText` kendisi uygular (bkz. `scaleFontSize`).
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.4;

/**
 * Sistemin yazı ölçeğini (`useWindowDimensions().fontScale`) uygular.
 * 1'in altına inmez (gövde yazısı hiçbir zaman 20pt'nin altına düşmesin),
 * `MAX_FONT_SIZE_MULTIPLIER`'ın üstüne çıkmaz.
 */
export function scaleFontSize(size: number, fontScale: number): number {
  const multiplier = Math.min(Math.max(fontScale, 1), MAX_FONT_SIZE_MULTIPLIER);
  return Math.round(size * multiplier);
}

export const fontSizes: Record<FontScale, { body: number; title: number; button: number; buttonSub: number }> = {
  buyuk: { body: 20, title: 30, button: 24, buttonSub: 20 },
  cokBuyuk: { body: 24, title: 32, button: 28, buttonSub: 24 },
};

export function getTypography(scale: FontScale = 'buyuk') {
  const size = fontSizes[scale];
  return {
    body: { fontSize: size.body, lineHeight: Math.round(size.body * 1.4), fontWeight: '400' },
    bodyBold: { fontSize: size.body, lineHeight: Math.round(size.body * 1.4), fontWeight: '700' },
    title: { fontSize: size.title, lineHeight: Math.round(size.title * 1.25), fontWeight: '700' },
    button: { fontSize: size.button, lineHeight: Math.round(size.button * 1.25), fontWeight: '700' },
    buttonSub: { fontSize: size.buttonSub, lineHeight: Math.round(size.buttonSub * 1.3), fontWeight: '400' },
  } satisfies Record<string, TextStyle>;
}

/** Ayarlar ekranı gelene kadar varsayılan ölçek. */
export const typography = getTypography('buyuk');
