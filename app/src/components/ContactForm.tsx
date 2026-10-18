import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { validateContact, type ContactErrors, type ContactInput } from '@/features/emergency/contacts';
import { formatPhone } from '@/features/emergency/phone';
import { spacing } from '@/theme';
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

  const submit = async () => {
    const result = validateContact({ name, relation, phone });
    setErrors(result.errors);
    if (result.contact) await onSubmit(result.contact);
  };

  return (
    <View style={styles.form}>
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
