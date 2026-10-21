/** Yapay zekânın cevabını doğrular; şemaya uymayan cevap telefona hiç gönderilmez. */

export const LEVELS = ['kirmizi', 'sari', 'yesil', 'reklam'];
const MAX_REASONS = 3;
const MAX_REASON_CHARS = 200;
const MAX_ADVICE_CHARS = 300;

export class InvalidVerdictError extends Error {}

/** Bazı modeller JSON'u ```json ... ``` içine koyar. */
function stripFence(content) {
  const match = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(content);
  return match ? match[1] : content;
}

const clean = (value, max) => String(value).replace(/\s+/g, ' ').trim().slice(0, max);

export function parseVerdict(content) {
  let data;
  try {
    data = JSON.parse(stripFence(String(content ?? '')));
  } catch {
    throw new InvalidVerdictError('JSON değil');
  }
  if (!data || typeof data !== 'object') throw new InvalidVerdictError('nesne değil');
  if (!LEVELS.includes(data.seviye)) throw new InvalidVerdictError('seviye geçersiz');
  if (!Array.isArray(data.nedenler) || !data.nedenler.every((r) => typeof r === 'string')) {
    throw new InvalidVerdictError('nedenler geçersiz');
  }
  if (typeof data.tavsiye !== 'string' || !data.tavsiye.trim()) throw new InvalidVerdictError('tavsiye yok');

  return {
    seviye: data.seviye,
    nedenler: data.nedenler.map((r) => clean(r, MAX_REASON_CHARS)).filter(Boolean).slice(0, MAX_REASONS),
    tavsiye: clean(data.tavsiye, MAX_ADVICE_CHARS),
  };
}
