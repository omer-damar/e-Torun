import { Modal, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { BigButton, type BigButtonVariant } from './BigButton';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tehlikeli işlemler (112, tümünü sil) için 'danger'. */
  confirmVariant?: BigButtonVariant;
};

/**
 * Büyük Evet/Hayır onay penceresi. Kendiliğinden kapanmaz; iki buton arasında
 * yanlışlıkla basmayı önleyen geniş boşluk vardır.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Evet',
  cancelLabel = 'Hayır',
  confirmVariant = 'primary',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          <AppText>{message}</AppText>
          <View style={styles.buttons}>
            <BigButton title={confirmLabel} variant={confirmVariant} onPress={onConfirm} testID="confirm-yes" />
            <BigButton title={cancelLabel} variant="neutral" onPress={onCancel} testID="confirm-no" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screen,
    backgroundColor: colors.overlay,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  buttons: {
    marginTop: spacing.md,
    gap: spacing.xl,
  },
});
