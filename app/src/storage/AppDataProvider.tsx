import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { parseContacts, removeContact, upsertContact, type Contact } from '@/features/emergency/contacts';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '@/features/settings/settings';
import { FontScaleContext } from '@/theme';
import { clearAll, readJson, STORAGE_KEYS, writeJson } from './storage';

type AppData = {
  /** Depodan ilk okuma bitti mi? Bitmeden ekranlar boş çizilir (açılış ekranı görünür). */
  ready: boolean;
  settings: Settings;
  contacts: Contact[];
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Kişi sınırı (3) aşılırsa `false`. */
  saveContact: (contact: Contact) => Promise<boolean>;
  deleteContact: (id: string) => Promise<void>;
  /** Tüm kayıtları ve planlı bildirimleri siler. */
  resetAll: () => Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Art arda güncellemelerde eski state'in üzerine yazmamak için güncel değerler ref'te.
  const settingsRef = useRef(settings);
  const contactsRef = useRef(contacts);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedContacts] = await Promise.all([
        readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS),
        readJson(STORAGE_KEYS.contacts, parseContacts, []),
      ]);
      if (cancelled) return;
      settingsRef.current = loadedSettings;
      contactsRef.current = loadedContacts;
      setSettings(loadedSettings);
      setContacts(loadedContacts);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    await writeJson(STORAGE_KEYS.settings, next);
  }, []);

  const saveContact = useCallback(async (contact: Contact) => {
    const next = upsertContact(contactsRef.current, contact);
    if (!next) return false;
    contactsRef.current = next;
    setContacts(next);
    await writeJson(STORAGE_KEYS.contacts, next);
    return true;
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    const next = removeContact(contactsRef.current, id);
    contactsRef.current = next;
    setContacts(next);
    await writeJson(STORAGE_KEYS.contacts, next);
  }, []);

  const resetAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await clearAll();
    settingsRef.current = DEFAULT_SETTINGS;
    contactsRef.current = [];
    setSettings(DEFAULT_SETTINGS);
    setContacts([]);
  }, []);

  const value = useMemo(
    () => ({ ready, settings, contacts, updateSettings, saveContact, deleteContact, resetAll }),
    [ready, settings, contacts, updateSettings, saveContact, deleteContact, resetAll],
  );

  return (
    <AppDataContext.Provider value={value}>
      <FontScaleContext.Provider value={settings.fontScale}>{children}</FontScaleContext.Provider>
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData, AppDataProvider içinde kullanılmalı.');
  return value;
}
