/**
 * HTTP katmanı. Mesaj içeriği hiçbir yere yazılmaz: günlüğe yalnızca yol, durum kodu, süre ve
 * (hata varsa) hata türü düşer.
 */
import { createServer } from 'node:http';

import { MAX_BODY_BYTES, MAX_MESSAGE_CHARS, MIN_MESSAGE_CHARS } from './config.js';
import { askLlm, LlmUnavailableError } from './llm.js';

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('çok büyük'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createApp({ config, ask = askLlm, log = console.log }) {
  return createServer(async (req, res) => {
    const started = Date.now();
    const done = (status, body, note = '') => {
      send(res, status, body);
      log(`${req.method} ${req.url} ${status} ${Date.now() - started}ms${note ? ` ${note}` : ''}`);
    };

    if (req.method === 'GET' && req.url === '/api/saglik') {
      return done(200, { durum: 'hazir', anahtar: Boolean(config.apiKey) });
    }
    if (req.method !== 'POST' || req.url !== '/api/mesaj-kontrol') {
      return done(404, { hata: 'bulunamadi' });
    }

    let text;
    try {
      const body = JSON.parse(await readBody(req));
      text = typeof body?.metin === 'string' ? body.metin.trim() : '';
    } catch {
      return done(400, { hata: 'gecersiz_istek' });
    }
    const length = Array.from(text).length;
    if (length < MIN_MESSAGE_CHARS || length > MAX_MESSAGE_CHARS) {
      return done(400, { hata: 'gecersiz_uzunluk' });
    }

    try {
      const verdict = await ask(text, { apiKey: config.apiKey, models: config.models });
      return done(200, verdict, verdict.model);
    } catch (error) {
      if (error instanceof LlmUnavailableError) return done(503, { hata: 'yapay_zeka_ulasilamadi' }, error.message);
      return done(500, { hata: 'sunucu_hatasi' }, error?.name ?? 'hata');
    }
  });
}
