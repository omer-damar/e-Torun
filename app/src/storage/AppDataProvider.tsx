import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { parseContacts, removeContact, upsertContact, type Contact } from '@/features/emergency/contacts';
import type { Dose, DoseLogEntry, Medication, MedicationStock } from '@/features/medications/model';
import { syncMedicationNotifications } from '@/features/medications/notifications';
import { parseDoseLog, parseMedications } from '@/features/medications/parse';
import { findLogEntry, pruneLog, recordDose, undoDose, wouldExceedTriggerLimit } from '@/features/medications/schedule';
import { applyTaken, applyUndo } from '@/features/medications/stock';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '@/features/settings/settings';
import { FontScaleContext } from '@/theme';
import { clearAll, readJson, STORAGE_KEYS, writeJson } from './storage';

export type SaveMedicationResult = { ok: true } | { ok: false; reason: 'limit' };

type AppData = {
  /** Depodan ilk okuma bitti mi? Bitmeden ekranlar boş çizilir (açılış ekranı görünür). */
  ready: boolean;
  settings: Settings;
  contacts: Contact[];
  medications: Medication[];
  doseLog: DoseLogEntry[];
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Kişi sınırı (3) aşılırsa `false`. */
  saveContact: (contact: Contact) => Promise<boolean>;
  deleteContact: (id: string) => Promise<void>;
  /** Ekler ya da günceller ve bildirimleri yeniden planlar. iOS bildirim sınırı aşılacaksa kaydetmez. */
  saveMedication: (medication: Medication) => Promise<SaveMedicationResult>;
  deleteMedication: (id: string) => Promise<void>;
  markDose: (dose: Dose, status: 'taken' | 'skipped') => Promise<void>;
  unmarkDose: (dose: Dose) => Promise<void>;
  /** "Yeni kutu aldım" / "Düzelt" / stok takibini kapat (`undefined`). */
  setStock: (medicationId: string, stock: MedicationStock | undefined) => Promise<void>;
  /** Tüm kayıtları ve planlı bildirimleri siler. */
  resetAll: () => Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseLog, setDoseLog] = useState<DoseLogEntry[]>([]);
  // Art arda güncellemelerde eski state'in üzerine yazmamak için güncel değerler ref'te.
  const settingsRef = useRef(settings);
  const contactsRef = useRef(contacts);
  const medicationsRef = useRef(medications);
  const doseLogRef = useRef(doseLog);

  const commitMedications = useCallback(async (next: Medication[]) => {
    medicationsRef.current = next;
    setMedications(next);
    await writeJson(STORAGE_KEYS.medications, next);
  }, []);

  const commitDoseLog = useCallback(async (next: DoseLogEntry[]) => {
    doseLogRef.current = next;
    setDoseLog(next);
    await writeJson(STORAGE_KEYS.doseLog, next);
  }, []);

  /** Planlı bildirimleri depoya eşitler ve ilaçlardaki bildirim kimliklerini günceller. */
  const syncNotifications = useCallback(async () => {
    let ids: Record<string, string[]>;
    try {
      ids = await syncMedicationNotifications(medicationsRef.current, {
        now: new Date(),
        refillWarningDays: settingsRef.current.refillWarningDays,
      });
    } catch {
      return; // Bildirim izni yoksa ya da sistem reddederse ilaç kaydı yine de geçerli.
    }
    const current = medicationsRef.current;
    const changed = current.some((m) => ids[m.id] && ids[m.id].join() !== m.notificationIds.join());
    if (changed) {
      await commitMedications(current.map((m) => (ids[m.id] ? { ...m, notificationIds: ids[m.id] } : m)));
    }
  }, [commitMedications]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedContacts, loadedMeds, loadedLog] = await Promise.all([
        readJson(STORAGE_KEYS.settings, parseSettings, DEFAULT_SETTINGS),
        readJson(STORAGE_KEYS.contacts, parseContacts, []),
        readJson(STORAGE_KEYS.medications, parseMedications, []),
        readJson(STORAGE_KEYS.doseLog, parseDoseLog, []),
      ]);
      if (cancelled) return;
      settingsRef.current = loadedSettings;
      contactsRef.current = loadedContacts;
      medicationsRef.current = loadedMeds;
      doseLogRef.current = pruneLog(loadedLog, new Date());
      setSettings(loadedSettings);
      setContacts(loadedContacts);
      setMedications(loadedMeds);
      setDoseLog(doseLogRef.current);
      setReady(true);
      syncNotifications();
    })();
    return () => {
      cancelled = true;
    };
  }, [syncNotifications]);

  // Uygulama her ön plana geldiğinde: bildirimler depoyla eşitlensin (ör. kullanıcı izni sonradan açtıysa).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && medicationsRef.current.length > 0) syncNotifications();
    });
    return () => subscription.remove();
  }, [syncNotifications]);

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

  const saveMedication = useCallback(
    async (medication: Medication): Promise<SaveMedicationResult> => {
      if (wouldExceedTriggerLimit(medicationsRef.current, medication)) return { ok: false, reason: 'limit' };
      const current = medicationsRef.current;
      const exists = current.some((m) => m.id === medication.id);
      await commitMedications(exists ? current.map((m) => (m.id === medication.id ? medication : m)) : [...current, medication]);
      await syncNotifications();
      return { ok: true };
    },
    [commitMedications, syncNotifications],
  );

  const deleteMedication = useCallback(
    async (id: string) => {
      await commitMedications(medicationsRef.current.filter((m) => m.id !== id));
      await commitDoseLog(doseLogRef.current.filter((e) => e.medicationId !== id));
      await syncNotifications();
    },
    [commitMedications, commitDoseLog, syncNotifications],
  );

  /** B6: stok takibi olan ilaçta stoğu değiştirir ve "ilacınız bitiyor" bildirimini yeniden planlar. */
  const changeStock = useCallback(
    async (medicationId: string, change: (stock: MedicationStock) => MedicationStock) => {
      const med = medicationsRef.current.find((m) => m.id === medicationId);
      if (!med?.stock) return;
      const stock = change(med.stock);
      await commitMedications(medicationsRef.current.map((m) => (m.id === medicationId ? { ...m, stock } : m)));
      syncNotifications();
    },
    [commitMedications, syncNotifications],
  );

  const markDose = useCallback(
    async (dose: Dose, status: 'taken' | 'skipped') => {
      const wasTaken = findLogEntry(dose, doseLogRef.current)?.status === 'taken';
      const now = new Date();
      await commitDoseLog(recordDose(doseLogRef.current, dose, status, now));
      if (status === 'taken' && !wasTaken) await changeStock(dose.medicationId, (s) => applyTaken(s, now));
    },
    [commitDoseLog, changeStock],
  );

  const unmarkDose = useCallback(
    async (dose: Dose) => {
      const wasTaken = findLogEntry(dose, doseLogRef.current)?.status === 'taken';
      await commitDoseLog(undoDose(doseLogRef.current, dose));
      if (wasTaken) await changeStock(dose.medicationId, (s) => applyUndo(s, new Date()));
    },
    [commitDoseLog, changeStock],
  );

  const setStock = useCallback(
    async (medicationId: string, stock: MedicationStock | undefined) => {
      await commitMedications(medicationsRef.current.map((m) => (m.id === medicationId ? { ...m, stock } : m)));
      await syncNotifications();
    },
    [commitMedications, syncNotifications],
  );

  const resetAll = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await clearAll();
    settingsRef.current = DEFAULT_SETTINGS;
    contactsRef.current = [];
    medicationsRef.current = [];
    doseLogRef.current = [];
    setSettings(DEFAULT_SETTINGS);
    setContacts([]);
    setMedications([]);
    setDoseLog([]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      settings,
      contacts,
      medications,
      doseLog,
      updateSettings,
      saveContact,
      deleteContact,
      saveMedication,
      deleteMedication,
      markDose,
      unmarkDose,
      setStock,
      resetAll,
    }),
    [
      ready,
      settings,
      contacts,
      medications,
      doseLog,
      updateSettings,
      saveContact,
      deleteContact,
      saveMedication,
      deleteMedication,
      markDose,
      unmarkDose,
      setStock,
      resetAll,
    ],
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
