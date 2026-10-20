import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Emoji, ok, madde işareti gibi süs karakterleri. VoiceOver bunları adıyla okur ("kum saati",
 * "uyarı işareti"); anlam zaten yanındaki metinde olduğu için ekran okuyucuya verilmez.
 */
const DECORATION =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{2139}\u{2022}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** Ekran okuyucu ve sesli okuma için metin: süs karakterleri atılır, boşluklar sadeleşir. */
export function spokenText(text: string): string {
  return text.replace(DECORATION, '').replace(/\s+/g, ' ').trim();
}

export function hasDecoration(text: string): boolean {
  DECORATION.lastIndex = 0;
  const found = DECORATION.test(text);
  DECORATION.lastIndex = 0;
  return found;
}

/**
 * VoiceOver açıksa metni hemen okur. iOS `accessibilityLiveRegion`'ı desteklemez; ekranda sonradan
 * beliren hata, onay ve adım değişiklikleri bununla duyurulur.
 */
export function announce(text: string): void {
  const spoken = spokenText(text);
  if (spoken) AccessibilityInfo.announceForAccessibility(spoken);
}

/**
 * Metin her değiştiğinde (boş değilse) duyurur. `skipInitial`: ekran ilk açıldığında okunmasın
 * (VoiceOver zaten ekranın başlığından başlar), yalnızca sonraki değişiklikler duyurulsun.
 */
export function useAnnounce(text: string | null | undefined, skipInitial = false): void {
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (text && !(skipInitial && isFirst)) announce(text);
  }, [text, skipInitial]);
}
