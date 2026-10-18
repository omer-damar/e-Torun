import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAppData } from '@/storage/AppDataProvider';
import { isDoseNotificationData } from './notifications';

/**
 * İlaç bildirimine dokunulunca "Bugünkü ilaçlarım" açılır ve ilgili satır vurgulanır.
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
    if (handled.current === key || !isDoseNotificationData(content.data)) return;
    handled.current = key;
    router.push({ pathname: '/ilaclar', params: { highlight: content.data.medicationId, time: content.data.time } });
  }, [ready, settings.onboardingDone, response]);

  return null;
}
