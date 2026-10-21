import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarize } from '../scripts/compare.js';

const row = (set, label, local, ai, extra = {}) => ({ set, label, local, ai, ms: 1000, model: 'm1', tuned: false, ...extra });

test('iki yöntemi ve "en az biri uyardı" birleşimini ayrı ölçer', () => {
  const report = summarize([
    row('gercek_test', 'dolandiricilik', 'red', 'green'),
    row('gercek_test', 'dolandiricilik', 'green', 'yellow'),
    row('gercek_test', 'normal', 'green', 'red'),
    row('gercek_test', 'normal', 'green', 'green'),
    row('gercek_test', 'reklam', 'ad', 'ad'),
    row('altin', 'normal', 'red', 'green', { tuned: true }),
  ]);
  const g = report.gruplar.gercek_test;
  assert.equal(g.telefon.dolandiricilik_kirmizi, 0.5);
  assert.equal(g.yapay_zeka.dolandiricilik_kirmizi_veya_sari, 0.5);
  assert.equal(g.birlikte_en_az_biri_uyardi.dolandiricilik_kirmizi_veya_sari, 1);
  assert.equal(g.yapay_zeka.normal_yanlis_alarm_kirmizi, 0.5);
  assert.equal(g.birlikte_en_az_biri_uyardi.normal_yanlis_alarm_kirmizi_veya_sari, 0.5);
  assert.equal(g.yapay_zeka.reklam_reklam_olarak, 1);
  assert.equal(report.gruplar.altin_ayarlanmamis.n, 0);
  assert.equal(report.gruplar.tumu.n, 6);
  assert.deepEqual(report.modeller, { m1: 6 });
});

test('ulaşılamayan cevaplar süreye ve uyuşmaya katılmaz', () => {
  const report = summarize([
    row('ceviri', 'dolandiricilik', 'red', 'red', { ms: 2000 }),
    row('ceviri', 'dolandiricilik', 'red', 'ulasilamadi', { ms: 30000, model: null }),
  ]);
  assert.equal(report.ulasilamadi, 1);
  assert.deepEqual(report.sure_ms, { medyan: 2000, p90: 2000 });
  assert.equal(report.gruplar.ceviri.ayni_seviye_grubu, 1);
  assert.equal(report.gruplar.ceviri.etiket.dolandiricilik.yapay_zeka.ulasilamadi, 1);
});
