/**
 * İlaç bildirimleri — PROJE_PLANI.md bölüm 6 "Bildirim mantığı" ve B6.
 *
 * Tek doğruluk kaynağı depodaki ilaç listesidir. `syncMedicationNotifications` planlı
 * bildirimleri buna göre düzeltir: eksik/eskimiş olanı yeniden planlar, artık olanı iptal eder.
 * Her bildirimin `data.key` alanı, planlandığı andaki ayarları (ilaç adı, doz, saat, gün,
 * tetikleyici; stok bildiriminde tarih) taşır. Bir ilacın beklenen anahtar kümesi mevcut
 * bildirimlerle aynı değilse o ilacın bildirimleri yenilenir.
 */

import * as Notifications from 'expo-notifications';

import { medColor, type Medication } from './model';
import { parseTime, toExpoWeekday } from './schedule';
import { getRefillReminderDate } from './stock';

export const DOSE_NOTIFICATION_TYPE = 'dose';
export const REFILL_NOTIFICATION_TYPE = 'refill';

export type DoseNotificationData = {
  type: typeof DOSE_NOTIFICATION_TYPE;
  medicationId: string;
  time: string;
  key: string;
};

export type RefillNotificationData = {
  type: typeof REFILL_NOTIFICATION_TYPE;
  medicationId: string;
  key: string;
};

type ManagedData = DoseNotificationData | RefillNotificationData;

type Request = { content: Notifications.NotificationContentInput; trigger: Notifications.NotificationTriggerInput };

export type SyncOptions = { now: Date; refillWarningDays: number };

/** Uygulama ön plandayken de bildirim (afiş + ses) gösterilsin. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Bildirim metni bunlarla yazılır; biri değişince ilacın bildirimleri yeniden planlanır. */
function medicationSignature(med: Medication): string {
  return JSON.stringify([med.name, med.dose, med.color, med.times, med.days, NOTIFICATION_TEXT_VERSION]);
}

/** Metin değiştiğinde artırılır: telefondaki eski metinli bildirimler bir sonraki senkronda yenilenir. */
const NOTIFICATION_TEXT_VERSION = 2;

/** "Tansiyon ilacı" → "Tansiyon ilacınızın", "Beloc" → "Beloc ilacınızın". */
export function possessiveMedicationName(name: string): string {
  const trimmed = name.trim();
  // Türkçe büyük harf ("İlacı") için toLocaleLowerCase; /i bayrağı "İ"yi "i" saymaz.
  return /ilac[ıi]$/.test(trimmed.toLocaleLowerCase('tr')) ? `${trimmed.slice(0, -1)}ınızın` : `${trimmed} ilacınızın`;
}

/**
 * İlaç saati bildirimi:
 *   💊 Tansiyon ilacı · 08:00
 *   Tansiyon ilacınızın saati geldi: 1 tablet (beyaz).
 *   Sağlığınız için ilacınızı doğru dozda ve zamanında alın!
 */
export function doseNotificationText(med: Medication, time: string): { title: string; body: string } {
  const color = med.color ? ` (${medColor(med.color).label.toLocaleLowerCase('tr')})` : '';
  const dose = med.dose.trim() ? `: ${med.dose.trim()}${color}` : color;
  return {
    title: `💊 ${med.name.trim()} · ${time}`,
    body: `${possessiveMedicationName(med.name)} saati geldi${dose}.\nSağlığınız için ilacınızı doğru dozda ve zamanında alın!`,
  };
}

/** "İlacınız bitmek üzere" bildirimi; dokununca randevu ekranı açılır. */
export function refillNotificationText(med: Medication, days: number): { title: string; body: string } {
  return {
    title: `💊 ${med.name.trim()} bitmek üzere`,
    body:
      `İlacınız yaklaşık ${days} gün içinde bitecek.\n` +
      'Sağlığınız için ilacınız bitmeden reçete randevusu alın! Randevu için bu bildirime dokunun.',
  };
}

/** Bir ilacın planlanacak bildirim istekleri (saf). Stok bildirimi yalnızca `options` verilirse. */
export function buildRequests(med: Medication, options?: SyncOptions): Request[] {
  if (!med.active) return [];
  const signature = medicationSignature(med);
  const doses = med.times.flatMap((time): Request[] => {
    const { hour, minute } = parseTime(time);
    const triggers: Notifications.NotificationTriggerInput[] =
      med.days === 'everyday'
        ? [{ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }]
        : med.days.map((day) => ({
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: toExpoWeekday(day),
            hour,
            minute,
          }));
    return triggers.map((trigger) => ({
      content: {
        ...doseNotificationText(med, time),
        sound: 'default',
        data: {
          type: DOSE_NOTIFICATION_TYPE,
          medicationId: med.id,
          time,
          key: `dose|${signature}|${JSON.stringify(trigger)}`,
        } satisfies DoseNotificationData,
      },
      trigger,
    }));
  });

  const refillAt = options ? getRefillReminderDate(med, options.now, options.refillWarningDays) : null;
  if (!refillAt) return doses;
  const refill: Request = {
    content: {
      ...refillNotificationText(med, options!.refillWarningDays),
      sound: 'default',
      data: {
        type: REFILL_NOTIFICATION_TYPE,
        medicationId: med.id,
        key: `refill|${refillAt.toISOString()}`,
      } satisfies RefillNotificationData,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: refillAt },
  };
  return [...doses, refill];
}

function isManagedData(data: unknown): data is ManagedData {
  if (typeof data !== 'object' || data === null) return false;
  const { type, medicationId } = data as Record<string, unknown>;
  return (type === DOSE_NOTIFICATION_TYPE || type === REFILL_NOTIFICATION_TYPE) && typeof medicationId === 'string';
}

export function isDoseNotificationData(data: unknown): data is DoseNotificationData {
  return isManagedData(data) && data.type === DOSE_NOTIFICATION_TYPE;
}

export function isRefillNotificationData(data: unknown): data is RefillNotificationData {
  return isManagedData(data) && data.type === REFILL_NOTIFICATION_TYPE;
}

const keyOf = (data: unknown) => (isManagedData(data) ? String(data.key) : '');
const sameKeys = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

async function syncNow(medications: Medication[], options?: SyncOptions): Promise<Record<string, string[]>> {
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => isManagedData(n.content.data));
  const byMedication = new Map<string, Notifications.NotificationRequest[]>();
  for (const n of scheduled) {
    const { medicationId } = n.content.data as ManagedData;
    byMedication.set(medicationId, [...(byMedication.get(medicationId) ?? []), n]);
  }

  const result: Record<string, string[]> = {};
  const activeIds = new Set(medications.filter((m) => m.active).map((m) => m.id));

  // Silinmiş ya da durdurulmuş ilaçların bildirimleri.
  for (const [medicationId, requests] of byMedication) {
    if (!activeIds.has(medicationId)) {
      await Promise.all(requests.map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));
    }
  }

  for (const med of medications) {
    if (!med.active) {
      result[med.id] = [];
      continue;
    }
    const existing = byMedication.get(med.id) ?? [];
    const expected = buildRequests(med, options);
    if (sameKeys(existing.map((r) => keyOf(r.content.data)), expected.map((r) => keyOf(r.content.data)))) {
      result[med.id] = existing.map((r) => r.identifier);
      continue;
    }
    // Önce eskileri (yakalanan kimlikleriyle) iptal et, sonra yenileri planla.
    await Promise.all(existing.map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));
    const ids: string[] = [];
    for (const request of expected) ids.push(await Notifications.scheduleNotificationAsync(request));
    result[med.id] = ids;
  }
  return result;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Planlı bildirimleri ilaç listesine eşitler ve her ilacın güncel bildirim kimliklerini döndürür.
 * Çağrılar sıraya alınır: art arda kayıt + açılış senkronu aynı bildirimi iki kez planlamaz.
 */
export function syncMedicationNotifications(
  medications: Medication[],
  options?: SyncOptions,
): Promise<Record<string, string[]>> {
  const run = queue.then(() => syncNow(medications, options));
  queue = run.catch(() => undefined);
  return run;
}
