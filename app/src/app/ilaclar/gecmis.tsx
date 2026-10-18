import { StyleSheet, View } from 'react-native';

import { AppText, ScreenContainer } from '@/components';
import type { DoseStatus } from '@/features/medications/model';
import { getHistory } from '@/features/medications/schedule';
import { useNow } from '@/features/medications/useNow';
import { useAppData } from '@/storage/AppDataProvider';
import { borderWidth, colors, radius, spacing } from '@/theme';
import { formatTurkishDate } from '@/utils/date';

const STATUS: Record<DoseStatus, string> = {
  taken: '✅ Alındı',
  skipped: '⏭️ Atlandı',
  missed: '❌ Alınmadı',
  pending: '⏳ Bekliyor',
};

/** B4 — Son 7 gün. Bugün en üstte. */
export default function MedicationHistoryScreen() {
  const { medications, doseLog } = useAppData();
  const now = useNow(60_000);
  const history = getHistory(medications, doseLog, now);

  return (
    <ScreenContainer title="Son 7 gün">
      {medications.length === 0 ? <AppText>Henüz ilaç eklenmedi.</AppText> : null}
      {medications.length > 0
        ? history.map(({ date, doses }, index) => {
            const taken = doses.filter((d) => d.status === 'taken').length;
            const title = index === 0 ? `Bugün, ${formatTurkishDate(date)}` : formatTurkishDate(date);
            return (
              <View key={date.toISOString()} style={styles.day}>
                <AppText variant="button" accessibilityRole="header">
                  {title}
                </AppText>
                {doses.length === 0 ? (
                  <AppText color={colors.textSecondary}>Bu gün ilaç yoktu.</AppText>
                ) : (
                  <>
                    <AppText variant="bodyBold">
                      {doses.length} ilaçtan {taken} tanesi alındı
                    </AppText>
                    {doses.map(({ dose, status }) => (
                      <AppText key={`${dose.medicationId}${dose.time}`}>
                        {dose.time} {dose.name}: {STATUS[status]}
                      </AppText>
                    ))}
                  </>
                )}
              </View>
            );
          })
        : null}
      <AppText color={colors.textSecondary}>
        Not: Geçmiş, ilaçların şu anki saatlerine göre gösterilir.
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  day: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
});
