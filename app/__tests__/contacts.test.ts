import {
  contactTitle,
  MAX_CONTACTS,
  parseContacts,
  removeContact,
  upsertContact,
  validateContact,
  type Contact,
} from '@/features/emergency/contacts';

const ayse: Contact = { id: '1', name: 'Ayşe', relation: 'Kızım', phone: '05550000001' };

describe('validateContact', () => {
  it('geçerli girdiyi temizler ve numarayı normalize eder', () => {
    const { contact, errors } = validateContact({ name: '  Ayşe ', relation: ' Kızım ', phone: '+90 555 000 00 01' });
    expect(errors).toEqual({});
    expect(contact).toEqual({ name: 'Ayşe', relation: 'Kızım', phone: '05550000001' });
  });

  it('boş isim ve geçersiz numara için anlaşılır hata verir', () => {
    const { contact, errors } = validateContact({ name: ' ', relation: '', phone: '123' });
    expect(contact).toBeNull();
    expect(errors.name).toBe('Lütfen adını yazın.');
    expect(errors.phone).toMatch(/geçersiz/);
  });

  it('yakınlık isteğe bağlıdır', () => {
    expect(validateContact({ name: 'Ali', relation: '', phone: '05550000002' }).contact?.relation).toBe('');
  });
});

describe('upsertContact / removeContact', () => {
  it('yeni kişi ekler, aynı id ile günceller', () => {
    const added = upsertContact([], ayse)!;
    expect(added).toHaveLength(1);
    const updated = upsertContact(added, { ...ayse, name: 'Ayşe Hanım' })!;
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Ayşe Hanım');
  });

  it(`en fazla ${MAX_CONTACTS} kişi`, () => {
    const full = [1, 2, 3].map((i) => ({ ...ayse, id: String(i) }));
    expect(upsertContact(full, { ...ayse, id: '4' })).toBeNull();
    // Var olanı düzenlemek sınırdayken de çalışır.
    expect(upsertContact(full, { ...ayse, id: '2', name: 'Yeni' })).not.toBeNull();
  });

  it('kişiyi siler', () => {
    expect(removeContact([ayse], '1')).toEqual([]);
  });
});

describe('contactTitle', () => {
  it('yakınlık varsa parantez içinde yazar', () => {
    expect(contactTitle(ayse)).toBe('Ayşe (Kızım)');
    expect(contactTitle({ ...ayse, relation: '' })).toBe('Ayşe');
  });
});

describe('parseContacts', () => {
  it('bozuk kayıtları atlar, en fazla 3 kişi döndürür', () => {
    const raw = [ayse, { id: 2 }, null, { ...ayse, id: '3', phone: 'yanlış' }, { ...ayse, id: '4' }, { ...ayse, id: '5' }, { ...ayse, id: '6' }];
    const parsed = parseContacts(raw)!;
    expect(parsed.map((c) => c.id)).toEqual(['1', '4', '5']);
  });

  it('dizi değilse null', () => {
    expect(parseContacts({})).toBeNull();
  });
});
