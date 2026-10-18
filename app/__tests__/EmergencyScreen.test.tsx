import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import EmergencyScreen from '@/app/acil';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';

// Testlerde hiçbir numara gerçekten aranmaz: openURL sahte.
const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

async function renderWithContacts(contacts: unknown[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: contacts }));
  await render(
    <AppDataProvider>
      <EmergencyScreen />
    </AppDataProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  openURL.mockClear();
});

describe('Acil Yardım', () => {
  it('112 butonu önce onay sorar; Hayır derse aramaz', async () => {
    await renderWithContacts([]);

    await fireEvent.press(screen.getByRole('button', { name: '112 Acil Çağrı Merkezini ara' }));
    expect(screen.getByText('112 Acil Çağrı Merkezi aranacak. Emin misiniz?')).toBeTruthy();
    expect(openURL).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Hayır' }));
    expect(openURL).not.toHaveBeenCalled();
  });

  it('112 yalnızca "Evet, ara"dan sonra aranır', async () => {
    await renderWithContacts([]);

    await fireEvent.press(screen.getByRole('button', { name: '112 Acil Çağrı Merkezini ara' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Evet, ara' }));
    expect(openURL).toHaveBeenCalledWith('tel:112');
  });

  it('kayıtlı yakını tek dokunuşla arar', async () => {
    await renderWithContacts([{ id: 'a', name: 'Ayşe', relation: 'Kızım', phone: '05550000001' }]);

    const button = await screen.findByText('Ayşe (Kızım)');
    expect(screen.getByText('0555 000 00 01')).toBeTruthy();
    await fireEvent.press(button);
    expect(openURL).toHaveBeenCalledWith('tel:05550000001');
  });

  it('kimse yoksa Ayarlar\'a yönlendirir; bu ekranda kişi ekleme yoktur', async () => {
    await renderWithContacts([]);

    expect(await screen.findByText(/Henüz yakın eklenmedi/)).toBeTruthy();
    expect(screen.getByRole('button', { name: "Ayarlar'a git" })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Kişi ekle/ })).toBeNull();
  });

  it('kişi varken de ekleme/düzenleme butonu göstermez', async () => {
    await renderWithContacts([{ id: 'a', name: 'Ayşe', relation: 'Kızım', phone: '05550000001' }]);

    await screen.findByText('Ayşe (Kızım)');
    expect(screen.queryByRole('button', { name: /ekle|düzenle|sil/i })).toBeNull();
  });
});
