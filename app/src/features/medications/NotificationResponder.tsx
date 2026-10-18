import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAppData } from '@/storage/AppDataProvider';
import { isDoseNotificationData, isRefillNotificationData } from './notifications';

/**
 * İlaç bildirimine dokunulunca "Bugünkü ilaçlarım" açılır ve ilgili satır vurgulanır;
 * "ilacınız bitiyor" bildiriminde randevu ekranı açılır.
 * Uygulama kapalıyken dokunulduysa da çalışır (`useLastNotificationResponse` açılışta son yanıtı verir).
 */
export function NotificationResponder() {
  const { ready, settings } = useAppData();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !settings.onboardingDone || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { identifier, content } = response.notification.request;
    const key = `${identifier}@${response.notification.date}`;
    if (handled.current === key) return;
    if (isDoseNotificationData(content.data)) {
      handled.current = key;
      router.push({ pathname: '/ilaclar', params: { highlight: content.data.medicationId, time: content.data.time } });
    } else if (isRefillNotificationData(content.data)) {
      // B6: "İlacınız bitmek üzere" → randevu ekranı.
      handled.current = key;
      router.push({ pathname: '/ilaclar/randevu', params: { id: content.data.medicationId } });
    }
  }, [ready, settings.onboardingDone, response]);

  return null;
}
