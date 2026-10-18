import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/ayarlar';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/storage/storage';

const ayse = { id: 'a', name: 'Ayşe', relation: 'Kızım', phone: '05550000001' };
const ali = { id: 'b', name: 'Ali', relation: 'Oğlum', phone: '05550000002' };

async function renderSettings(contacts: unknown[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: contacts }));
  await render(
    <AppDataProvider>
      <SettingsScreen />
    </AppDataProvider>,
  );
  await screen.findByText('Yakınlarım');
}

async function storedContactIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.contacts);
  return raw ? JSON.parse(raw).data.map((c: { id: string }) => c.id) : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Ayarlar > Yakınlarım', () => {
  it('her kişi için görünür Düzenle ve Sil butonları vardır', async () => {
    await renderSettings([ayse, ali]);

    expect(await screen.findByRole('button', { name: 'Ayşe (Kızım) kişisini düzenle' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ayşe (Kızım) kişisini sil' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ali (Oğlum) kişisini sil' })).toBeTruthy();
  });

  it('Sil önce onay sorar; Hayır derse silmez', async () => {
    await renderSettings([ayse, ali]);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ayşe (Kızım) kişisini sil' }));
    expect(screen.getByText('Ayşe (Kızım) yakınlarınızdan silinecek.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Hayır' }));
    expect(screen.getByText('👤 Ayşe (Kızım)')).toBeTruthy();
    expect(await storedContactIds()).toEqual(['a', 'b']);
  });

  it('Evet, sil ile yalnızca o kişi silinir ve kalıcı olur', async () => {
    await renderSettings([ayse, ali]);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ayşe (Kızım) kişisini sil' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Evet, sil' }));

    await waitFor(() => expect(screen.queryByText('👤 Ayşe (Kızım)')).toBeNull());
    expect(screen.getByText('👤 Ali (Oğlum)')).toBeTruthy();
    expect(await storedContactIds()).toEqual(['b']);
  });

  it('3 kişi varken ekleme yerine bilgi gösterir', async () => {
    await renderSettings([ayse, ali, { ...ali, id: 'c', name: 'Can' }]);

    expect(await screen.findByText(/En fazla 3 kişi eklenebilir/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Kişi ekle' })).toBeNull();
  });
});
