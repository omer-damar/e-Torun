import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BigButton, ScreenContainer } from '@/components';
import { medColor, WEEKDAY_NAMES } from '@/features/medications/model';
import { countTriggers, describeDays, MAX_TRIGGERS } from '@/features/medications/schedule';
import { useAppData } from '@/storage/AppDataProvider';
import { getDaysLeft } from '@/features/medications/stock';
import { borderWidth, colors, radius, spacing } from '@/theme';

const styles = StyleSheet.create({
  item: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth,
    borderColor: colors.neutralBackground,
    borderRadius: radius.lg,
  },
});

/** B1 — Tüm ilaçlar. Dokununca düzenleme (özet) ekranı açılır. */
export default function MedicationListScreen() {
  const { medications } = useAppData();
  const sorted = [...medications].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const triggers = countTriggers(medications);

  return (
    <ScreenContainer title="Tüm ilaçlarım">
      {sorted.length === 0 ? <AppText>Henüz ilaç eklenmedi.</AppText> : null}
      {sorted.map((med) => {
        const daysLeft = getDaysLeft(med);
        return (
          <View key={med.id} style={styles.item}>
            <BigButton
              icon="💊"
              title={med.name}
              subtitle={[
                med.dose,
                med.times.join(', '),
                describeDays(med.days, WEEKDAY_NAMES),
                `${medColor(med.color).label} renk`,
              ]
                .filter(Boolean)
                .join(' · ')}
              variant="neutral"
              onPress={() => router.push({ pathname: '/ilaclar/duzenle', params: { id: med.id } })}
              accessibilityHint="Değiştirmek veya silmek için açar"
            />
            <BigButton
              icon="📦"
              title={daysLeft === null ? 'Stok takibi yok' : `Yaklaşık ${daysLeft} gün yeter`}
              subtitle={daysLeft === null ? 'Başlatmak için dokunun' : 'Yeni kutu, randevu'}
              variant="neutral"
              onPress={() => router.push({ pathname: '/ilaclar/stok', params: { id: med.id } })}
              accessibilityLabel={`${med.name} stoğu. ${daysLeft === null ? 'Stok takibi yok' : `Yaklaşık ${daysLeft} gün yeter`}`}
            />
          </View>
        );
      })}
      <BigButton icon="➕" title="İlaç ekle" onPress={() => router.push('/ilaclar/duzenle')} testID="add-medication" />
      {triggers > MAX_TRIGGERS - 10 ? (
        <AppText color={colors.textSecondary}>
          Hatırlatma sayısı: {triggers} / {MAX_TRIGGERS} (telefonun sınırı).
        </AppText>
      ) : null}
    </ScreenContainer>
  );
}
