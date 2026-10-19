import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, AppTextInput, BigButton, ContactForm, Notice, ScreenContainer } from '@/components';
import { contactTitle, newContactId } from '@/features/emergency/contacts';
import { formatPhone } from '@/features/emergency/phone';
import { requestNotificationPermission } from '@/features/notifications/permission';
import { MAX_NAME_LENGTH } from '@/features/settings/settings';
import { useAppData } from '@/storage/AppDataProvider';
import { APP_NAME, NOT_OFFICIAL_NOTICE } from '@/appInfo';
import { colors, spacing } from '@/theme';

const STEP_TITLES = ['Hoş geldiniz', 'Size nasıl hitap edelim?', 'Yakınınızı ekleyin', 'Bildirim izni'];

/** A2 — ilk açılış sihirbazı (PROJE_PLANI.md bölüm 5). */
export default function OnboardingScreen() {
  const { settings, contacts, updateSettings, saveContact } = useAppData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.userName);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    await updateSettings({ onboardingDone: true });
    router.replace('/');
  };

  const askPermission = async () => {
    const state = await requestNotificationPermission();
    if (state === 'granted') {
      await finish();
    } else {
      setPermissionDenied(true);
    }
  };

  const progress = `Adım ${step + 1} / ${STEP_TITLES.length}`;
  const backButton =
    step > 0 ? <BigButton title="Geri" icon="⬅️" variant="neutral" onPress={back} accessibilityHint="Önceki adıma döner" /> : null;

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === 0) {
    body = (
      <>
        <AppText>{APP_NAME}, günlük hayatınızı kolaylaştırmak için üç şey yapar:</AppText>
        <Feature icon="💊" title="İlaçlarınızı hatırlatır" text="İlaç saatinde telefonunuz size haber verir." />
        <Feature icon="📞" title="Tek dokunuşla yardım çağırır" text="Yakınınızı veya 112'yi hızlıca arayabilirsiniz." />
        <Feature icon="✉️" title="Şüpheli mesajları kontrol eder" text="Dolandırıcılık olabilecek mesajlar için sizi uyarır." />
        <AppText color={colors.textSecondary}>Bilgileriniz yalnızca bu telefonda saklanır.</AppText>
        <AppText color={colors.textSecondary}>ℹ️ {NOT_OFFICIAL_NOTICE}</AppText>
      </>
    );
    footer = <BigButton title="Başlayalım" icon="▶️" onPress={next} testID="onboarding-next" />;
  } else if (step === 1) {
    body = (
      <AppTextInput
        label="Adınız (isteğe bağlı)"
        hint="Ana ekranda sizi bu adla selamlarız."
        value={name}
        onChangeText={setName}
        maxLength={MAX_NAME_LENGTH}
        placeholder="Örn. Fatma"
        autoCapitalize="words"
        textContentType="givenName"
        returnKeyType="done"
      />
    );
    footer = (
      <View style={styles.footer}>
        <BigButton
          title="İleri"
          icon="▶️"
          onPress={async () => {
            await updateSettings({ userName: name.trim() });
            next();
          }}
          testID="onboarding-next"
        />
        {backButton}
      </View>
    );
  } else if (step === 2) {
    body =
      contacts.length > 0 ? (
        <>
          {contacts.map((c) => (
            <AppText key={c.id} variant="bodyBold">
              ✅ {contactTitle(c)}: {formatPhone(c.phone)}
            </AppText>
          ))}
          <AppText color={colors.textSecondary}>Daha fazla kişiyi sonra Ayarlar'dan ekleyebilirsiniz.</AppText>
        </>
      ) : (
        <>
          <AppText>Acil durumda tek dokunuşla arayabileceğiniz bir yakınınızı ekleyin.</AppText>
          <ContactForm
            submitLabel="Kaydet"
            onSubmit={async (input) => {
              await saveContact({ id: newContactId(), ...input });
            }}
          />
        </>
      );
    footer = (
      <View style={styles.footer}>
        <BigButton
          title={contacts.length > 0 ? 'İleri' : 'Şimdilik atla'}
          icon="▶️"
          variant={contacts.length > 0 ? 'primary' : 'neutral'}
          onPress={next}
          accessibilityHint={contacts.length > 0 ? undefined : 'Kişiyi daha sonra Ayarlar ekranından ekleyebilirsiniz'}
          testID="onboarding-next"
        />
        {backButton}
      </View>
    );
  } else {
    body = (
      <>
        <AppText variant="bodyBold">İlaç saatlerinde size haber verebilmemiz için izin vermeniz gerekiyor.</AppText>
        <AppText>Birazdan telefonunuz "Bildirim göndermek istiyor" diye soracak. Lütfen "İzin Ver"e dokunun.</AppText>
        {permissionDenied ? (
          <Notice
            title="Bildirim izni verilmedi"
            message="İlaç hatırlatmaları çalışmaz. Dilediğiniz zaman telefonun Ayarlar uygulamasından açabilirsiniz."
          />
        ) : null}
      </>
    );
    footer = (
      <View style={styles.footer}>
        {permissionDenied ? (
          <BigButton title="Devam et" icon="▶️" onPress={finish} testID="onboarding-finish" />
        ) : (
          <BigButton title="İzin ver" icon="🔔" onPress={askPermission} testID="onboarding-permission" />
        )}
        {permissionDenied ? null : (
          <BigButton title="Şimdi değil" variant="neutral" onPress={finish} accessibilityHint="Bildirim izni vermeden devam eder" />
        )}
        {backButton}
      </View>
    );
  }

  return (
    <ScreenContainer title={STEP_TITLES[step]} showHomeButton={false} footer={footer}>
      <AppText color={colors.textSecondary} accessibilityLabel={`${step + 1}. adım, toplam ${STEP_TITLES.length}`}>
        {progress}
      </AppText>
      {body}
    </ScreenContainer>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={styles.feature} accessible accessibilityLabel={`${title}. ${text}`}>
      <AppText variant="title" style={styles.featureIcon}>
        {icon}
      </AppText>
      <View style={styles.featureText}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText>{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.buttonGap,
  },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 32,
    lineHeight: 40,
  },
  featureText: {
    flexShrink: 1,
    gap: spacing.xs,
  },
});
