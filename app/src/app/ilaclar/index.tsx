import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppText, BigButton, Notice, ScreenContainer } from '@/components';
import { DoseCard } from '@/components/DoseCard';
import type { Dose } from '@/features/medications/model';
import { findLogEntry, getDoseStatus, getDosesForDate } from '@/features/medications/schedule';
import { useNow } from '@/features/medications/useNow';
import { useNotificationPermission } from '@/features/notifications/permission';
import { useAppData } from '@/storage/AppDataProvider';
import { colors } from '@/theme';
import { formatTurkishDate } from '@/utils/date';

/** "Aldım" işaretinden sonra "Geri al" bu kadar süre görünür (toast değil, satırın içinde). */
export const UNDO_WINDOW_MS = 10_000;

const doseKey = (dose: Dose) => `${dose.medicationId}@${dose.scheduledAt}`;

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** B3 — Bugünkü ilaçlarım (PROJE_PLANI.md bölüm 6). */
export default function MedicationsTodayScreen() {
  // Bildirime dokunulunca: ?highlight=<ilaç id>&time=HH:mm
  const { highlight, time } = useLocalSearchParams<{ highlight?: string; time?: string }>();
  const { medications, doseLog, markDose, unmarkDose } = useAppData();
  const now = useNow();
  const permission = useNotificationPermission();
  const [recentlyTaken, setRecentlyTaken] = useState<Record<string, number>>({});

  // Geri al süresi dolunca satırdan kalksın.
  useEffect(() => {
    const keys = Object.keys(recentlyTaken);
    if (keys.length === 0) return;
    const nextExpiry = Math.min(...keys.map((k) => recentlyTaken[k] + UNDO_WINDOW_MS)) - Date.now();
    const timer = setTimeout(() => {
      const cutoff = Date.now() - UNDO_WINDOW_MS;
      setRecentlyTaken((r) => Object.fromEntries(Object.entries(r).filter(([, t]) => t > cutoff)));
    }, Math.max(nextExpiry, 0) + 50);
    return () => clearTimeout(timer);
  }, [recentlyTaken]);

  const doses = getDosesForDate(medications, now);

  const take = async (dose: Dose) => {
    setRecentlyTaken((r) => ({ ...r, [doseKey(dose)]: Date.now() }));
    await markDose(dose, 'taken');
  };
  const undo = async (dose: Dose) => {
    setRecentlyTaken((r) => {
      const { [doseKey(dose)]: _removed, ...rest } = r;
      return rest;
    });
    await unmarkDose(dose);
  };

  return (
    <ScreenContainer title="Bugünkü ilaçlarım">
      <AppText variant="bodyBold" color={colors.textSecondary}>
        {formatTurkishDate(now)}
      </AppText>

      {permission === 'denied' && medications.length > 0 ? (
        <Notice
          title="Bildirimler kapalı"
          message="İlaç saatinde telefonunuz size haber veremez. Ana ekrandaki uyarıdan açabilirsiniz."
        />
      ) : null}

      {medications.length === 0 ? (
        <>
          <AppText>Henüz ilaç eklenmedi.</AppText>
          <BigButton icon="➕" title="İlaç ekle" onPress={() => router.push('/ilaclar/duzenle')} testID="add-medication" />
        </>
      ) : doses.length === 0 ? (
        <AppText>Bugün almanız gereken ilaç yok.</AppText>
      ) : (
        doses.map((dose) => {
          const status = getDoseStatus(dose, doseLog, now);
          const entry = findLogEntry(dose, doseLog);
          const takenAtMs = recentlyTaken[doseKey(dose)];
          return (
            <DoseCard
              key={doseKey(dose)}
              dose={dose}
              status={status}
              takenAt={entry ? hhmm(entry.recordedAt) : undefined}
              highlighted={highlight === dose.medicationId && time === dose.time && status !== 'taken'}
              canUndo={takenAtMs !== undefined && Date.now() - takenAtMs < UNDO_WINDOW_MS}
              onTake={() => take(dose)}
              onUndo={() => undo(dose)}
            />
          );
        })
      )}

      {medications.length > 0 ? (
        <>
          <BigButton
            icon="📋"
            title="Tüm ilaçlarım"
            subtitle="Ekle, değiştir, sil"
            variant="neutral"
            onPress={() => router.push('/ilaclar/liste')}
          />
          <BigButton
            icon="📅"
            title="Son 7 gün"
            subtitle="Hangi ilaçları aldım?"
            variant="neutral"
            onPress={() => router.push('/ilaclar/gecmis')}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}
