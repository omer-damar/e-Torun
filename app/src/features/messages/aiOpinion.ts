/**
 * D8 — "Yapay zekâya da sor": isteğe bağlı ikinci görüş (docs/PROJE_PLANI.md bölüm 8).
 * Uygulamadaki tek ağ isteği budur; yalnızca kullanıcı butona bastığında ve maskelenmiş metinle yapılır.
 * API anahtarı uygulamada değil, `server/`'dadır; burada yalnızca sunucunun adresi vardır.
 */
import type { RiskLevel } from '@/detector/decide';

import { maskForAi } from './maskForAi';

/** Telefon en fazla bu kadar bekler; sonra "ulaşılamadı" der (sonuç zaten ekranda). */
export const AI_TIMEOUT_MS = 15_000;

export type AiLevel = 'red' | 'yellow' | 'green' | 'ad';
export type AiVerdict = { level: AiLevel; reasons: string[]; advice: string };
export type AiResult = { status: 'ok'; verdict: AiVerdict } | { status: 'unavailable' };

const FROM_SERVER: Record<string, AiLevel> = { kirmizi: 'red', sari: 'yellow', yesil: 'green', reklam: 'ad' };

/** `app/.env` → `EXPO_PUBLIC_LLM_URL=http://<bilgisayarın IP'si>:4100`. Yoksa özellik gizlenir. */
export function aiServerUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_LLM_URL?.trim();
  return url ? url.replace(/\/+$/, '') : null;
}

/** Sunucu cevabını doğrular; beklenmeyen biçim "ulaşılamadı" sayılır. */
export function parseAiResponse(body: unknown): AiVerdict | null {
  if (typeof body !== 'object' || body === null) return null;
  const { seviye, nedenler, tavsiye } = body as Record<string, unknown>;
  const level = typeof seviye === 'string' ? FROM_SERVER[seviye] : undefined;
  if (!level || !Array.isArray(nedenler) || typeof tavsiye !== 'string' || !tavsiye.trim()) return null;
  return {
    level,
    reasons: nedenler.filter((r): r is string => typeof r === 'string' && r.trim() !== '').slice(0, 3),
    advice: tavsiye.trim(),
  };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>;

export async function askAi(
  message: string,
  { url = aiServerUrl(), fetchImpl = fetch, timeoutMs = AI_TIMEOUT_MS }: { url?: string | null; fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<AiResult> {
  if (!url) return { status: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${url}/api/mesaj-kontrol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metin: maskForAi(message) }),
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'unavailable' };
    const verdict = parseAiResponse(await response.json());
    return verdict ? { status: 'ok', verdict } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export type OpinionComparison = 'same' | 'aiSafer' | 'aiStricter';

const SEVERITY: Record<AiLevel, number> = { green: 0, ad: 0, yellow: 1, red: 2 };

/**
 * İki görüş çelişirse temkinli olan öne çıkar: telefondaki uyarı yapay zekâ "güvenli" dedi diye
 * kalkmaz; yapay zekâ şüphelenirse kullanıcı bunu ayrıca görür.
 */
export function compareOpinions(local: Exclude<RiskLevel, 'too_short'>, ai: AiLevel): OpinionComparison {
  const diff = SEVERITY[ai] - SEVERITY[local];
  return diff === 0 ? 'same' : diff < 0 ? 'aiSafer' : 'aiStricter';
}

export const COMPARISON_TEXT: Record<OpinionComparison, string> = {
  same: 'Telefondaki kontrol ile aynı sonuç.',
  aiSafer: 'Görüşler farklı. Telefondaki uyarı geçerli; emin değilseniz yakınınıza sorun.',
  aiStricter: 'Yapay zekâ bu mesajı şüpheli buldu. Emin değilseniz işlem yapmadan yakınınıza sorun.',
};
