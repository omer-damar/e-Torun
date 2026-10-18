import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { validateContact, type ContactErrors, type ContactInput } from '@/features/emergency/contacts';
import { formatPhone } from '@/features/emergency/phone';
import { pickFromAddressBook } from '@/features/emergency/pickFromAddressBook';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { AppTextInput } from './AppTextInput';
import { BigButton } from './BigButton';

type Props = {
  initial?: ContactInput;
  submitLabel: string;
  onSubmit: (contact: ContactInput) => void | Promise<void>;
};

/** Yakın kişi formu (kurulum, ayarlar ve acil yardım ekranlarında ortak). */
export function ContactForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [relation, setRelation] = useState(initial?.relation ?? '');
  const [phone, setPhone] = useState(initial ? formatPhone(initial.phone) : '');
  const [errors, setErrors] = useState<ContactErrors>({});
  const relationRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const [pickedInfo, setPickedInfo] = useState<string | null>(null);

  const submit = async () => {
    const result = validateContact({ name, relation, phone });
    setErrors(result.errors);
    if (result.contact) await onSubmit(result.contact);
  };

  const pick = async () => {
    let picked;
    try {
      picked = await pickFromAddressBook();
    } catch {
      setPickedInfo(null);
      setErrors({ phone: 'Rehber açılamadı. Bilgileri elle yazabilirsiniz.' });
      return;
    }
    if (!picked) return; // Kullanıcı vazgeçti; form olduğu gibi kalır.
    if (picked.name) setName(picked.name);
    if (picked.phone) {
      setPhone(formatPhone(picked.phone));
      setErrors({});
      setPickedInfo('Rehberden dolduruldu. Yakınlığı yazıp bilgileri kontrol edin, sonra Kaydet\'e dokunun.');
      relationRef.current?.focus();
    } else {
      setPhone('');
      setPickedInfo(null);
      setErrors({
        phone: picked.hasAnyNumber
          ? 'Bu kişinin rehberde cep numarası yok. Cep numarasını elle yazın.'
          : 'Bu kişinin rehberde numarası yok. Numarayı elle yazın.',
      });
    }
  };

  return (
    <View style={styles.form}>
      <BigButton
        title="Rehberden seç"
        icon="📒"
        variant="neutral"
        onPress={pick}
        accessibilityHint="Telefonunuzun rehberi açılır, seçtiğiniz kişinin adı ve numarası doldurulur"
        testID="contact-pick"
      />
      {pickedInfo ? <AppText color={colors.success}>✅ {pickedInfo}</AppText> : null}
      <AppText color={colors.textSecondary}>ya da elle yazın:</AppText>
      <AppTextInput
        label="Adı"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Örn. Ayşe"
        autoCapitalize="words"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => relationRef.current?.focus()}
      />
      <AppTextInput
        ref={relationRef}
        label="Yakınlığı (isteğe bağlı)"
        value={relation}
        onChangeText={setRelation}
        placeholder="Örn. Kızım"
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <AppTextInput
        ref={phoneRef}
        label="Telefon numarası"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        placeholder="0555 123 45 67"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <BigButton title={submitLabel} icon="💾" onPress={submit} testID="contact-submit" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
