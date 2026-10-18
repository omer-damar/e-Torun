/**
 * İlaç bildirimleri — PROJE_PLANI.md bölüm 6 "Bildirim mantığı".
 *
 * Tek doğruluk kaynağı depodaki ilaç listesidir. `syncMedicationNotifications` planlı
 * bildirimleri buna göre düzeltir: eksik/eskimiş olanı yeniden planlar, artık olanı iptal eder.
 * Her bildirimin `data.signature` alanı, planlandığı andaki ilaç ayarlarını taşır; ayarlar
 * değişmişse imza tutmaz ve o ilacın bildirimleri yenilenir.
 */

import * as Notifications from 'expo-notifications';

import type { Medication } from './model';
import { parseTime, toExpoWeekday } from './schedule';

export const DOSE_NOTIFICATION_TYPE = 'dose';

export type DoseNotificationData = {
  type: typeof DOSE_NOTIFICATION_TYPE;
  medicationId: string;
  time: string;
  signature: string;
};

type Request = { content: Notifications.NotificationContentInput; trigger: Notifications.NotificationTriggerInput };

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

export function medicationSignature(med: Medication): string {
  return JSON.stringify([med.name, med.dose, med.times, med.days]);
}

/** Bir ilacın planlanacak bildirim istekleri (saf). */
export function buildRequests(med: Medication): Request[] {
  if (!med.active) return [];
  const signature = medicationSignature(med);
  return med.times.flatMap((time): Request[] => {
    const { hour, minute } = parseTime(time);
    const content: Notifications.NotificationContentInput = {
      title: '💊 İlaç saati',
      body: med.dose ? `${med.name} – ${med.dose}` : med.name,
      sound: 'default',
      data: { type: DOSE_NOTIFICATION_TYPE, medicationId: med.id, time, signature } satisfies DoseNotificationData,
    };
    if (med.days === 'everyday') {
      return [{ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } }];
    }
    return med.days.map((day) => ({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: toExpoWeekday(day), hour, minute },
    }));
  });
}

export function isDoseNotificationData(data: unknown): data is DoseNotificationData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === DOSE_NOTIFICATION_TYPE &&
    typeof (data as Record<string, unknown>).medicationId === 'string'
  );
}

async function scheduleAll(med: Medication): Promise<string[]> {
  const ids: string[] = [];
  for (const request of buildRequests(med)) {
    ids.push(await Notifications.scheduleNotificationAsync(request));
  }
  return ids;
}

async function syncNow(medications: Medication[]): Promise<Record<string, string[]>> {
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
    isDoseNotificationData(n.content.data),
  );
  const byMedication = new Map<string, Notifications.NotificationRequest[]>();
  for (const n of scheduled) {
    const { medicationId } = n.content.data as DoseNotificationData;
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
    const signature = medicationSignature(med);
    const upToDate =
      existing.length === buildRequests(med).length &&
      existing.every((r) => (r.content.data as DoseNotificationData).signature === signature);
    if (upToDate) {
      result[med.id] = existing.map((r) => r.identifier);
      continue;
    }
    // Önce eskileri iptal et, sonra yenileri planla (aynı ilaç için iki takım bildirim kalmasın).
    await Promise.all(existing.map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));
    result[med.id] = await scheduleAll(med);
  }
  return result;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Planlı bildirimleri ilaç listesine eşitler ve her ilacın güncel bildirim kimliklerini döndürür.
 * Çağrılar sıraya alınır: art arda kayıt + açılış senkronu aynı bildirimi iki kez planlamaz.
 */
export function syncMedicationNotifications(medications: Medication[]): Promise<Record<string, string[]>> {
  const run = queue.then(() => syncNow(medications));
  queue = run.catch(() => undefined);
  return run;
}
