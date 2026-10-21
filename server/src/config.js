/** Sunucu ayarları; anahtar yalnızca ortam değişkeninden (.env) okunur. */

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/**
 * Kısa SMS sınıflandırması için en hızlı model önde. Adlar Gemini'nin OpenAI uyumlu ucunda çalıştığı
 * doğrulanmış modellerdir (Ekim 2026); kota dolar ya da model bulunamazsa sıradakine geçilir.
 */
export const DEFAULT_MODELS = ['gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.5-flash'];

/** Telefon 15 sn bekler; sunucu her modele daha az süre tanır ki cevap yetişsin. */
export const MODEL_TIMEOUT_MS = 10_000;

export const MAX_MESSAGE_CHARS = 2000;
export const MIN_MESSAGE_CHARS = 10;
export const MAX_BODY_BYTES = 16 * 1024;

export function loadConfig(env = process.env) {
  return {
    apiKey: env.GEMINI_API_KEY?.trim() || '',
    models: env.LLM_MODELS ? env.LLM_MODELS.split(',').map((m) => m.trim()).filter(Boolean) : DEFAULT_MODELS,
    port: Number(env.PORT) || 4100,
    host: env.HOST || '0.0.0.0',
  };
}
