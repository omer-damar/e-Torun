/** Depodan gelen ilaç ve doz geçmişi verisini doğrular; bozuk kayıtlar atlanır. */

import {
  MAX_DOSE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_STOCK_UNITS,
  MED_COLORS,
  type DoseLogEntry,
  type IsoWeekday,
  type MedColorId,
  type Medication,
  type MedicationStock,
  type RefillInfo,
} from './model';
import { normalizeTimes } from './schedule';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const COLOR_IDS = new Set<string>(MED_COLORS.map((c) => c.id));

function parseDays(raw: unknown): Medication['days'] | null {
  if (raw === 'everyday') return 'everyday';
  if (!Array.isArray(raw)) return null;
  const days = [...new Set(raw.filter((d): d is IsoWeekday => Number.isInteger(d) && d >= 1 && d <= 7))].sort();
  return days.length > 0 ? days : null;
}

function parseStock(raw: unknown): MedicationStock | undefined {
  if (!isRecord(raw)) return undefined;
  const { unitsPerDose, remainingUnits, updatedAt } = raw;
  if (typeof unitsPerDose !== 'number' || unitsPerDose <= 0 || unitsPerDose > 20) return undefined;
  if (typeof remainingUnits !== 'number' || remainingUnits < 0) return undefined;
  return {
    unitsPerDose,
    remainingUnits: Math.min(remainingUnits, MAX_STOCK_UNITS),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : '',
  };
}

function parseRefill(raw: unknown): RefillInfo | undefined {
  if (!isRecord(raw)) return undefined;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined);
  const refill: RefillInfo = {
    department: text(raw.department),
    doctor: text(raw.doctor),
    hospital: text(raw.hospital),
    contactId: text(raw.contactId),
  };
  return Object.values(refill).some(Boolean) ? refill : undefined;
}

export function parseMedications(raw: unknown): Medication[] | null {
  if (!Array.isArray(raw)) return null;
  const meds: Medication[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const times = normalizeTimes(Array.isArray(item.times) ? item.times.filter((t): t is string => typeof t === 'string') : []);
    const days = parseDays(item.days);
    if (times.length === 0 || !days) continue;
    meds.push({
      id: item.id,
      name: item.name.slice(0, MAX_NAME_LENGTH),
      dose: typeof item.dose === 'string' ? item.dose.slice(0, MAX_DOSE_LENGTH) : '',
      times,
      days,
      note: typeof item.note === 'string' ? item.note : undefined,
      color: typeof item.color === 'string' && COLOR_IDS.has(item.color) ? (item.color as MedColorId) : 'beyaz',
      active: item.active !== false,
      notificationIds: Array.isArray(item.notificationIds)
        ? item.notificationIds.filter((x): x is string => typeof x === 'string')
        : [],
      stock: parseStock(item.stock),
      refill: parseRefill(item.refill),
    });
  }
  return meds;
}

export function parseDoseLog(raw: unknown): DoseLogEntry[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (e): e is DoseLogEntry =>
      isRecord(e) &&
      typeof e.medicationId === 'string' &&
      typeof e.scheduledAt === 'string' &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(e.scheduledAt) &&
      (e.status === 'taken' || e.status === 'skipped') &&
      typeof e.recordedAt === 'string',
  );
}
