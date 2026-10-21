import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RiskLevel } from '@/detector/decide';
import { askAi, COMPARISON_TEXT, compareOpinions, type AiResult, type AiLevel } from '@/features/messages/aiOpinion';
import { borderWidth, colors, radius, spacing } from '@/theme';
import { useAnnounce } from '@/utils/a11y';
import { AppText } from './AppText';
import { BigButton } from './BigButton';
import { Notice } from './Notice';

const AI_LEVEL_TEXT: Record<AiLevel, string> = {
  red: '⛔ Yüksek risk',
  yellow: '⚠️ Dikkat',
  green: '✅ Belirgin risk yok',
  ad: '📢 Reklam mesajı',
};

type Props = {
  message: string;
  localLevel: Exclude<RiskLevel, 'too_short'>;
  /** Testler için. */
  ask?: (message: string) => Promise<AiResult>;
};

type State = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; result: AiResult };

/**
 * D8 — İsteğe bağlı ikinci görüş. Telefondaki sonuç hiçbir zaman değişmez; yapay zekânın cevabı ayrı
 * bir kartta, iki görüşün karşılaştırmasıyla birlikte gösterilir.
 */
export function AiSecondOpinion({ message, localLevel, ask = askAi }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const result = state.phase === 'done' ? state.result : null;
  const comparison = result?.status === 'ok' ? compareOpinions(localLevel, result.verdict.level) : null;
  useAnnounce(
    state.phase === 'loading'
      ? 'Yapay zekâya soruluyor.'
      : result?.status === 'ok' && comparison
        ? `Yapay zekânın görüşü: ${AI_LEVEL_TEXT[result.verdict.level]}. ${COMPARISON_TEXT[comparison]}`
        : null,
  );

  const run = async () => {
    setState({ phase: 'loading' });
    const answer = await ask(message);
    if (mounted.current) setState({ phase: 'done', result: answer });
  };

  if (state.phase === 'idle') {
    return (
      <BigButton
        icon="🤖"
        title="Yapay zekâya da sor"
        subtitle="Mesaj internete gönderilir; numaralar ve kodlar gizlenir"
        variant="neutral"
        onPress={run}
        accessibilityHint="İkinci bir görüş alır. Telefondaki sonuç değişmez."
        testID="ask-ai"
      />
    );
  }

  if (state.phase === 'loading') {
    return <AppText variant="bodyBold">🤖 Yapay zekâya soruluyor, lütfen bekleyin…</AppText>;
  }

  if (state.result.status === 'unavailable') {
    return (
      <Notice
        announce
        title="Yapay zekâya şu an ulaşılamadı"
        message="İnternet bağlantınızı kontrol edin. Yukarıdaki sonuç bu telefonda yapıldı ve geçerlidir."
      >
        <BigButton icon="🔄" title="Tekrar dene" variant="neutral" onPress={run} testID="ask-ai-retry" />
      </Notice>
    );
  }

  const { verdict } = state.result;
  return (
    <View style={styles.card} testID={`ai-${verdict.level}`}>
      <AppText variant="button" accessibilityRole="header">
        🤖 Yapay zekânın görüşü
      </AppText>
      <AppText variant="title">{AI_LEVEL_TEXT[verdict.level]}</AppText>
      {verdict.reasons.map((reason) => (
        <AppText key={reason}>• {reason}</AppText>
      ))}
      <AppText variant="bodyBold">{verdict.advice}</AppText>
      {comparison ? (
        <AppText variant="bodyBold" color={comparison === 'same' ? colors.text : colors.warningText}>
          {comparison === 'same' ? '' : '⚠️ '}
          {COMPARISON_TEXT[comparison]}
        </AppText>
      ) : null}
      <AppText color={colors.textSecondary}>Yapay zekâ da yanılabilir.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
});
