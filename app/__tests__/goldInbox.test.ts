import { decide } from '@/detector/decide';

import { evaluate, isMistake, mistakesCsv, parseInbox, parseLabel } from '../test-utils/goldInbox';

// Uygulamanın tsconfig'i Node tiplerini içermez (yalnızca jest); burada gereken kadarı.
const fs = jest.requireActual<{
  readFileSync(file: string, encoding: 'utf8'): string;
  writeFileSync(file: string, data: string): void;
  existsSync(file: string): boolean;
}>('fs');

// Jest `app/` klasöründen çalışır.
const ML_DIR = `${process.cwd()}/../ml`;
const INBOX = `${ML_DIR}/data/raw/inbox/mesajlar.txt`;
const EXAMPLE = `${ML_DIR}/data/inbox_ornek.txt`;

describe('Altın test dosyası okuma', () => {
  it('etiketleri Türkçe harfle ve "ayarlandi" ekiyle tanır', () => {
    expect(parseLabel('dolandiricilik')).toEqual({ label: 'dolandiricilik', tuned: false });
    expect(parseLabel('  Dolandırıcılık  ')).toEqual({ label: 'dolandiricilik', tuned: false });
    expect(parseLabel('Emin değilim')).toEqual({ label: 'emin_degilim', tuned: false });
    expect(parseLabel('normal ayarlandi')).toEqual({ label: 'normal', tuned: true });
    expect(parseLabel('spam')).toBeNull();
  });

  it('örnek dosyayı okur: açıklamalar atlanır, çok satırlı mesaj korunur', () => {
    const { items, errors } = parseInbox(fs.readFileSync(EXAMPLE, 'utf8'));
    expect(errors).toEqual([]);
    expect(items.map((i) => [i.label, i.tuned])).toEqual([
      ['normal', false],
      ['reklam', false],
      ['dolandiricilik', false],
      ['normal', true],
      ['emin_degilim', false],
    ]);
    expect(parseInbox('normal\nbirinci satır\n#ikinci satır\n').items[0].text).toBe('birinci satır\n#ikinci satır');
  });

  it('hatalı blokları bildirir, tekrarları sayar', () => {
    const result = parseInbox('spam\nmerhaba\n---\nnormal\n---\nnormal\naynı\r\n---\r\nnormal\naynı\n');
    expect(result.errors).toEqual(['1. blok: etiket tanınmadı: "spam"', '2. blok: mesaj metni yok']);
    expect(result.items).toHaveLength(1);
    expect(result.duplicates).toBe(1);
  });
});

describe('Altın test değerlendirmesi', () => {
  it('hata tanımı: kaçan dolandırıcılık, normale alarm, reklama kırmızı', () => {
    expect(isMistake('dolandiricilik', 'yellow')).toBe(false);
    expect(isMistake('dolandiricilik', 'ad')).toBe(true);
    expect(isMistake('normal', 'yellow')).toBe(true);
    expect(isMistake('reklam', 'yellow')).toBe(false);
    expect(isMistake('reklam', 'red')).toBe(true);
  });

  it('ayarlanmış ve emin olunmayan mesajlar asıl ölçüme girmez', () => {
    const { items } = parseInbox('normal\na\n---\nnormal ayarlandi\nb\n---\nemin_degilim\nc\n---\ndolandiricilik\nd\n');
    const levels: Record<string, 'red' | 'yellow' | 'green'> = { a: 'yellow', b: 'red', c: 'green', d: 'red' };
    const report = evaluate(items, (text) => ({ level: levels[text], probability: 0.5, rules: [] }));
    expect(report.olcum.normal).toMatchObject({ n: 1, yellow: 1 });
    expect(report.ayarlanmis.normal).toMatchObject({ n: 1, red: 1 });
    expect(report.emin_degilim).toMatchObject({ n: 1, green: 1 });
    expect(report.ozet.normal_yanlis_alarm_kirmizi_veya_sari).toBe(1);
    expect(report.ozet.dolandiricilik_kirmizi).toBe(1);
    expect(report.ozet.reklam_reklam_olarak).toBeNull();
    expect(report.hatalar.map((h) => h.text)).toEqual(['a']); // ayarlanmış "b" hata listesine girmez
    expect(mistakesCsv(report.hatalar).split('\n')[1]).toBe('1,normal,yellow,0.5000,"","a"');
  });
});

/**
 * Gerçek ölçüm: yalnızca elle çalıştırılır ve gerçek dosya varsa.
 *   GOLD_INBOX=1 npx jest goldInbox
 * Repoya yalnızca toplu sayılar yazılır (`ml/reports/gold_inbox_app.json`); hatalı mesajlar
 * gitignore'daki `ml/reports/misclassified_gold.csv`'ye gider.
 */
const runReal = process.env.GOLD_INBOX === '1' && fs.existsSync(INBOX);

(runReal ? describe : describe.skip)('Gerçek gelen kutusu (GOLD_INBOX=1)', () => {
  it('uygulamanın kararını ölçer ve raporu yazar', () => {
    const { items, errors, duplicates } = parseInbox(fs.readFileSync(INBOX, 'utf8'));
    expect(errors).toEqual([]);
    const report = evaluate(items, decide);

    const summary = {
      olusturuldu: new Date().toISOString().slice(0, 10),
      kaynak: 'ml/data/raw/inbox/mesajlar.txt (repoya girmez)',
      karar_katmani: 'app/src/detector/decide.ts (model v2 + kurallar)',
      mesaj_sayisi: items.length,
      tekrar_atlanan: duplicates,
      olcum: report.olcum,
      ozet: report.ozet,
      ayarlanmis: report.ayarlanmis,
      emin_degilim: report.emin_degilim,
      hata_sayisi: report.hatalar.length,
    };
    fs.writeFileSync(`${ML_DIR}/reports/gold_inbox_app.json`, JSON.stringify(summary, null, 2) + '\n');
    fs.writeFileSync(`${ML_DIR}/reports/misclassified_gold.csv`, mistakesCsv(report.hatalar));
    console.log(JSON.stringify({ mesaj_sayisi: items.length, ozet: report.ozet, hata_sayisi: report.hatalar.length }, null, 2));
  });
});
