import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText, BigButton, Notice, OptionButton, ScreenContainer } from '@/components';
import { contactTitle } from '@/features/emergency/contacts';
import { smsUrl } from '@/features/emergency/phone';
import { buildRefillSms, describeDaysLeft, getDaysLeft } from '@/features/medications/stock';
import { useAppData } from '@/storage/AppDataProvider';
import { borderWidth, colors, radius, spacing } from '@/theme';

/**
 * MHRS uygulamasını doğrudan açmanın güvenilir bir yolu yok: mhrs.gov.tr'de apple-app-site-association
 * dosyası olsa da uygulama evrensel bağlantıları fiilen sahiplenmiyor (iPhone'da, www'li ve www'suz
 * adreste Notlar'da basılı tutunca "MHRS'de Aç" çıkmıyor) ve belgelenmiş bir URL şeması da yok.
 * Bu yüzden uygulama, App Store sayfası üzerinden açılır: yüklüyse "Aç", değilse "Al" görünür.
 * Kimlik (id) kullanılır, ad değil: mağazadaki adı "MHRS"ten "CDAS"a değişti
 * (paket tr.gov.saglik.MHRSMOBIL, yayıncı T.C. Sağlık Bakanlığı; itunes lookup ile doğrulandı).
 */
export const MHRS_APP_STORE_URL = 'https://apps.apple.com/tr/app/id1539508996';
/** İnternetteki "MHRS | Randevu Al" sayfası. */
export const MHRS_WEB_URL = 'https://mhrs.gov.tr/vatandas/';
export const MHRS_PHONE = '182';

async function open(url: string, failTitle: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(failTitle, 'Lütfen daha sonra tekrar deneyin.');
  }
}

/** B7 — İlaç bitmeden reçete için randevu: ALO 182, MHRS veya yakına hazır SMS. */
export default function RefillAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, contacts, settings } = useAppData();
  const med = medications.find((m) => m.id === id);
  // Kullanıcının seçimi yoksa: ilaçta kayıtlı yakın, o da yoksa ilk yakın. Her çizimde hesaplanır;
  // böylece ekran veriler yüklenmeden açılsa da (bildirimden soğuk açılış) doğru kişi seçilir.
  const [chosenId, setContactId] = useState<string | undefined>();
  const contactId =
    [chosenId, med?.refill?.contactId, contacts[0]?.id].find((cid) => cid && contacts.some((c) => c.id === cid));

  if (!med) {
    return (
      <ScreenContainer title="Randevu alın">
        <AppText>İlaç bulunamadı.</AppText>
      </ScreenContainer>
    );
  }

  const contact = contacts.find((c) => c.id === contactId);
  const message = contact
    ? buildRefillSms({
        medicationName: med.name,
        daysLeft: getDaysLeft(med),
        contactName: contact.name,
        userName: settings.userName,
        department: med.refill?.department,
        doctor: med.refill?.doctor,
        hospital: med.refill?.hospital,
      })
    : null;
  const details = [med.refill?.department, med.refill?.doctor && `Doktor: ${med.refill.doctor}`, med.refill?.hospital].filter(Boolean);

  return (
    <ScreenContainer title="Randevu alın">
      <AppText variant="bodyBold">{describeDaysLeft(med, new Date()) ?? `${med.name} için reçete randevusu`}</AppText>
      <AppText>İlacınız bitmeden doktorunuza görünüp reçete yazdırın.</AppText>
      {details.length > 0 ? <AppText color={colors.textSecondary}>{details.join(' · ')}</AppText> : null}

      <BigButton
        icon="📞"
        title="ALO 182'yi ara"
        subtitle="Telefonla randevu (MHRS çağrı merkezi)"
        onPress={() => open(`tel:${MHRS_PHONE}`, 'Arama başlatılamadı')}
        accessibilityHint="Telefon uygulaması açılır"
        testID="call-182"
      />
      <BigButton
        icon="📱"
        title="MHRS uygulamasını aç"
        subtitle="App Store açılır: yüklüyse “Aç”a dokunun (adı CDAS olarak görünebilir)"
        variant="neutral"
        onPress={() => open(MHRS_APP_STORE_URL, 'App Store açılamadı')}
        accessibilityHint="App Store'da MHRS sayfası açılır. Uygulama yüklüyse Aç düğmesine dokunun, değilse Al ile indirebilirsiniz"
        testID="open-mhrs-app"
      />
      <BigButton
        icon="🌐"
        title="MHRS internet sitesi"
        subtitle="Randevu sayfası tarayıcıda açılır"
        variant="neutral"
        onPress={() => open(MHRS_WEB_URL, 'MHRS açılamadı')}
        accessibilityHint="Safari'de MHRS randevu sayfası açılır"
        testID="open-mhrs-web"
      />

      <AppText variant="button" accessibilityRole="header">
        👨‍👩‍👧 Yakınımdan randevu iste
      </AppText>
      {contacts.length === 0 ? (
        <Notice title="Henüz yakın eklenmedi" message="Yakınlarınızı Ayarlar ekranından ekleyebilirsiniz.">
          <BigButton icon="⚙️" title="Ayarlar'a git" variant="neutral" onPress={() => router.push('/ayarlar')} />
        </Notice>
      ) : (
        <>
          {contacts.length > 1
            ? contacts.map((c) => (
                <OptionButton key={c.id} label={contactTitle(c)} selected={c.id === contactId} onPress={() => setContactId(c.id)} />
              ))
            : null}
          {message && contact ? (
            <>
              <View style={styles.preview} accessible accessibilityLabel={`Gönderilecek mesaj: ${message}`}>
                <AppText color={colors.textSecondary}>{contactTitle(contact)} kişisine gidecek mesaj:</AppText>
                <AppText>{message}</AppText>
              </View>
              <BigButton
                icon="✉️"
                title="Mesajı hazırla"
                subtitle="Mesajlar açılır, Gönder'e siz basarsınız"
                onPress={() => open(smsUrl(contact.phone, message), 'Mesajlar açılamadı')}
                testID="send-sms"
              />
            </>
          ) : null}
        </>
      )}
      <AppText color={colors.textSecondary}>
        Uygulama mesajı kendiliğinden göndermez. Mesajda kimlik numaranız yer almaz.
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.neutralBackground,
  },
});
