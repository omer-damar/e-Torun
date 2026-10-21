import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { LlmUnavailableError } from '../src/llm.js';
import { createApp } from '../src/server.js';

const SECRET_TEXT = 'Gizli içerik: hesabınız bloke, hemen girin örnek-banka.xyz';
const logs = [];
let behaviour = 'ok';
let base;
let server;

before(async () => {
  const ask = async (text) => {
    if (behaviour === 'down') throw new LlmUnavailableError('m1: HTTP 429');
    if (behaviour === 'crash') throw new TypeError('beklenmedik');
    return { seviye: 'kirmizi', nedenler: [`uzunluk ${text.length}`], tavsiye: 'Tıklamayın.', model: 'm1' };
  };
  server = createApp({ config: { apiKey: 'x', models: ['m1'] }, ask, log: (line) => logs.push(line) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body) =>
  fetch(`${base}/api/mesaj-kontrol`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

test('sağlık ucu anahtarın varlığını söyler, anahtarı değil', async () => {
  const res = await fetch(`${base}/api/saglik`);
  assert.deepEqual(await res.json(), { durum: 'hazir', anahtar: true });
});

test('geçerli mesaj → yapay zekânın görüşü', async () => {
  behaviour = 'ok';
  const res = await post(JSON.stringify({ metin: `  ${SECRET_TEXT}  ` }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    seviye: 'kirmizi',
    nedenler: [`uzunluk ${SECRET_TEXT.length}`],
    tavsiye: 'Tıklamayın.',
    model: 'm1',
  });
});

test('hatalı istekler 400', async () => {
  assert.equal((await post('{bozuk')).status, 400);
  assert.equal((await post(JSON.stringify({ metin: 'kısa' }))).status, 400);
  assert.equal((await post(JSON.stringify({ metin: 'x'.repeat(2001) }))).status, 400);
  assert.equal((await post(JSON.stringify({ text: SECRET_TEXT }))).status, 400);
  assert.equal((await fetch(`${base}/baska`)).status, 404);
});

test('çok büyük gövde reddedilir', async () => {
  await assert.rejects(post(JSON.stringify({ metin: 'x'.repeat(40_000) })).then((r) => {
    if (r.status >= 400) throw new Error(String(r.status));
  }));
});

test('yapay zekâya ulaşılamazsa 503, beklenmedik hatada 500', async () => {
  behaviour = 'down';
  const down = await post(JSON.stringify({ metin: SECRET_TEXT }));
  assert.equal(down.status, 503);
  assert.deepEqual(await down.json(), { hata: 'yapay_zeka_ulasilamadi' });
  behaviour = 'crash';
  assert.equal((await post(JSON.stringify({ metin: SECRET_TEXT }))).status, 500);
});

test('günlüğe mesaj içeriği hiçbir zaman yazılmaz', () => {
  assert.ok(logs.length >= 5);
  for (const line of logs) {
    assert.ok(!line.includes('Gizli') && !line.includes('bloke') && !line.includes('örnek-banka'), line);
  }
});
