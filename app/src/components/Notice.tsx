import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { borderWidth, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  message?: string;
  /** Kutunun altına eklenecek buton(lar). */
  children?: ReactNode;
};

/** Kalıcı, sakin uyarı kutusu (toast değil; kullanıcı kapatana ya da sorun çözülene kadar kalır). */
export function Notice({ title, message, children }: Props) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <AppText variant="bodyBold" color={colors.warningText}>
        ⚠️ {title}
      </AppText>
      {message ? <AppText color={colors.warningText}>{message}</AppText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningText,
    borderWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
