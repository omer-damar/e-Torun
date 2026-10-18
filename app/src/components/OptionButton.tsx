import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { borderWidth, colors, MIN_TOUCH_SIZE, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  description?: string;
  accessibilityHint?: string;
  testID?: string;
};

/**
 * Seçeneklerden biri (ör. Büyük / Çok büyük). Seçili olduğu yalnızca renkle değil,
 * ✓ işareti ve "Seçili" yazısıyla da belirtilir.
 */
export function OptionButton({ label, selected, onPress, description, accessibilityHint, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => [styles.base, selected ? styles.selected : styles.unselected, pressed && styles.pressed]}
    >
      <View style={[styles.mark, selected && styles.markSelected]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {selected ? (
          <AppText variant="bodyBold" color={colors.textOnColor}>
            ✓
          </AppText>
        ) : null}
      </View>
      <View style={styles.textBox}>
        <AppText variant="button">{label}</AppText>
        {description ? <AppText color={colors.textSecondary}>{description}</AppText> : null}
        {selected ? (
          <AppText variant="bodyBold" color={colors.primary}>
            Seçili
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  unselected: {
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selected: {
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: colors.neutralBackground,
  },
  pressed: {
    opacity: 0.85,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textBox: {
    flexShrink: 1,
    gap: spacing.xs,
  },
});
