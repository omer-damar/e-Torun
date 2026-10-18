import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, parseSettings } from '@/features/settings/settings';
import { clearAll, readJson, SCHEMA_VERSION, STORAGE_KEYS, writeJson } from '@/storage/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage', () => {
  it('yazılan veriyi geri okur', async () => {
    const settings = { ...DEFAULT_SETTINGS, userName: 'Fatma', onboardingDone: true };
    await writeJson(STORAGE_KEYS.settings, settings);
    expect(await readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS)).toEqual(settings);
  });

  it('kayıt yoksa varsayılanı döndürür', async () => {
    expect(await readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('bozuk JSON veya farklı şema sürümünde çökmez, varsayılana döner', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, '{bozuk');
    expect(await readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);

    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, data: { userName: 'X' } }),
    );
    expect(await readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('clearAll uygulamanın tüm anahtarlarını siler', async () => {
    await writeJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    await writeJson(STORAGE_KEYS.contacts, []);
    await clearAll();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.contacts)).toBeNull();
  });
});

describe('parseSettings', () => {
  it('eksik ve geçersiz alanları varsayılanla doldurur', () => {
    expect(parseSettings({ userName: 'Ali', fontScale: 'dev', refillWarningDays: 999 })).toEqual({
      ...DEFAULT_SETTINGS,
      userName: 'Ali',
    });
  });

  it('nesne değilse null', () => {
    expect(parseSettings('x')).toBeNull();
  });
});
