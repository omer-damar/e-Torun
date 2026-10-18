/** İlaç ekle/düzenle sihirbazının saf mantığı (adım doğrulama, kayda dönüştürme). */

import {
  MAX_DOSE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TIMES_PER_MEDICATION,
  type IsoWeekday,
  type MedColorId,
  type Medication,
} from './model';
import { formatTime, normalizeTimes, parseTime } from './schedule';

export type MedicationDraft = {
  name: string;
  dose: string;
  times: string[];
  days: 'everyday' | IsoWeekday[];
  color: MedColorId;
};

export const WIZARD_STEPS = ['name', 'dose', 'times', 'days', 'color', 'summary'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const EMPTY_DRAFT: MedicationDraft = { name: '', dose: '', times: ['08:00'], days: 'everyday', color: 'beyaz' };

export function draftFromMedication(med: Medication): MedicationDraft {
  return { name: med.name, dose: med.dose, times: [...med.times], days: med.days === 'everyday' ? 'everyday' : [...med.days], color: med.color };
}

/** Adımdan ileri geçmeden önce kontrol; sorun varsa kullanıcıya gösterilecek cümle. */
export function validateStep(step: WizardStep, draft: MedicationDraft): string | null {
  switch (step) {
    case 'name':
      if (!draft.name.trim()) return 'Lütfen ilacın adını yazın.';
      if (draft.name.trim().length > MAX_NAME_LENGTH) return `İlaç adı en fazla ${MAX_NAME_LENGTH} harf olabilir.`;
      return null;
    case 'dose':
      return draft.dose.trim().length > MAX_DOSE_LENGTH ? `Doz en fazla ${MAX_DOSE_LENGTH} harf olabilir.` : null;
    case 'times':
      if (draft.times.length === 0) return 'En az bir saat seçin.';
      if (normalizeTimes(draft.times).length !== draft.times.length) return 'Aynı saat iki kez seçilmiş. Lütfen birini değiştirin.';
      return null;
    case 'days':
      return draft.days !== 'everyday' && draft.days.length === 0 ? 'En az bir gün seçin.' : null;
    default:
      return null;
  }
}

/** Yeni saat eklerken önerilecek değer: son saatten sonraki ilk boş saat. */
export function suggestNextTime(times: string[]): string | null {
  if (times.length >= MAX_TIMES_PER_MEDICATION) return null;
  const last = times.length > 0 ? parseTime([...times].sort().at(-1)!).hour : 7;
  for (let i = 1; i <= 24; i++) {
    const candidate = formatTime((last + 4 * i) % 24, 0);
    if (!times.includes(candidate)) return candidate;
  }
  return null;
}

export function toggleDay(days: MedicationDraft['days'], day: IsoWeekday): IsoWeekday[] {
  const current = days === 'everyday' ? [] : days;
  return current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
}

export function draftToMedication(draft: MedicationDraft, id: string, existing?: Medication): Medication {
  const days = draft.days === 'everyday' || draft.days.length === 7 ? 'everyday' : [...draft.days].sort();
  return {
    id,
    name: draft.name.trim(),
    dose: draft.dose.trim(),
    times: normalizeTimes(draft.times),
    days,
    color: draft.color,
    note: existing?.note,
    active: existing?.active ?? true,
    notificationIds: existing?.notificationIds ?? [],
  };
}

export function newMedicationId(): string {
  return `med_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
