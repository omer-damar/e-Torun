import { StyleSheet, View } from 'react-native';

import { medColor, type Dose, type DoseStatus } from '@/features/medications/model';
import { borderWidth, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { BigButton } from './BigButton';

type Props = {
  dose: Dose;
  status: DoseStatus;
  /** "HH:mm" — alındıysa ne zaman işaretlendiği. */
  takenAt?: string;
  /** Bildirimden açıldıysa vurgulanır. */
  highlighted?: boolean;
  /** Alındı olarak işaretlendikten sonraki kısa süre içinde "Geri al" gösterilir. */
  canUndo?: boolean;
  onTake: () => void;
  onUndo: () => void;
};

const STATUS_TEXT: Record<DoseStatus, string> = {
  pending: '⏳ Bekliyor',
  missed: '⚠️ Saati geçti, alınmadı',
  taken: '✅ Alındı',
  skipped: '⏭️ Atlandı',
};

/** "Bugünkü ilaçlarım" satırı. Durum her zaman ikon + metinle verilir (yalnızca renkle değil). */
export function DoseCard({ dose, status, takenAt, highlighted, canUndo, onTake, onUndo }: Props) {
  const color = medColor(dose.color);
  const statusText = status === 'taken' && takenAt ? `${STATUS_TEXT.taken} (${takenAt})` : STATUS_TEXT[status];
  const doseText = dose.dose ? `, ${dose.dose}` : '';

  return (
    <View style={[styles.card, highlighted && styles.highlighted, status === 'missed' && styles.missed]}>
      {highlighted ? (
        <AppText variant="bodyBold" color={colors.primary}>
          🔔 Bu ilacın saati geldi
        </AppText>
      ) : null}
      <View style={styles.header} accessible accessibilityLabel={`${dose.time}, ${dose.name}${doseText}, ${color.label} renkli. ${statusText}`}>
        <AppText variant="title">{dose.time}</AppText>
        <View style={styles.nameBox}>
          <View style={styles.nameRow}>
            <View style={[styles.swatch, { backgroundColor: color.hex }]} />
            <AppText variant="button" style={styles.name}>
              {dose.name}
            </AppText>
          </View>
          {dose.dose ? <AppText>{dose.dose}</AppText> : null}
        </View>
      </View>
      <AppText variant="bodyBold" color={status === 'missed' ? colors.warningText : status === 'taken' ? colors.success : colors.text}>
        {statusText}
      </AppText>

      {status === 'pending' || status === 'missed' ? (
        <BigButton
          icon="✅"
          title="ALDIM"
          onPress={onTake}
          accessibilityLabel={`${dose.time} ${dose.name} ilacını aldım`}
          testID={`take-${dose.scheduledAt}-${dose.medicationId}`}
        />
      ) : null}
      {status === 'taken' && canUndo ? (
        <BigButton
          icon="↩️"
          title="Geri al"
          variant="neutral"
          onPress={onUndo}
          accessibilityLabel={`${dose.name} için Aldım işaretini geri al`}
          accessibilityHint="Yanlışlıkla bastıysanız"
          testID={`undo-${dose.scheduledAt}-${dose.medicationId}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  highlighted: {
    borderWidth: 5,
    borderColor: colors.primary,
  },
  missed: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningText,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  nameBox: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth,
    borderColor: colors.border,
  },
  name: {
    flexShrink: 1,
  },
});
