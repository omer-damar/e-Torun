import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unknown';

function toState(status: Notifications.NotificationPermissionsStatus): PermissionState {
  if (status.granted) return 'granted';
  if (status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status.canAskAgain && status.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<PermissionState> {
  try {
    return toState(await Notifications.getPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    return toState(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      }),
    );
  } catch {
    return 'unknown';
  }
}

/**
 * Ekran her odaklandığında ve uygulama ön plana döndüğünde (ör. kullanıcı iOS Ayarlar'dan
 * izni açıp geri gelince) izin durumunu yeniden okur.
 */
export function useNotificationPermission(): PermissionState {
  const [state, setState] = useState<PermissionState>('unknown');

  const refresh = useCallback(() => {
    getNotificationPermission().then(setState);
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return state;
}
