// Yeni `Contact.presentPicker()` yalnızca kişi kimliği döndürüyor; numarayı okumak için rehber
// izni (iOS "Rehberinize erişmek istiyor") gerekiyor. Eski API, iOS sistem seçicisinin verdiği
// kişiyi doğrudan döndürür: izin istemez ve uygulama yalnızca seçilen kişiyi görür.
import { presentContactPickerAsync } from 'expo-contacts/legacy';

import { fromAddressBook, type AddressBookResult } from './addressBook';

/** Sistem rehber seçicisini açar. Vazgeçilirse `null`, açılamazsa hata fırlatır. */
export async function pickFromAddressBook(): Promise<AddressBookResult | null> {
  const contact = await presentContactPickerAsync();
  return contact ? fromAddressBook(contact) : null;
}
