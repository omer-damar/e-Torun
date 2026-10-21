import type { FontScale } from '@/theme';

export type Settings = {
  userName: string;
  fontScale: FontScale;
  speechEnabled: boolean;
  onboardingDone: boolean;
  /** B6: ilacın bitmesine bu kadar gün kala uyarı verilir. */
  refillWarningDays: number;
  /** D8: sonuç ekranında "Yapay zekâya da sor" butonu. Mesajı internete gönderdiği için varsayılan kapalı. */
  aiCheckEnabled: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  fontScale: 'buyuk',
  speechEnabled: true,
  onboardingDone: false,
  refillWarningDays: 10,
  aiCheckEnabled: false,
};

export const MAX_NAME_LENGTH = 40;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Depodan gelen veriyi doğrular; eksik/yanlış alanlar varsayılanla doldurulur. */
export function parseSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null;
  return {
    userName: typeof raw.userName === 'string' ? raw.userName.slice(0, MAX_NAME_LENGTH) : DEFAULT_SETTINGS.userName,
    fontScale: raw.fontScale === 'cokBuyuk' ? 'cokBuyuk' : 'buyuk',
    speechEnabled: typeof raw.speechEnabled === 'boolean' ? raw.speechEnabled : DEFAULT_SETTINGS.speechEnabled,
    onboardingDone: raw.onboardingDone === true,
    refillWarningDays:
      typeof raw.refillWarningDays === 'number' && raw.refillWarningDays >= 1 && raw.refillWarningDays <= 60
        ? Math.round(raw.refillWarningDays)
        : DEFAULT_SETTINGS.refillWarningDays,
    aiCheckEnabled: raw.aiCheckEnabled === true,
  };
}
