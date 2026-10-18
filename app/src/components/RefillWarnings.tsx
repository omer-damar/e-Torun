import { router } from 'expo-router';

import type { Medication } from '@/features/medications/model';
import { describeDaysLeft, getDaysLeft, getRefillStatus } from '@/features/medications/stock';
import { BigButton } from './BigButton';
import { Notice } from './Notice';

type Props = {
  medications: Medication[];
  warningDays: number;
  now: Date;
};

/** Stoğu azalan ilaçlar listesi (B6). Kalıcı ve sakin: kullanıcı yeni kutu girene kadar kalır. */
export function lowStockMedications(medications: Medication[], warningDays: number): Medication[] {
  return medications
    .filter((m) => m.active && ['soon', 'critical', 'empty'].includes(getRefillStatus(m, warningDays)))
    .sort((a, b) => (getDaysLeft(a) ?? 0) - (getDaysLeft(b) ?? 0));
}

export function RefillWarnings({ medications, warningDays, now }: Props) {
  const low = lowStockMedications(medications, warningDays);
  return (
    <>
      {low.map((med) => (
        <Notice key={med.id} title={describeDaysLeft(med, now) ?? `${med.name} bitmek üzere.`} message="Bitmeden reçete için randevu alın.">
          <BigButton
            icon="📞"
            title="Randevu al"
            onPress={() => router.push({ pathname: '/ilaclar/randevu', params: { id: med.id } })}
            accessibilityLabel={`${med.name} için randevu al`}
          />
          <BigButton
            icon="📦"
            title="Yeni kutu aldım"
            variant="neutral"
            onPress={() => router.push({ pathname: '/ilaclar/stok', params: { id: med.id } })}
            accessibilityLabel={`${med.name} için yeni kutu aldım`}
          />
        </Notice>
      ))}
    </>
  );
}
