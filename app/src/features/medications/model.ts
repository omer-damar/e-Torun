/** İlaç veri modeli — PROJE_PLANI.md bölüm 4 ("Depolama şeması"). */

/** 1 = Pazartesi … 7 = Pazar (ISO). Expo bildirimlerinde 1 = Pazar; bkz. `toExpoWeekday`. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAY_NAMES: Record<IsoWeekday, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
  7: 'Pazar',
};

export const ALL_WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Kutudaki ilacı tanımaya yardım eden renk. Renk hiçbir zaman tek başına bilgi taşımaz; adı da yazılır. */
export const MED_COLORS = [
  { id: 'beyaz', label: 'Beyaz', hex: '#FFFFFF' },
  { id: 'sari', label: 'Sarı', hex: '#F2C200' },
  { id: 'turuncu', label: 'Turuncu', hex: '#E8710A' },
  { id: 'kirmizi', label: 'Kırmızı', hex: '#C62828' },
  { id: 'pembe', label: 'Pembe', hex: '#E91E8C' },
  { id: 'mavi', label: 'Mavi', hex: '#1565C0' },
  { id: 'yesil', label: 'Yeşil', hex: '#2E7D32' },
] as const;

export type MedColorId = (typeof MED_COLORS)[number]['id'];

export function medColor(id: MedColorId) {
  return MED_COLORS.find((c) => c.id === id) ?? MED_COLORS[0];
}

export type Medication = {
  id: string;
  name: string;
  /** Serbest metin, ör. "1 tablet". */
  dose: string;
  /** "HH:mm", sıralı ve tekil. */
  times: string[];
  days: 'everyday' | IsoWeekday[];
  note?: string;
  color: MedColorId;
  active: boolean;
  /** Planlı bildirimlerin kimlikleri (senkronizasyon ile güncel tutulur). */
  notificationIds: string[];
};

export type DoseStatus = 'taken' | 'skipped' | 'pending' | 'missed';

export type DoseLogEntry = {
  medicationId: string;
  /** Yerel saatle "YYYY-MM-DDTHH:mm" (saat dilimi karışıklığı olmasın diye). */
  scheduledAt: string;
  status: 'taken' | 'skipped';
  /** ISO zaman damgası. */
  recordedAt: string;
};

/** Belirli bir gündeki tek bir doz. */
export type Dose = {
  medicationId: string;
  name: string;
  dose: string;
  color: MedColorId;
  /** "HH:mm" */
  time: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "YYYY-MM-DDTHH:mm" — doz geçmişinde anahtar. */
  scheduledAt: string;
};

export const MAX_NAME_LENGTH = 40;
export const MAX_DOSE_LENGTH = 30;
export const MAX_TIMES_PER_MEDICATION = 6;
