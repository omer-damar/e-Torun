/** Boşluk ve boyut sabitleri — PROJE_PLANI.md bölüm 10. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Ekran kenar boşluğu. */
  screen: 20,
  /** Butonlar arası en az boşluk. */
  buttonGap: 16,
} as const;

/** Her dokunulabilir öğe en az bu kadar geniş ve yüksek olmalı (pt). */
export const MIN_TOUCH_SIZE = 64;

export const radius = {
  md: 12,
  lg: 16,
} as const;

export const borderWidth = 2;
