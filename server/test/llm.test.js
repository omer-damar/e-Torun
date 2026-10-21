import assert from 'node:assert/strict';
import { test } from 'node:test';

import { askLlm, LlmUnavailableError } from '../src/llm.js';

const OK_CONTENT = '{"seviye":"kirmizi","nedenler":["Sahte bağlantı"],"tavsiye":"Tıklamayın."}';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const completion = (content) => jsonResponse(200, { choices: [{ message: { content } }] });

/** Sırayla verilen cevapları döndüren sahte fetch; çağrıları kaydeder. */
function fakeFetch(...responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { impl, calls };
}

const options = (fetchImpl) => ({ apiKey: 'test-anahtar', models: ['m1', 'm2'], fetchImpl, timeoutMs: 1000 });

test('ilk model cevap verirse onu döndürür; anahtar başlıkta, mesaj gövdede', async () => {
  const { impl, calls } = fakeFetch(completion(OK_CONTENT));
  const verdict = await askLlm('Kargonuz bekliyor [kod]', options(impl));
  assert.deepEqual(verdict, { seviye: 'kirmizi', nedenler: ['Sahte bağlantı'], tavsiye: 'Tıklamayın.', model: 'm1' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /chat\/completions$/);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-anahtar');
  assert.equal(calls[0].body.model, 'm1');
  assert.match(calls[0].body.messages[1].content, /Kargonuz bekliyor \[kod\]/);
});

test('kota dolunca, zaman aşımında ya da bozuk cevapta sıradaki modele geçer', async () => {
  for (const first of [
    jsonResponse(429, {}),
    jsonResponse(404, {}),
    Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
    completion('Bence güvenli.'),
  ]) {
    const { impl, calls } = fakeFetch(first, completion(OK_CONTENT));
    const verdict = await askLlm('mesaj metni', options(impl));
    assert.equal(verdict.model, 'm2');
    assert.equal(calls.length, 2);
  }
});

test('anahtar hatalıysa (401) diğer modelleri boşuna denemez', async () => {
  const { impl, calls } = fakeFetch(jsonResponse(401, {}));
  await assert.rejects(askLlm('mesaj metni', options(impl)), LlmUnavailableError);
  assert.equal(calls.length, 1);
});

test('hiçbir model cevap vermezse ulaşılamadı; anahtar yoksa hiç istek atılmaz', async () => {
  const { impl } = fakeFetch(jsonResponse(503, {}), jsonResponse(429, {}));
  await assert.rejects(askLlm('mesaj metni', options(impl)), /m2: HTTP 429/);

  const empty = fakeFetch();
  await assert.rejects(askLlm('mesaj metni', { ...options(empty.impl), apiKey: '' }), LlmUnavailableError);
  assert.equal(empty.calls.length, 0);
});
