/**
 * B6/B7 — ilaç stoğu, bitiş tahmini ve randevu mesajı (saf fonksiyonlar).
 * PROJE_PLANI.md bölüm 6 "B6 — İlaç stoğu ve bitiş tahmini", "B7 — Randevu yönlendirmesi".
 */

import type { Medication, MedicationStock } from './model';

/** Kalan gün bu sayıya ya da altına inince "kritik" (3 gün). */
export const CRITICAL_DAYS = 3;
/** "İlacınız bitiyor" bildiriminin saati. */
export const REFILL_NOTIFICATION_HOUR = 10;

export type RefillStatus = 'unknown' | 'ok' | 'soon' | 'critical' | 'empty';

/** Günlük ortalama tüketim (adet). Belirli günlerde haftalık ortalama alınır. */
export function getDailyUnits(med: Medication): number {
  if (!med.stock || !med.active) return 0;
  const daysPerWeek = med.days === 'everyday' ? 7 : med.days.length;
  return (med.stock.unitsPerDose * med.times.length * daysPerWeek) / 7;
}

/** Stok kaç gün yeter (aşağı yuvarlanır). Stok takibi yoksa `null`. */
export function getDaysLeft(med: Medication): number | null {
  if (!med.stock) return null;
  const daily = getDailyUnits(med);
  if (daily <= 0) return null;
  return Math.floor(med.stock.remainingUnits / daily + 1e-9);
}

/** Tahmini bitiş günü (gün başı, yerel saat). */
export function getRunOutDate(med: Medication, now: Date): Date | null {
  const days = getDaysLeft(med);
  if (days === null) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
}

export function getRefillStatus(med: Medication, warningDays: number): RefillStatus {
  if (!med.stock) return 'unknown';
  if (med.stock.remainingUnits <= 0) return 'empty';
  const days = getDaysLeft(med);
  if (days === null) return 'unknown';
  if (days <= CRITICAL_DAYS) return 'critical';
  if (days <= warningDays) return 'soon';
  return 'ok';
}

/** ALDIM: stoktan düşer, 0'ın altına inmez (uygulama doz almayı asla engellemez). */
export function applyTaken(stock: MedicationStock, now: Date): MedicationStock {
  return { ...stock, remainingUnits: Math.max(0, round(stock.remainingUnits - stock.unitsPerDose)), updatedAt: now.toISOString() };
}

/** Geri al: düşülen miktarı geri ekler. */
export function applyUndo(stock: MedicationStock, now: Date): MedicationStock {
  return { ...stock, remainingUnits: round(stock.remainingUnits + stock.unitsPerDose), updatedAt: now.toISOString() };
}

/** "Yeni kutu aldım": kutudaki adet eklenir. */
export function addUnits(stock: MedicationStock, units: number, now: Date): MedicationStock {
  return { ...stock, remainingUnits: round(stock.remainingUnits + units), updatedAt: now.toISOString() };
}

/** 0.5 tablet gibi kesirlerde kayan nokta hatası birikmesin. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Kullanıcının yazdığı adet: "30", "1,5", "0.5" → sayı; geçersizse `null`. */
export function parseUnits(input: string): number | null {
  // Number('') === 0: boş kutu "0 tane" sayılmasın.
  if (!/^[0-9]+([.,][0-9]+)?$/.test(input.trim())) return null;
  const value = Number(input.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 1000 ? round(value) : null;
}

/** "1 tane", "yarım", "1,5 tane" */
export function formatUnits(units: number): string {
  if (units === 0.5) return 'yarım';
  return `${String(units).replace('.', ',')} tane`;
}

/** Ekranda gösterilecek yaklaşık süre cümlesi. */
export function describeDaysLeft(med: Medication, now: Date): string | null {
  const days = getDaysLeft(med);
  if (days === null) return null;
  if (!med.stock || med.stock.remainingUnits <= 0) return `${med.name} bitmiş olabilir.`;
  if (days === 0) return `${med.name} bugün bitiyor.`;
  const runOut = getRunOutDate(med, now)!;
  return `${med.name} yaklaşık ${days} gün yetecek (${runOut.getDate()} ${MONTHS[runOut.getMonth()]}).`;
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/**
 * "İlacınız bitiyor" bildirim zamanı: bitişten `warningDays` gün önce, saat 10:00.
 * O an geçmişse `null` (uyarı zaten ekranda görünüyor).
 */
export function getRefillReminderDate(med: Medication, now: Date, warningDays: number): Date | null {
  const runOut = getRunOutDate(med, now);
  if (!runOut || !med.stock || med.stock.remainingUnits <= 0) return null;
  const at = new Date(runOut.getFullYear(), runOut.getMonth(), runOut.getDate() - warningDays, REFILL_NOTIFICATION_HOUR, 0);
  return at.getTime() > now.getTime() + 60_000 ? at : null;
}

const BACK_VOWELS = 'aıouâû';
const ALL_VOWELS = 'aıoueiöüâîû';

/** Özel ada yönelme eki (ünlü uyumu): "Yılmaz'a", "Demir'e", "Kaya'ya", "Öztürk'e". */
export function withDative(name: string): string {
  const lower = name.toLocaleLowerCase('tr');
  const lastVowel = [...lower].reverse().find((ch) => ALL_VOWELS.includes(ch));
  const vowel = lastVowel && BACK_VOWELS.includes(lastVowel) ? 'a' : 'e';
  const endsWithVowel = ALL_VOWELS.includes(lower.at(-1) ?? '');
  return `${name}'${endsWithVowel ? 'y' : ''}${vowel}`;
}

/** "Tansiyon ilacı" → "Tansiyon ilacım"; "Coraspin" → "Coraspin ilacım". */
function myMedication(name: string): string {
  const trimmed = name.trim();
  if (/ ilac[ıi]$/i.test(trimmed)) return `${trimmed}m`;
  if (/ ilac[ıi]m$/i.test(trimmed)) return trimmed;
  return `${trimmed} ilacım`;
}

/**
 * B7 — yakına gönderilecek hazır SMS metni. T.C. kimlik numarası ASLA eklenmez.
 * Bölüm / doktor / hastane girilmemişse ilgili kısım cümleden çıkarılır.
 */
export function buildRefillSms(params: {
  medicationName: string;
  daysLeft: number | null;
  contactName: string;
  userName: string;
  department?: string;
  doctor?: string;
  hospital?: string;
}): string {
  const greeting = params.contactName.trim() ? `Merhaba ${params.contactName.trim()}` : 'Merhaba';
  const me = params.userName.trim() ? `, ben ${params.userName.trim()}.` : '.';
  const when =
    params.daysLeft === null
      ? 'bitmek üzere'
      : params.daysLeft <= 0
        ? 'bitti'
        : `yaklaşık ${params.daysLeft} gün sonra bitecek`;

  const doctor = params.doctor?.trim() ? `${/^dr\.?\s/i.test(params.doctor.trim()) ? '' : 'Dr. '}${params.doctor.trim()}` : '';
  const hospital = params.hospital?.trim() ? ` (${params.hospital.trim()})` : '';
  const department = params.department?.trim();

  let target: string;
  if (department && doctor) target = `${department} bölümünden ${withDative(doctor)}${hospital}`;
  else if (department) target = `${department} bölümüne${hospital}`;
  else if (doctor) target = `${withDative(doctor)}${hospital}`;
  else target = `doktorumdan${hospital}`;

  return (
    `${greeting}${me} ${myMedication(params.medicationName)} ${when}. ` +
    `Reçete yazdırmak için ${target} MHRS'den randevu alabilir misin? Teşekkürler.`
  );
}
