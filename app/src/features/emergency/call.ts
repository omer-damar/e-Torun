import { Alert, Linking } from 'react-native';

import { telUrl } from './phone';

export const EMERGENCY_NUMBER = '112';

/**
 * Telefon uygulamasını numarayla açar (iOS kendi "Ara" onayını da gösterir).
 * 112 için bu fonksiyon yalnızca uygulama içi onaydan SONRA çağrılmalı.
 */
export async function callNumber(phone: string): Promise<void> {
  try {
    await Linking.openURL(phone === EMERGENCY_NUMBER ? `tel:${EMERGENCY_NUMBER}` : telUrl(phone));
  } catch {
    // Kendiliğinden kaybolmayan uyarı (toast değil).
    Alert.alert('Arama başlatılamadı', 'Lütfen numarayı telefon uygulamasından elle arayın.');
  }
}
