/** Gemini'nin OpenAI uyumlu ucuna istek; kota dolar ya da model yanıt vermezse sıradaki modele geçer. */
import { GEMINI_BASE_URL, MODEL_TIMEOUT_MS } from './config.js';
import { buildMessages } from './prompt.js';
import { InvalidVerdictError, parseVerdict } from './verdict.js';

/** Sıradaki modeli denemeye değer durumlar: kota, model yok, sağlayıcı hatası, zaman aşımı, bozuk cevap. */
const RETRYABLE_STATUS = new Set([404, 408, 429, 500, 502, 503, 504]);

export class LlmUnavailableError extends Error {}

export async function askLlm(text, { apiKey, models, fetchImpl = fetch, timeoutMs = MODEL_TIMEOUT_MS }) {
  if (!apiKey) throw new LlmUnavailableError('anahtar yok');

  let lastProblem = 'model yok';
  for (const model of models) {
    let response;
    try {
      response = await fetchImpl(`${GEMINI_BASE_URL}chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: buildMessages(text),
          temperature: 0,
          reasoning_effort: 'low',
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastProblem = `${model}: ${error.name === 'TimeoutError' ? 'zaman aşımı' : 'bağlantı hatası'}`;
      continue;
    }

    if (!response.ok) {
      lastProblem = `${model}: HTTP ${response.status}`;
      if (RETRYABLE_STATUS.has(response.status)) continue;
      throw new LlmUnavailableError(lastProblem); // 400/401/403: anahtar ya da istek hatalı, diğer modeller de aynı
    }

    try {
      const body = await response.json();
      return { ...parseVerdict(body?.choices?.[0]?.message?.content), model };
    } catch (error) {
      lastProblem = `${model}: ${error instanceof InvalidVerdictError ? `geçersiz cevap (${error.message})` : 'okunamadı'}`;
    }
  }
  throw new LlmUnavailableError(lastProblem);
}
