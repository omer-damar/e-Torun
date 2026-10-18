/**
 * İlaç zamanlamasının saf fonksiyonları — PROJE_PLANI.md bölüm 6 "Saf fonksiyonlar".
 * Tarih/saat her yerde YEREL saatle işlenir.
 */

import type { Dose, DoseLogEntry, DoseStatus, IsoWeekday, Medication } from './model';

/** Saatinden bu kadar dakika sonra işaretlenmemiş doz "saati geçti" sayılır. */
export const MISSED_AFTER_MINUTES = 60;
/** iOS en fazla 64 bekleyen yerel bildirim tutar; pay bırakılır. */
export const MAX_TRIGGERS = 60;
export const LOG_RETENTION_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, '0');

export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

export function isValidTime(time: string): boolean {
  if (!/^[0-9]{2}:[0-9]{2}$/.test(time)) return false;
  const { hour, minute } = parseTime(time);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Saatleri sıralar ve tekrarları atar. */
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter(isValidTime))].sort();
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `Date.getDay()` 0 = Pazar → ISO 7. */
export function isoWeekday(date: Date): IsoWeekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as IsoWeekday;
}

/** ISO (1 = Pazartesi) → Expo/iOS bildirim günü (1 = Pazar, 2 = Pazartesi … 7 = Cumartesi). */
export function toExpoWeekday(day: IsoWeekday): number {
  return (day % 7) + 1;
}

export function isScheduledOn(med: Medication, date: Date): boolean {
  if (!med.active) return false;
  return med.days === 'everyday' || med.days.includes(isoWeekday(date));
}

export function doseDate(dose: Dose): Date {
  const [y, m, d] = dose.date.split('-').map(Number);
  const { hour, minute } = parseTime(dose.time);
  return new Date(y, m - 1, d, hour, minute);
}

/** O günün tüm dozları, saat sırasıyla (aynı saatte ada göre). */
export function getDosesForDate(medications: Medication[], date: Date): Dose[] {
  const day = localDateKey(date);
  return medications
    .filter((med) => isScheduledOn(med, date))
    .flatMap((med) =>
      med.times.map((time) => ({
        medicationId: med.id,
        name: med.name,
        dose: med.dose,
        color: med.color,
        time,
        date: day,
        scheduledAt: `${day}T${time}`,
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name, 'tr'));
}

export function findLogEntry(dose: Dose, log: DoseLogEntry[]): DoseLogEntry | undefined {
  return log.find((e) => e.medicationId === dose.medicationId && e.scheduledAt === dose.scheduledAt);
}

export function getDoseStatus(dose: Dose, log: DoseLogEntry[], now: Date): DoseStatus {
  const entry = findLogEntry(dose, log);
  if (entry) return entry.status;
  const missedAt = doseDate(dose).getTime() + MISSED_AFTER_MINUTES * 60_000;
  return now.getTime() >= missedAt ? 'missed' : 'pending';
}

/** Bugünün henüz alınmamış ve saati geçmemiş ilk dozu (ana ekrandaki "Sıradaki"). */
export function getNextDose(medications: Medication[], log: DoseLogEntry[], now: Date): Dose | null {
  return getDosesForDate(medications, now).find((d) => getDoseStatus(d, log, now) === 'pending') ?? null;
}

/** Planlanacak bildirim sayısı: her saat × (her gün ? 1 : seçili gün sayısı). */
export function countTriggers(medications: Medication[]): number {
  return medications
    .filter((m) => m.active)
    .reduce((sum, m) => sum + m.times.length * (m.days === 'everyday' ? 1 : m.days.length), 0);
}

/** `id`'li ilaç `candidate` ile değiştirilirse (ya da eklenirse) toplam bildirim sınırı aşılır mı? */
export function wouldExceedTriggerLimit(medications: Medication[], candidate: Medication): boolean {
  const others = medications.filter((m) => m.id !== candidate.id);
  return countTriggers([...others, candidate]) > MAX_TRIGGERS;
}

export function pruneLog(log: DoseLogEntry[], now: Date, days = LOG_RETENTION_DAYS): DoseLogEntry[] {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const cutoffKey = `${localDateKey(cutoff)}T00:00`;
  return log.filter((e) => e.scheduledAt >= cutoffKey);
}

/** Dozu işaretler (aynı doz için önceki kaydın yerine geçer). */
export function recordDose(log: DoseLogEntry[], dose: Dose, status: 'taken' | 'skipped', now: Date): DoseLogEntry[] {
  return [
    ...log.filter((e) => !(e.medicationId === dose.medicationId && e.scheduledAt === dose.scheduledAt)),
    { medicationId: dose.medicationId, scheduledAt: dose.scheduledAt, status, recordedAt: now.toISOString() },
  ];
}

export function undoDose(log: DoseLogEntry[], dose: Dose): DoseLogEntry[] {
  return log.filter((e) => !(e.medicationId === dose.medicationId && e.scheduledAt === dose.scheduledAt));
}

export type HistoryDay = { date: Date; doses: { dose: Dose; status: DoseStatus }[] };

/** Bugün dahil son `days` gün, en yeni gün en üstte. */
export function getHistory(medications: Medication[], log: DoseLogEntry[], now: Date, days = 7): HistoryDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    return {
      date,
      doses: getDosesForDate(medications, date).map((dose) => ({ dose, status: getDoseStatus(dose, log, now) })),
    };
  });
}

/** "Her gün" ya da "Pazartesi, Çarşamba, Cuma". */
export function describeDays(days: Medication['days'], names: Record<IsoWeekday, string>): string {
  if (days === 'everyday' || days.length === 7) return 'Her gün';
  return [...days].sort().map((d) => names[d]).join(', ');
}
