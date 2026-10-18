export type NextDoseSummary = {
  /** "HH:mm" */
  time: string;
  name: string;
};

export function getGreeting(userName: string | null | undefined): string {
  const name = userName?.trim();
  return name ? `Merhaba, ${name}` : 'Merhaba';
}

export function getNextDoseText(nextDose: NextDoseSummary | null): string {
  return nextDose ? `Sıradaki: ${nextDose.time} ${nextDose.name}` : 'Bugün başka ilaç yok';
}

/**
 * Geçici sahte veri. Aşama 3 (depolama + kurulum) ve Aşama 4 (ilaç modülü)
 * tamamlanınca gerçek kaynaklarla değiştirilecek.
 */
export const MOCK_HOME_DATA: { userName: string; nextDose: NextDoseSummary | null } = {
  userName: 'Ayşe',
  nextDose: { time: '20:00', name: 'Tansiyon ilacı' },
};
