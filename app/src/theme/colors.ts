/**
 * Renk paleti — docs/PROJE_PLANI.md bölüm 10.
 * Tüm metin/zemin çiftleri ≥ 7:1 kontrast (WCAG AAA) sağlar:
 *   text/background 18.9 · primary/white 8.0 · danger/white 7.3
 *   warningText/warningBackground 8.4 · success/white 7.9 · textSecondary/white 12.6
 */
export const colors = {
  background: '#FFFFFF',
  text: '#111111',
  textSecondary: '#333333',
  textOnColor: '#FFFFFF',

  primary: '#0B4F9C',
  danger: '#B00020',
  success: '#1B5E20',
  warningBackground: '#FFF3C4',
  warningText: '#5C4300',

  /** Nötr buton zemini; üzerindeki `text` ile 16.9:1. */
  neutralBackground: '#F2F2F2',
  border: '#111111',
  /** Modal arkasını karartan katman. */
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorName = keyof typeof colors;
