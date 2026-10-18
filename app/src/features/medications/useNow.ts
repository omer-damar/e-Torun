import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Şimdiki zaman; her `intervalMs`'de ve uygulama ön plana geldiğinde yenilenir.
 * Böylece "saati geçti" durumu ve gece yarısı geçişi (yeni günün listesi) kendiliğinden güncellenir.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
