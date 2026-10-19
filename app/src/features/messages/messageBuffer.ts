/**
 * Kontrol edilecek mesaj, ekranlar arasında YALNIZCA bellekte taşınır — PROJE_PLANI.md bölüm 11.
 * Depoya yazılmaz, sayfa adresine (route parametresi) konmaz; sonuç ekranından çıkılınca silinir.
 */

let pending: string | null = null;

export function setMessageToCheck(text: string): void {
  pending = text;
}

export function peekMessageToCheck(): string | null {
  return pending;
}

export function clearMessageToCheck(): void {
  pending = null;
}
