import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, BigButton, ConfirmDialog, ScreenContainer } from '@/components';
import { callNumber, EMERGENCY_NUMBER } from '@/features/emergency/call';
import { contactTitle } from '@/features/emergency/contacts';
import { formatPhone, phoneForSpeech } from '@/features/emergency/phone';
import { useAppData } from '@/storage/AppDataProvider';
import { colors } from '@/theme';

/** C1–C2 — Acil yardım (PROJE_PLANI.md bölüm 7). */
export default function EmergencyScreen() {
  const { contacts } = useAppData();
  const [confirm112, setConfirm112] = useState(false);

  return (
    <ScreenContainer title="Acil Yardım">
      {/* Bu ekran yalnızca arama içindir; yakınlar Ayarlar > Yakınlarım'dan yönetilir. */}
      {contacts.length === 0 ? (
        <>
          <AppText>Henüz yakın eklenmedi. Yakınlarınızı Ayarlar ekranından ekleyebilirsiniz.</AppText>
          <BigButton
            icon="⚙️"
            title="Ayarlar'a git"
            variant="neutral"
            onPress={() => router.push('/ayarlar')}
            accessibilityHint="Yakınlarım bölümünden kişi ekleyebilirsiniz"
          />
        </>
      ) : (
        contacts.map((contact) => (
          <BigButton
            key={contact.id}
            icon="📞"
            title={contactTitle(contact)}
            subtitle={formatPhone(contact.phone)}
            onPress={() => callNumber(contact.phone)}
            accessibilityLabel={`${contactTitle(contact)} kişisini ara. ${phoneForSpeech(contact.phone)}`}
            accessibilityHint="Telefon uygulaması açılır"
            testID={`call-${contact.id}`}
          />
        ))
      )}

      <AppText color={colors.textSecondary}>Hayati tehlike varsa:</AppText>
      <BigButton
        icon="🚑"
        title="112 ACİL"
        subtitle="Acil Çağrı Merkezi"
        variant="danger"
        onPress={() => setConfirm112(true)}
        accessibilityLabel="112 Acil Çağrı Merkezini ara"
        accessibilityHint="Önce onay sorulur"
        testID="call-112"
      />

      <ConfirmDialog
        visible={confirm112}
        title="112 aranacak"
        message="112 Acil Çağrı Merkezi aranacak. Emin misiniz?"
        confirmLabel="Evet, ara"
        cancelLabel="Hayır"
        confirmVariant="danger"
        onCancel={() => setConfirm112(false)}
        onConfirm={() => {
          setConfirm112(false);
          callNumber(EMERGENCY_NUMBER);
        }}
      />
    </ScreenContainer>
  );
}
