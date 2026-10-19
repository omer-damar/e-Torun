import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText, BigButton, Notice, OptionButton, ScreenContainer } from '@/components';
import { decide, type RiskLevel } from '@/detector/decide';
import { contactTitle } from '@/features/emergency/contacts';
import { smsUrl } from '@/features/emergency/phone';
import { buildAskRelativeSms, speechText } from '@/features/messages/askRelative';
import { clearMessageToCheck, peekMessageToCheck } from '@/features/messages/messageBuffer';
import { useAppData } from '@/storage/AppDataProvider';
import { borderWidth, colors, radius, spacing } from '@/theme';

/** Türkçe, yaşlı kullanıcı için biraz yavaş. */
export const SPEECH_OPTIONS = { language: 'tr-TR', rate: 0.85 } as const;

const LEVEL_STYLE: Record<Exclude<RiskLevel, 'too_short'>, { icon: string; label: string; background: string; text: string }> = {
  red: { icon: '⛔', label: 'Yüksek risk', background: colors.danger, text: colors.textOnColor },
  yellow: { icon: '⚠️', label: 'Dikkat', background: colors.warningBackground, text: colors.warningText },
  green: { icon: '✅', label: 'Belirgin risk yok', background: colors.success, text: colors.textOnColor },
};

/** D2–D6 — Sonuç ekranı. Olasılık yüzde olarak gösterilmez (bölüm 8). */
export default function MessageResultScreen() {
  const { contacts, settings } = useAppData();
  // Mesaj ekran açılırken bellekten bir kez alınır; ekrandan çıkınca silinir.
  const [message] = useState(() => peekMessageToCheck());
  const decision = useMemo(() => (message ? decide(message) : null), [message]);
  const [speaking, setSpeaking] = useState(false);
  const [chosenContactId, setChosenContactId] = useState<string | undefined>();
  const contact = contacts.find((c) => c.id === chosenContactId) ?? contacts[0];

  useEffect(
    () => () => {
      Speech.stop().catch(() => {});
      clearMessageToCheck();
    },
    [],
  );

  if (!message || !decision) {
    return (
      <ScreenContainer title="Sonuç">
        <AppText>Kontrol edilecek mesaj bulunamadı.</AppText>
        <BigButton icon="✉️" title="Mesaj kontrol et" onPress={() => router.replace('/mesaj')} />
      </ScreenContainer>
    );
  }

  if (decision.level === 'too_short') {
    return (
      <ScreenContainer title="Sonuç">
        <Notice title={decision.title} message={decision.advice} />
        <BigButton icon="⬅️" title="Geri dön" variant="neutral" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  const style = LEVEL_STYLE[decision.level];

  const toggleSpeech = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(speechText([decision.title, decision.advice, decision.reasons.length ? 'Neden?' : '', ...decision.reasons]), {
      ...SPEECH_OPTIONS,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const askRelative = async () => {
    if (!contact) return;
    const body = buildAskRelativeSms({ contactName: contact.name, userName: settings.userName, message });
    try {
      await Linking.openURL(smsUrl(contact.phone, body));
    } catch {
      Alert.alert('Mesajlar açılamadı', 'Lütfen daha sonra tekrar deneyin.');
    }
  };

  return (
    <ScreenContainer title="Sonuç">
      <View
        style={[styles.banner, { backgroundColor: style.background }, decision.level === 'yellow' && styles.bannerBorder]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${style.label}. ${decision.title} ${decision.advice}`}
        testID={`result-${decision.level}`}
      >
        <AppText variant="title" color={style.text}>
          {style.icon} {style.label}
        </AppText>
        <AppText variant="button" color={style.text}>
          {decision.title}
        </AppText>
        <AppText variant="bodyBold" color={style.text}>
          {decision.advice}
        </AppText>
      </View>

      {decision.reasons.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="button" accessibilityRole="header">
            Neden?
          </AppText>
          {decision.reasons.map((reason) => (
            <AppText key={reason}>• {reason}</AppText>
          ))}
        </View>
      ) : null}

      {settings.speechEnabled ? (
        <BigButton
          icon={speaking ? '⏹️' : '🔊'}
          title={speaking ? 'Okumayı durdur' : 'Sesli oku'}
          variant="neutral"
          onPress={toggleSpeech}
          testID="speak"
        />
      ) : null}

      <View style={styles.section}>
        <AppText variant="button" accessibilityRole="header">
          👨‍👩‍👧 Yakınıma sor
        </AppText>
        {contacts.length === 0 ? (
          <AppText color={colors.textSecondary}>Henüz yakın eklenmedi. Ayarlar'dan ekleyebilirsiniz.</AppText>
        ) : (
          <>
            {contacts.length > 1
              ? contacts.map((c) => (
                  <OptionButton
                    key={c.id}
                    label={contactTitle(c)}
                    selected={c.id === contact?.id}
                    onPress={() => setChosenContactId(c.id)}
                  />
                ))
              : null}
            <BigButton
              icon="✉️"
              title={`${contact!.name} kişisine sor`}
              subtitle="Mesaj hazır açılır, Gönder'e siz basarsınız"
              onPress={askRelative}
              testID="ask-relative"
            />
          </>
        )}
      </View>

      <View style={styles.quote} accessible accessibilityLabel={`Kontrol edilen mesaj: ${message}`}>
        <AppText color={colors.textSecondary}>Kontrol edilen mesaj:</AppText>
        <AppText numberOfLines={6}>{message}</AppText>
      </View>

      <BigButton icon="🔍" title="Başka mesaj kontrol et" variant="neutral" onPress={() => router.back()} />
      <AppText color={colors.textSecondary}>
        Bu kontrol her zaman doğru sonuç vermeyebilir. Şüphe duyarsanız işlem yapmadan önce yakınınıza danışın.
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  bannerBorder: {
    borderWidth,
    borderColor: colors.warningText,
  },
  section: {
    gap: spacing.sm,
  },
  quote: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.neutralBackground,
  },
});
