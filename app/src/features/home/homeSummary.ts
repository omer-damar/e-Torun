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
