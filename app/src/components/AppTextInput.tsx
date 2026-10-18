import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';

import { borderWidth, colors, getTypography, MIN_TOUCH_SIZE, radius, scaleFontSize, spacing, useFontScale } from '@/theme';
import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Doğrulama hatası; kutunun altında kalıcı olarak, ikonla gösterilir. */
  error?: string;
  hint?: string;
};

/**
 * Büyük, etiketli metin kutusu. iOS'ta odaklanınca alt harflerin (g, y, ş) kesilmemesi için
 * lineHeight verilmez; yükseklik sabit, metin dikeyde kendiliğinden ortalanır.
 */
export const AppTextInput = forwardRef<TextInput, Props>(function AppTextInput({ label, error, hint, ...rest }, ref) {
  const { fontScale } = useWindowDimensions();
  const fontSize = scaleFontSize(getTypography(useFontScale()).button.fontSize, fontScale);

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodyBold">{label}</AppText>
      {hint ? <AppText color={colors.textSecondary}>{hint}</AppText> : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        allowFontScaling={false}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { fontSize, height: Math.max(MIN_TOUCH_SIZE, Math.round(fontSize * 2.4)) },
          error ? styles.inputError : null,
        ]}
        {...rest}
      />
      {error ? (
        <AppText color={colors.danger} accessibilityLiveRegion="polite">
          ⚠️ {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  input: {
    paddingVertical: 0,
    paddingHorizontal: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 3,
  },
});
