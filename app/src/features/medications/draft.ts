/** İlaç ekle/düzenle sihirbazının saf mantığı (adım doğrulama, kayda dönüştürme). */

import {
  MAX_DOSE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TIMES_PER_MEDICATION,
  type IsoWeekday,
  type MedColorId,
  type Medication,
  type RefillInfo,
} from './model';
import { formatTime, normalizeTimes, parseTime } from './schedule';
import { parseUnits } from './stock';

export type MedicationDraft = {
  name: string;
  dose: string;
  times: string[];
  days: 'everyday' | IsoWeekday[];
  color: MedColorId;
  /** B6: stok takibi yapılsın mı? */
  trackStock: boolean;
  /** Metin kutusundaki hâliyle (ör. "30", "1,5"). */
  stockUnits: string;
  unitsPerDose: string;
  /** B7: reçete bilgisi; boş alanlar kaydedilmez. */
  refill: Required<Record<keyof RefillInfo, string>>;
};

export const WIZARD_STEPS = ['name', 'dose', 'times', 'days', 'color', 'stock', 'refill', 'summary'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

const EMPTY_REFILL = { department: '', doctor: '', hospital: '', contactId: '' };

export const EMPTY_DRAFT: MedicationDraft = {
  name: '',
  dose: '',
  times: ['08:00'],
  days: 'everyday',
  color: 'beyaz',
  trackStock: false,
  stockUnits: '',
  unitsPerDose: '1',
  refill: EMPTY_REFILL,
};

const unitsText = (n: number) => String(n).replace('.', ',');

export function draftFromMedication(med: Medication): MedicationDraft {
  return {
    name: med.name,
    dose: med.dose,
    times: [...med.times],
    days: med.days === 'everyday' ? 'everyday' : [...med.days],
    color: med.color,
    trackStock: Boolean(med.stock),
    stockUnits: med.stock ? unitsText(med.stock.remainingUnits) : '',
    unitsPerDose: med.stock ? unitsText(med.stock.unitsPerDose) : '1',
    refill: { ...EMPTY_REFILL, ...med.refill },
  };
}

/** Reçete adımı yalnızca stok takibi açıkken sorulur (bitmeden randevu hatırlatması için). */
export function isStepVisible(step: WizardStep, draft: MedicationDraft): boolean {
  return step !== 'refill' || draft.trackStock;
}

/** Görünür adımlar arasında bir sonraki / önceki adımın sırası. */
export function adjacentStep(index: number, direction: 1 | -1, draft: MedicationDraft): number {
  let i = index + direction;
  while (i > 0 && i < WIZARD_STEPS.length - 1 && !isStepVisible(WIZARD_STEPS[i], draft)) i += direction;
  return Math.min(Math.max(i, 0), WIZARD_STEPS.length - 1);
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
    case 'stock': {
      if (!draft.trackStock) return null;
      if (parseUnits(draft.stockUnits) === null) return 'Elinizdeki ilaç sayısını rakamla yazın. Örnek: 30';
      const perDose = parseUnits(draft.unitsPerDose);
      if (perDose === null || perDose <= 0 || perDose > 20) return 'Her seferinde kaç tane aldığınızı yazın. Örnek: 1';
      return null;
    }
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

function refillFromDraft(refill: MedicationDraft['refill']): RefillInfo | undefined {
  const cleaned: RefillInfo = {};
  for (const key of Object.keys(refill) as (keyof RefillInfo)[]) {
    const value = refill[key].trim();
    if (value) cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function draftToMedication(draft: MedicationDraft, id: string, existing?: Medication, now = new Date()): Medication {
  const days = draft.days === 'everyday' || draft.days.length === 7 ? 'everyday' : [...draft.days].sort();
  const remainingUnits = parseUnits(draft.stockUnits);
  const unitsPerDose = parseUnits(draft.unitsPerDose);
  const stock =
    draft.trackStock && remainingUnits !== null && unitsPerDose !== null && unitsPerDose > 0
      ? {
          unitsPerDose,
          remainingUnits,
          // Değişmediyse eski zaman damgası korunur.
          updatedAt:
            existing?.stock?.remainingUnits === remainingUnits && existing.stock.unitsPerDose === unitsPerDose
              ? existing.stock.updatedAt
              : now.toISOString(),
        }
      : undefined;
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
    stock,
    // Stok takibi kapalıyken reçete bilgisi de saklanmaz (o adım gösterilmez).
    refill: draft.trackStock ? refillFromDraft(draft.refill) : undefined,
  };
}

export function newMedicationId(): string {
  return `med_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
