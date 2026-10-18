import { router } from 'expo-router';

import { AppText, BigButton, ScreenContainer } from '@/components';
import { medColor, WEEKDAY_NAMES } from '@/features/medications/model';
import { countTriggers, describeDays, MAX_TRIGGERS } from '@/features/medications/schedule';
import { useAppData } from '@/storage/AppDataProvider';
import { colors } from '@/theme';

/** B1 — Tüm ilaçlar. Dokununca düzenleme (özet) ekranı açılır. */
export default function MedicationListScreen() {
  const { medications } = useAppData();
  const sorted = [...medications].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const triggers = countTriggers(medications);

  return (
    <ScreenContainer title="Tüm ilaçlarım">
      {sorted.length === 0 ? <AppText>Henüz ilaç eklenmedi.</AppText> : null}
      {sorted.map((med) => (
        <BigButton
          key={med.id}
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
      ))}
      <BigButton icon="➕" title="İlaç ekle" onPress={() => router.push('/ilaclar/duzenle')} testID="add-medication" />
      {triggers > MAX_TRIGGERS - 10 ? (
        <AppText color={colors.textSecondary}>
          Hatırlatma sayısı: {triggers} / {MAX_TRIGGERS} (telefonun sınırı).
        </AppText>
      ) : null}
    </ScreenContainer>
  );
}
