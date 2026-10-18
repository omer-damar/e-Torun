import { normalizePhone } from './phone';

export type Contact = {
  id: string;
  name: string;
  /** "Kızım", "Oğlum", "Komşum" ... */
  relation: string;
  /** Her zaman "05XXXXXXXXX". */
  phone: string;
};

export const MAX_CONTACTS = 3;
export const MAX_CONTACT_FIELD_LENGTH = 30;

export type ContactInput = { name: string; relation: string; phone: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

/** Formdaki girdiyi doğrular. Hata mesajları ekranda kalıcı olarak gösterilir. */
export function validateContact(input: ContactInput): { contact: ContactInput | null; errors: ContactErrors } {
  const errors: ContactErrors = {};
  const name = input.name.trim();
  const relation = input.relation.trim();
  const phone = normalizePhone(input.phone);

  if (!name) errors.name = 'Lütfen adını yazın.';
  if (!phone) errors.phone = 'Telefon numarası geçersiz. Örnek: 0555 123 45 67';

  if (Object.keys(errors).length > 0 || !phone) return { contact: null, errors };
  return {
    contact: {
      name: name.slice(0, MAX_CONTACT_FIELD_LENGTH),
      relation: relation.slice(0, MAX_CONTACT_FIELD_LENGTH),
      phone,
    },
    errors,
  };
}

export function newContactId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Yeni kişi ekler ya da aynı id'li kişiyi günceller. Sınır aşılırsa `null`. */
export function upsertContact(contacts: Contact[], contact: Contact): Contact[] | null {
  const index = contacts.findIndex((c) => c.id === contact.id);
  if (index >= 0) return contacts.map((c, i) => (i === index ? contact : c));
  if (contacts.length >= MAX_CONTACTS) return null;
  return [...contacts, contact];
}

export function removeContact(contacts: Contact[], id: string): Contact[] {
  return contacts.filter((c) => c.id !== id);
}

/** "Ayşe (Kızım)" ya da yakınlık yoksa "Ayşe". */
export function contactTitle(contact: Contact): string {
  return contact.relation ? `${contact.name} (${contact.relation})` : contact.name;
}

export function parseContacts(raw: unknown): Contact[] | null {
  if (!Array.isArray(raw)) return null;
  const contacts: Contact[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, name, relation, phone } = item as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || typeof phone !== 'string') continue;
    const normalized = normalizePhone(phone);
    if (!normalized) continue;
    contacts.push({ id, name, relation: typeof relation === 'string' ? relation : '', phone: normalized });
  }
  return contacts.slice(0, MAX_CONTACTS);
}
