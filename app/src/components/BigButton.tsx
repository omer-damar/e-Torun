import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, MIN_TOUCH_SIZE, radius, spacing } from '@/theme';
import { spokenText } from '@/utils/a11y';
import { AppText } from './AppText';

export type BigButtonVariant = 'primary' | 'danger' | 'neutral';

type Props = {
  title: string;
  onPress: () => void;
  /** Başlığın altındaki ikinci satır (ör. "Sıradaki: 20:00 Tansiyon ilacı"). */
  subtitle?: string;
  /** Emoji ikon. Yalnızca görsel destek; anlam her zaman metinle de verilir. */
  icon?: string;
  variant?: BigButtonVariant;
  /** Verilmezse başlık + alt metin okunur. */
  accessibilityLabel?: string;
  /** VoiceOver'a basınca ne olacağını söyler (ör. "İlaç listesini açar"). */
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const variantStyles: Record<BigButtonVariant, { background: string; text: string; border: string }> = {
  primary: { background: colors.primary, text: colors.textOnColor, border: colors.primary },
  danger: { background: colors.danger, text: colors.textOnColor, border: colors.danger },
  neutral: { background: colors.neutralBackground, text: colors.text, border: colors.border },
};

export function BigButton({
  title,
  onPress,
  subtitle,
  icon,
  variant = 'primary',
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
  testID,
}: Props) {
  const palette = variantStyles[variant];
  // Başlıkta/alt metinde emoji olabilir (ör. "⚠️ 2 ilacınız bitmek üzere"); VoiceOver onları okumasın.
  const label = spokenText(accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title));

  const handlePress = () => {
    // Titreşim desteklenmeyen cihazda sessizce atlanır; asıl işlem engellenmez.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <View style={styles.iconBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <AppText variant="title" style={styles.icon}>
            {icon}
          </AppText>
        </View>
      ) : null}
      <View style={styles.textBox}>
        <AppText variant="button" color={palette.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="buttonSub" color={palette.text}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 48,
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
    lineHeight: 44,
  },
  textBox: {
    // flex: 1 değil: genişliği içeriğe göre belirlenen butonlarda (ör. Ayarlar) metin kutusu 0'a çöküyordu.
    flexShrink: 1,
    gap: spacing.xs,
  },
});
