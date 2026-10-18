import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatTime, parseTime } from '@/features/medications/schedule';
import { borderWidth, colors, MIN_TOUCH_SIZE, radius, spacing } from '@/theme';
import { AppText } from './AppText';

const MINUTE_STEP = 5;

type Props = {
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
  /** Ekran okuyucu için, ör. "1. saat". */
  label?: string;
};

/** Saati değiştir; 23'ten sonra 0'a, 0'dan önce 23'e döner. */
export function stepHour(time: string, delta: number): string {
  const { hour, minute } = parseTime(time);
  return formatTime((hour + delta + 24) % 24, minute);
}

/** Dakikayı 5'er değiştir; 5'in katı değilse önce en yakın kata yuvarlar. Saati değiştirmez. */
export function stepMinute(time: string, delta: number): string {
  const { hour, minute } = parseTime(time);
  const rounded = Math.round(minute / MINUTE_STEP) * MINUTE_STEP;
  return formatTime(hour, (((rounded + delta * MINUTE_STEP) % 60) + 60) % 60);
}

/**
 * Büyük +/− düğmeli saat seçici (kaydırma tekerleği yok; yaşlı kullanıcı için tek dokunuş).
 * Saat ve dakika ayrı sütunlarda; her düğme ≥ 64pt.
 */
export function TimePickerBig({ value, onChange, label }: Props) {
  const { hour, minute } = parseTime(value);
  const spoken = `${label ? `${label}: ` : ''}saat ${hour}${minute ? `, ${minute} geçe` : ' tam'}`;

  const change = (next: string) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View style={styles.wrapper} accessible={false}>
      <AppText variant="title" style={styles.value} accessibilityLabel={spoken} accessibilityLiveRegion="polite">
        {value}
      </AppText>
      <View style={styles.columns}>
        <Column
          title="Saat"
          onIncrease={() => change(stepHour(value, 1))}
          onDecrease={() => change(stepHour(value, -1))}
          increaseLabel="Saati bir artır"
          decreaseLabel="Saati bir azalt"
        />
        <Column
          title="Dakika"
          onIncrease={() => change(stepMinute(value, 1))}
          onDecrease={() => change(stepMinute(value, -1))}
          increaseLabel="Dakikayı beş artır"
          decreaseLabel="Dakikayı beş azalt"
        />
      </View>
    </View>
  );
}

function Column(props: {
  title: string;
  onIncrease: () => void;
  onDecrease: () => void;
  increaseLabel: string;
  decreaseLabel: string;
}) {
  return (
    <View style={styles.column}>
      <AppText variant="bodyBold" importantForAccessibility="no" accessibilityElementsHidden>
        {props.title}
      </AppText>
      <StepButton symbol="+" label={props.increaseLabel} onPress={props.onIncrease} />
      <StepButton symbol="−" label={props.decreaseLabel} onPress={props.onDecrease} />
    </View>
  );
}

function StepButton({ symbol, label, onPress }: { symbol: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}
    >
      <AppText variant="title" color={colors.textOnColor}>
        {symbol}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  value: {
    textAlign: 'center',
    fontSize: 56,
    lineHeight: 68,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  step: {
    alignSelf: 'stretch',
    minHeight: MIN_TOUCH_SIZE + 8,
    minWidth: MIN_TOUCH_SIZE,
    borderRadius: radius.lg,
    borderWidth,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
