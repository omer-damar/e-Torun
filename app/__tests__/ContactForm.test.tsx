import { fireEvent, render, screen } from '@testing-library/react-native';

import { ContactForm } from '@/components/ContactForm';
import { pickFromAddressBook } from '@/features/emergency/pickFromAddressBook';

jest.mock('@/features/emergency/pickFromAddressBook', () => ({ pickFromAddressBook: jest.fn() }));
const mockPick = pickFromAddressBook as jest.MockedFunction<typeof pickFromAddressBook>;

async function setup() {
  const onSubmit = jest.fn();
  await render(<ContactForm submitLabel="Kaydet" onSubmit={onSubmit} />);
  return { onSubmit };
}

beforeEach(() => mockPick.mockReset());

describe('ContactForm — Rehberden seç', () => {
  it('seçilen kişinin adını ve numarasını doldurur, kaydet ile gönderir', async () => {
    mockPick.mockResolvedValue({ name: 'Ayşe Yılmaz', phone: '05550000001', hasAnyNumber: true });
    const { onSubmit } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Rehberden seç' }));
    expect(screen.getByDisplayValue('Ayşe Yılmaz')).toBeTruthy();
    expect(screen.getByDisplayValue('0555 000 00 01')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Yakınlığı (isteğe bağlı)'), 'Kızım');
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ayşe Yılmaz', relation: 'Kızım', phone: '05550000001' });
  });

  it('cep numarası yoksa kalıcı hata gösterir, kaydetmez', async () => {
    mockPick.mockResolvedValue({ name: 'Ev', phone: null, hasAnyNumber: true });
    const { onSubmit } = await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Rehberden seç' }));
    expect(screen.getByText(/cep numarası yok/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('vazgeçilirse form değişmez', async () => {
    mockPick.mockResolvedValue(null);
    await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Rehberden seç' }));
    expect(screen.queryByText(/Rehberden dolduruldu/)).toBeNull();
    expect(screen.getByLabelText('Adı').props.value).toBe('');
  });

  it('rehber açılamazsa elle yazmayı önerir', async () => {
    mockPick.mockRejectedValue(new Error('no view controller'));
    await setup();

    await fireEvent.press(screen.getByRole('button', { name: 'Rehberden seç' }));
    expect(screen.getByText(/Rehber açılamadı/)).toBeTruthy();
  });
});
