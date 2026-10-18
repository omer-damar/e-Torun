import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BigButton, ConfirmDialog, OptionButton, ScreenContainer } from '@/components';
import { contactTitle, MAX_CONTACTS } from '@/features/emergency/contacts';
import { formatPhone } from '@/features/emergency/phone';
import { useAppData } from '@/storage/AppDataProvider';
import { colors, spacing } from '@/theme';

type DeleteStep = 'none' | 'first' | 'second';

/** A3 — Ayarlar (PROJE_PLANI.md bölüm 5). */
export default function SettingsScreen() {
  const { settings, contacts, updateSettings, resetAll } = useAppData();
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('none');

  return (
    <ScreenContainer title="Ayarlar">
      <Section title="Yazı boyutu">
        <OptionButton
          label="Büyük"
          selected={settings.fontScale === 'buyuk'}
          onPress={() => updateSettings({ fontScale: 'buyuk' })}
          testID="font-buyuk"
        />
        <OptionButton
          label="Çok büyük"
          selected={settings.fontScale === 'cokBuyuk'}
          onPress={() => updateSettings({ fontScale: 'cokBuyuk' })}
          testID="font-cokBuyuk"
        />
        <View style={styles.preview} accessible accessibilityLabel="Önizleme: İlaç saatiniz geldi.">
          <AppText color={colors.textSecondary}>Önizleme:</AppText>
          <AppText>İlaç saatiniz geldi.</AppText>
        </View>
      </Section>

      <Section title="Sesli okuma">
        <OptionButton
          label="Açık"
          description="Mesaj sonuçları sesli okunabilir."
          selected={settings.speechEnabled}
          onPress={() => updateSettings({ speechEnabled: true })}
        />
        <OptionButton label="Kapalı" selected={!settings.speechEnabled} onPress={() => updateSettings({ speechEnabled: false })} />
      </Section>

      <Section title="Yakınlarım">
        {contacts.length === 0 ? <AppText>Henüz kimse eklenmedi.</AppText> : null}
        {contacts.map((contact) => (
          <BigButton
            key={contact.id}
            icon="👤"
            title={contactTitle(contact)}
            subtitle={formatPhone(contact.phone)}
            variant="neutral"
            onPress={() => router.push({ pathname: '/kisi', params: { id: contact.id } })}
            accessibilityHint="Kişiyi düzenler veya siler"
          />
        ))}
        {contacts.length < MAX_CONTACTS ? (
          <BigButton icon="➕" title="Kişi ekle" variant="neutral" onPress={() => router.push('/kisi')} />
        ) : (
          <AppText color={colors.textSecondary}>En fazla {MAX_CONTACTS} kişi eklenebilir.</AppText>
        )}
      </Section>

      <Section title="Hakkında">
        <AppText>Yanımda, sürüm {Constants.expoConfig?.version ?? '1.0.0'}</AppText>
        <AppText>🔒 Verileriniz yalnızca bu telefonda saklanır. İnternete gönderilmez.</AppText>
        <AppText>💊 İlaç dozunu doktorunuz belirler, bu uygulama yalnızca hatırlatır.</AppText>
      </Section>

      <Section title="Verilerim">
        <BigButton
          icon="🗑️"
          title="Tüm verilerimi sil"
          variant="danger"
          onPress={() => setDeleteStep('first')}
          accessibilityHint="İki kez onay sorulur"
          testID="delete-all"
        />
      </Section>

      <ConfirmDialog
        visible={deleteStep === 'first'}
        title="Tüm verileriniz silinsin mi?"
        message="Adınız, yakınlarınız, ilaçlarınız ve hatırlatmalarınız silinecek."
        confirmLabel="Evet, devam et"
        confirmVariant="danger"
        onCancel={() => setDeleteStep('none')}
        onConfirm={() => setDeleteStep('second')}
      />
      <ConfirmDialog
        visible={deleteStep === 'second'}
        title="Son onay"
        message="Bu işlem geri alınamaz. Silmek istediğinizden emin misiniz?"
        confirmLabel="Evet, hepsini sil"
        cancelLabel="Hayır, vazgeç"
        confirmVariant="danger"
        onCancel={() => setDeleteStep('none')}
        onConfirm={async () => {
          setDeleteStep('none');
          await resetAll();
          router.replace('/');
        }}
      />
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="button" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  preview: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    gap: spacing.xs,
  },
});
