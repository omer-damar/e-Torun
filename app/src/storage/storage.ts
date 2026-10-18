import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tip güvenli AsyncStorage sarmalayıcısı. Her kayıt `{ schemaVersion, data }` zarfında
 * tutulur; sürüm uyuşmazsa ya da veri bozuksa varsayılan değer döner (uygulama çökmez).
 */
export const SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  settings: 'settings',
  contacts: 'contacts',
  medications: 'medications',
  doseLog: 'doseLog',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

type Envelope = { schemaVersion: number; data: unknown };

/** `parse` ham veriyi doğrular; geçersizse `null` döndürmeli. */
export async function readJson<T>(key: StorageKey, parse: (raw: unknown) => T | null, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope?.schemaVersion !== SCHEMA_VERSION) return fallback;
    return parse(envelope.data) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: StorageKey, data: unknown): Promise<void> {
  const envelope: Envelope = { schemaVersion: SCHEMA_VERSION, data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

/** "Tüm verilerimi sil": yalnızca bu uygulamanın anahtarları. */
export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
