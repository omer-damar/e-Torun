import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BigButton, ConfirmDialog, OptionButton, ScreenContainer } from '@/components';
import { contactTitle, MAX_CONTACTS, type Contact } from '@/features/emergency/contacts';
import { formatPhone } from '@/features/emergency/phone';
import { useAppData } from '@/storage/AppDataProvider';
import { borderWidth, colors, radius, spacing } from '@/theme';

type DeleteStep = 'none' | 'first' | 'second';

/** A3 — Ayarlar (PROJE_PLANI.md bölüm 5). */
export default function SettingsScreen() {
  const { settings, contacts, updateSettings, deleteContact, resetAll } = useAppData();
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('none');
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  return (
    <ScreenContainer title="Ayarlar">
      {/* Yakınlar yalnızca burada yönetilir (Acil Yardım ekranı yalnızca arama içindir). */}
      <Section title="Yakınlarım">
        <AppText color={colors.textSecondary}>Acil Yardım ekranında bu kişileri tek dokunuşla arayabilirsiniz.</AppText>
        {contacts.length === 0 ? <AppText>Henüz kimse eklenmedi.</AppText> : null}
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <AppText variant="button">👤 {contactTitle(contact)}</AppText>
            <AppText>{formatPhone(contact.phone)}</AppText>
            <View style={styles.contactActions}>
              <BigButton
                icon="✏️"
                title="Düzenle"
                variant="neutral"
                style={styles.actionButton}
                onPress={() => router.push({ pathname: '/kisi', params: { id: contact.id } })}
                accessibilityLabel={`${contactTitle(contact)} kişisini düzenle`}
                testID={`edit-${contact.id}`}
              />
              <BigButton
                icon="🗑️"
                title="Sil"
                variant="danger"
                style={styles.actionButton}
                onPress={() => setContactToDelete(contact)}
                accessibilityLabel={`${contactTitle(contact)} kişisini sil`}
                accessibilityHint="Onay sorulur"
                testID={`delete-${contact.id}`}
              />
            </View>
          </View>
        ))}
        {contacts.length < MAX_CONTACTS ? (
          <BigButton icon="➕" title="Kişi ekle" onPress={() => router.push('/kisi')} testID="add-contact" />
        ) : (
          <AppText color={colors.textSecondary}>En fazla {MAX_CONTACTS} kişi eklenebilir. Yeni biri için önce birini silin.</AppText>
        )}
      </Section>

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
      <ConfirmDialog
        visible={contactToDelete !== null}
        title="Kişi silinsin mi?"
        message={contactToDelete ? `${contactTitle(contactToDelete)} yakınlarınızdan silinecek.` : ''}
        confirmLabel="Evet, sil"
        cancelLabel="Hayır"
        confirmVariant="danger"
        onCancel={() => setContactToDelete(null)}
        onConfirm={async () => {
          const target = contactToDelete;
          setContactToDelete(null);
          if (target) await deleteContact(target.id);
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
  contactCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  contactActions: {
    // Çok büyük yazıda iki buton yan yana sığmazsa alt alta geçer.
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.buttonGap,
    marginTop: spacing.xs,
  },
  actionButton: {
    flexGrow: 1,
  },
  preview: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.neutralBackground,
    gap: spacing.xs,
  },
});
