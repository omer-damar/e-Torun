import { fromAddressBook } from '@/features/emergency/addressBook';

describe('fromAddressBook', () => {
  it('adı ve cep numarasını alır', () => {
    expect(fromAddressBook({ name: 'Ayşe Yılmaz', phoneNumbers: [{ number: '+90 555 000 00 01', label: 'mobile' }] })).toEqual({
      name: 'Ayşe Yılmaz',
      phone: '05550000001',
      hasAnyNumber: true,
    });
  });

  it('ad yoksa ad + soyaddan oluşturur', () => {
    expect(fromAddressBook({ firstName: 'Ali', lastName: 'Kaya', phoneNumbers: [] }).name).toBe('Ali Kaya');
  });

  it('sabit hattı atlayıp cep numarasını seçer', () => {
    const result = fromAddressBook({
      name: 'Ev',
      phoneNumbers: [
        { number: '0212 000 00 00', label: 'home' },
        { number: '0555 000 00 02', label: 'iPhone' },
      ],
    });
    expect(result.phone).toBe('05550000002');
  });

  it('birden fazla cep varsa birincil olanı tercih eder', () => {
    const result = fromAddressBook({
      name: 'Can',
      phoneNumbers: [
        { number: '0555 000 00 03', label: 'work' },
        { number: '0555 000 00 04', label: 'mobile', isPrimary: true },
      ],
    });
    expect(result.phone).toBe('05550000004');
  });

  it('yalnızca sabit hat varsa numara null, ama numarası olduğu bilinir', () => {
    expect(fromAddressBook({ name: 'Komşu', phoneNumbers: [{ number: '0236 000 00 00', label: 'home' }] })).toEqual({
      name: 'Komşu',
      phone: null,
      hasAnyNumber: true,
    });
  });

  it('hiç numara yoksa', () => {
    expect(fromAddressBook({ name: 'X' })).toEqual({ name: 'X', phone: null, hasAnyNumber: false });
  });
});
