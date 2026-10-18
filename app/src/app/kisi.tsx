import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BigButton, ConfirmDialog, ContactForm, Notice, ScreenContainer } from '@/components';
import { contactTitle, MAX_CONTACTS, newContactId } from '@/features/emergency/contacts';
import { useAppData } from '@/storage/AppDataProvider';

/** Yakın kişi ekle (`/kisi`) veya düzenle (`/kisi?id=...`). */
export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { contacts, saveContact, deleteContact } = useAppData();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existing = id ? contacts.find((c) => c.id === id) : undefined;
  const isEdit = Boolean(existing);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!isEdit && contacts.length >= MAX_CONTACTS) {
    return (
      <ScreenContainer title="Kişi ekle">
        <Notice
          title={`En fazla ${MAX_CONTACTS} kişi ekleyebilirsiniz`}
          message="Yeni birini eklemek için önce Ayarlar'dan bir kişiyi silin."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={isEdit ? 'Kişiyi düzenle' : 'Kişi ekle'}>
      <ContactForm
        initial={existing}
        submitLabel="Kaydet"
        onSubmit={async (input) => {
          const saved = await saveContact({ id: existing?.id ?? newContactId(), ...input });
          if (saved) close();
        }}
      />
      {existing ? (
        <>
          <BigButton
            title="Bu kişiyi sil"
            icon="🗑️"
            variant="danger"
            onPress={() => setConfirmDelete(true)}
            accessibilityHint="Onay sorulur"
          />
          <ConfirmDialog
            visible={confirmDelete}
            title="Kişi silinsin mi?"
            message={`${contactTitle(existing)} listeden silinecek.`}
            confirmLabel="Evet, sil"
            confirmVariant="danger"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              setConfirmDelete(false);
              await deleteContact(existing.id);
              close();
            }}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}
