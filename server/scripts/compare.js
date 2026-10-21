/**
 * D8 karşılaştırma ölçümü, 2. aşama: 1. aşamanın (`app/__tests__/aiCompare.test.ts`) maskelediği mesajları
 * çalışan sunucuya sorar, telefondaki kararla karşılaştırır.
 *   npm start (başka pencerede)  →  npm run compare
 * Mesaj metinleri ve tek tek sonuçlar yalnızca gitignore'daki klasörde kalır; repoya
 * `ml/reports/ai_compare.json` (toplu sayılar) girer.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ML = new URL('../../ml/', import.meta.url);
const INPUT = new URL('data/processed/ai_compare/input.json', ML);
const OUTPUT = new URL('data/processed/ai_compare/output.json', ML);
const REPORT = new URL('reports/ai_compare.json', ML);
const SERVER = process.env.COMPARE_URL ?? 'http://127.0.0.1:4100';
/** Ücretsiz kota (dakikada ~15 istek) aşılmasın. */
const GAP_MS = Number(process.env.COMPARE_GAP_MS ?? 4500);
const RETRY_WAIT_MS = 30_000;
/** Art arda bu kadar mesaja cevap gelmezse (kota dolmuş) kalanlar boşuna sorulmaz. */
const MAX_QUOTA_ERRORS = 3;

const FROM_SERVER = { kirmizi: 'red', sari: 'yellow', yesil: 'green', reklam: 'ad' };
const LEVELS = ['red', 'yellow', 'ad', 'green', 'too_short', 'ulasilamadi'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function askOnce(text) {
  const started = Date.now();
  try {
    const res = await fetch(`${SERVER}/api/mesaj-kontrol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metin: text }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => ({}));
    const level = res.ok ? FROM_SERVER[body.seviye] : undefined;
    return { level: level ?? 'ulasilamadi', ms: Date.now() - started, model: body.model ?? null, status: res.status };
  } catch {
    return { level: 'ulasilamadi', ms: Date.now() - started, model: null, status: 0 };
  }
}

const rate = (part, total) => (total ? Math.round((part / total) * 1000) / 1000 : null);

function counts(items, key) {
  const c = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const it of items) c[it[key]] += 1;
  return { n: items.length, ...c };
}

/** Bir grup için iki yöntemin ve "en az biri uyardı" birleşiminin özeti. */
function metrics(items) {
  const by = (label) => items.filter((it) => it.label === label);
  const warn = (l) => l === 'red' || l === 'yellow';
  const summary = (key) => {
    const fraud = by('dolandiricilik');
    const normal = by('normal');
    const ad = by('reklam');
    const level = typeof key === 'function' ? key : (it) => it[key];
    return {
      dolandiricilik_kirmizi: rate(fraud.filter((it) => level(it) === 'red').length, fraud.length),
      dolandiricilik_kirmizi_veya_sari: rate(fraud.filter((it) => warn(level(it))).length, fraud.length),
      normal_yanlis_alarm_kirmizi: rate(normal.filter((it) => level(it) === 'red').length, normal.length),
      normal_yanlis_alarm_kirmizi_veya_sari: rate(normal.filter((it) => warn(level(it))).length, normal.length),
      reklam_reklam_olarak: rate(ad.filter((it) => level(it) === 'ad').length, ad.length),
      reklam_kirmizi: rate(ad.filter((it) => level(it) === 'red').length, ad.length),
    };
  };
  const answered = items.filter((it) => it.ai !== 'ulasilamadi');
  const severity = { red: 2, yellow: 1, ad: 0, green: 0, too_short: 0 };
  return {
    n: items.length,
    etiket: Object.fromEntries(
      ['dolandiricilik', 'normal', 'reklam'].map((l) => [l, { telefon: counts(by(l), 'local'), yapay_zeka: counts(by(l), 'ai') }]),
    ),
    telefon: summary('local'),
    yapay_zeka: summary('ai'),
    // Uygulamadaki kural: telefondaki uyarı kalır, yapay zekâ ayrıca uyarabilir → en az biri uyardı mı?
    birlikte_en_az_biri_uyardi: summary((it) => (warn(it.local) || warn(it.ai) ? 'yellow' : 'green')),
    ayni_seviye_grubu: rate(answered.filter((it) => severity[it.local] === severity[it.ai]).length, answered.length),
  };
}

export function summarize(results) {
  const ms = results.filter((r) => r.ai !== 'ulasilamadi').map((r) => r.ms).sort((a, b) => a - b);
  const pick = (q) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(q * ms.length))] : null);
  const models = {};
  for (const r of results) if (r.model) models[r.model] = (models[r.model] ?? 0) + 1;
  const sets = [...new Set(results.map((r) => r.set))];
  return {
    olusturuldu: new Date().toISOString().slice(0, 10),
    aciklama:
      'Telefondaki karar (model v2 + kurallar) ile sunucudaki yapay zekâ aynı maskelenmiş mesajlarda. ' +
      'Altın testte telefondaki kurallar 3 mesaja göre ayarlandı; "altin_ayarlanmamis" bu mesajları dışarıda bırakır.',
    mesaj_sayisi: results.length,
    ulasilamadi: results.filter((r) => r.ai === 'ulasilamadi').length,
    sure_ms: { medyan: pick(0.5), p90: pick(0.9) },
    modeller: models,
    gruplar: {
      ...Object.fromEntries(sets.map((s) => [s, metrics(results.filter((r) => r.set === s))])),
      altin_ayarlanmamis: metrics(results.filter((r) => r.set === 'altin' && !r.tuned)),
      tumu: metrics(results),
    },
  };
}

async function main() {
  const items = JSON.parse(readFileSync(INPUT, 'utf8'));
  const health = await fetch(`${SERVER}/api/saglik`).then((r) => r.json()).catch(() => null);
  if (!health?.anahtar) throw new Error(`Sunucu hazır değil: ${SERVER} (npm start, .env'de anahtar)`);

  // Kaldığı yerden devam: daha önce cevap alınan mesajlar yeniden sorulmaz (kota boşa harcanmasın).
  const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : [];
  const answered = new Map(previous.filter((r) => r.ai !== 'ulasilamadi').map((r) => [r.id, r]));
  let quotaErrors = 0;

  const results = [];
  for (const [i, item] of items.entries()) {
    const { masked: _masked, ...rest } = item;
    if (answered.has(item.id)) {
      results.push(answered.get(item.id));
      continue;
    }
    let answer = quotaErrors >= MAX_QUOTA_ERRORS ? { level: 'ulasilamadi', ms: 0, model: null, status: 0 } : await askOnce(item.masked);
    if (answer.level === 'ulasilamadi' && quotaErrors < MAX_QUOTA_ERRORS) {
      await sleep(RETRY_WAIT_MS); // anlık yoğunluksa bir kez bekleyip yeniden dene
      answer = await askOnce(item.masked);
      quotaErrors = answer.level === 'ulasilamadi' ? quotaErrors + 1 : 0;
    }
    results.push({ ...rest, ai: answer.level, ms: answer.ms, model: answer.model });
    writeFileSync(OUTPUT, JSON.stringify([...results, ...previous.filter((r) => r.id > item.id)], null, 1));
    console.log(`${i + 1}/${items.length} ${item.set} ${item.label}: telefon=${item.local} yapay_zeka=${answer.level} (${answer.ms} ms)`);
    if (quotaErrors === MAX_QUOTA_ERRORS) {
      console.log(`Art arda ${MAX_QUOTA_ERRORS} kez ulaşılamadı (kota dolmuş olabilir); kalanlar sonraki çalıştırmaya bırakıldı.`);
      quotaErrors += 1; // bir kez yaz, kalanları sormadan geç
    }
    if (quotaErrors < MAX_QUOTA_ERRORS) await sleep(GAP_MS);
  }

  writeFileSync(OUTPUT, JSON.stringify(results, null, 1));
  const report = summarize(results);
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.gruplar.tumu, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
