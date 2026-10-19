import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, AppTextInput, BigButton, Notice, ScreenContainer } from '@/components';
import { MIN_MESSAGE_LENGTH } from '@/detector/decide';
import { setMessageToCheck } from '@/features/messages/messageBuffer';
import { colors } from '@/theme';

/** D1 — Mesajı yapıştır ve kontrol et (PROJE_PLANI.md bölüm 8). */
export default function MessageCheckScreen() {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const paste = async () => {
    try {
      const value = (await Clipboard.getStringAsync()).trim();
      if (!value) {
        setNotice('Kopyalanmış bir mesaj bulunamadı. Önce mesajı basılı tutup "Kopyala"ya dokunun.');
        return;
      }
      setText(value);
      setNotice(null);
    } catch {
      setNotice('Mesaj yapıştırılamadı. Kutuya basılı tutup "Yapıştır"a dokunarak da ekleyebilirsiniz.');
    }
  };

  const check = () => {
    const value = text.trim();
    if (Array.from(value).length < MIN_MESSAGE_LENGTH) {
      setNotice('Kontrol için mesaj çok kısa. Lütfen mesajın tamamını yapıştırın.');
      return;
    }
    setNotice(null);
    setMessageToCheck(value);
    router.push('/mesaj/sonuc');
  };

  return (
    <ScreenContainer title="Mesajı Kontrol Et">
      <AppText>
        Şüphelendiğiniz mesajı basılı tutup <AppText variant="bodyBold">Kopyala</AppText> deyin, sonra aşağıdaki
        butona dokunun.
      </AppText>
      <BigButton
        icon="📋"
        title="Panodan yapıştır"
        onPress={paste}
        accessibilityHint="Kopyaladığınız mesajı kutuya ekler"
        testID="paste"
      />
      <AppTextInput
        label="Mesaj"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setNotice(null);
        }}
        multiline
        placeholder="Mesaj burada görünecek. İsterseniz kendiniz de yazabilirsiniz."
        maxLength={2000}
      />
      {notice ? <Notice title={notice} /> : null}
      <BigButton
        icon="🔍"
        title="Kontrol Et"
        onPress={check}
        disabled={text.trim().length === 0}
        accessibilityHint="Mesajın dolandırıcılık riski olup olmadığını gösterir"
        testID="check"
      />
      {text ? (
        <BigButton icon="🧹" title="Temizle" variant="neutral" onPress={() => setText('')} testID="clear" />
      ) : null}
      <AppText color={colors.textSecondary}>
        🔒 Mesaj yalnızca bu telefonda kontrol edilir, hiçbir yere gönderilmez ve kaydedilmez.
      </AppText>
    </ScreenContainer>
  );
}
