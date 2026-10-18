import { normalizePhone } from './phone';

/** iOS rehber seçicisinden gelen kişinin ihtiyaç duyduğumuz kısmı (expo-contacts/legacy biçimi). */
export type PickedPhone = { number?: string; label?: string; isPrimary?: boolean };
export type PickedContact = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: PickedPhone[];
};

export type AddressBookResult = {
  name: string;
  /** Geçerli cep numarası ("05XXXXXXXXX") ya da yoksa `null`. */
  phone: string | null;
  /** Kişinin rehberde hiç numarası var mı (cep olmayanlar dahil)? Hata mesajını seçmek için. */
  hasAnyNumber: boolean;
};

const MOBILE_LABEL = /mobile|iphone|cep|gsm|cell/i;

function rank(phone: PickedPhone): number {
  // Küçük olan önce: birincil numara, sonra "cep/mobile" etiketli, sonra diğerleri.
  return (phone.isPrimary ? 0 : 2) + (phone.label && MOBILE_LABEL.test(phone.label) ? 0 : 1);
}

/**
 * Rehberden seçilen kişiden ad ve uygun cep numarasını çıkarır.
 * Birden fazla numara varsa birincil / "cep" etiketli olan tercih edilir; sabit hatlar atlanır.
 */
export function fromAddressBook(contact: PickedContact): AddressBookResult {
  const name = (contact.name ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ')).trim();
  const phones = contact.phoneNumbers ?? [];
  const mobile = [...phones]
    .sort((a, b) => rank(a) - rank(b))
    .map((p) => (p.number ? normalizePhone(p.number) : null))
    .find((p): p is string => p !== null);

  return {
    name,
    phone: mobile ?? null,
    hasAnyNumber: phones.some((p) => Boolean(p.number?.trim())),
  };
}
