/**
 * D8 karşılaştırma ölçümü, 1. aşama (docs/PROJE_PLANI.md bölüm 8): örneklemi seçer, her mesaj için
 * telefondaki kararı hesaplar ve mesajı uygulamadaki gibi maskeler. 2. aşama sunucuya sorar:
 *   AI_COMPARE=1 npx jest aiCompare      → ml/data/processed/ai_compare/input.json (repoya girmez)
 *   cd ../server && npm run compare      → ml/reports/ai_compare.json (yalnızca toplu sayılar)
 */
import { decide, MIN_MESSAGE_LENGTH } from '@/detector/decide';
import { maskForAi } from '@/features/messages/maskForAi';

import { parseCsv } from '../test-utils/csv';
import { parseInbox } from '../test-utils/goldInbox';

const fs = jest.requireActual<{
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string): string[];
  writeFileSync(file: string, data: string): void;
  existsSync(file: string): boolean;
  mkdirSync(dir: string, options: { recursive: boolean }): void;
}>('fs');
const crypto = jest.requireActual<{ createHash(alg: string): { update(s: string): { digest(enc: 'hex'): string } } }>('crypto');

const DATA = `${process.cwd()}/../ml/data`;
const OUT_DIR = `${DATA}/processed/ai_compare`;

/** Sabit örneklem: metnin özetine göre sırala, ilk n'i al (her çalıştırmada aynı mesajlar). */
function sample<T extends { text: string }>(rows: T[], n: number): T[] {
  const key = (t: string) => crypto.createHash('sha1').update(t).digest('hex');
  return [...rows].sort((a, b) => (key(a.text) < key(b.text) ? -1 : 1)).slice(0, n);
}

type Row = { set: string; label: string; text: string; tuned?: boolean };

const longEnough = (r: Row) => Array.from(r.text.trim()).length >= Math.max(MIN_MESSAGE_LENGTH, 10);

(process.env.AI_COMPARE === '1' ? describe : describe.skip)('D8 karşılaştırma, 1. aşama', () => {
  it('örneklemi hazırlar', () => {
    const rows: Row[] = [];

    const inbox = `${DATA}/raw/inbox/mesajlar.txt`;
    if (fs.existsSync(inbox)) {
      for (const item of parseInbox(fs.readFileSync(inbox, 'utf8')).items) {
        if (item.label !== 'emin_degilim') rows.push({ set: 'altin', label: item.label, text: item.text, tuned: item.tuned });
      }
    }

    // Gerçek test seti: modelin eğitimde görmediği gerçek Türkçe mesajlar.
    const test = parseCsv(fs.readFileSync(`${DATA}/processed/v2/test.csv`, 'utf8'))
      .map((r) => ({ set: 'gercek_test', label: r.label, text: r.text }))
      .filter(longEnough);
    rows.push(...test.filter((r) => r.label === 'dolandiricilik'));
    rows.push(...sample(test.filter((r) => r.label === 'normal'), 15));
    rows.push(...sample(test.filter((r) => r.label === 'reklam'), 15));

    // Çeviri dolandırıcılık: seçilen v2 modeli çevirilerle eğitilmedi, ikisi için de görülmemiş.
    const translated = fs
      .readdirSync(`${DATA}/translated`)
      .filter((f) => f.startsWith('batch_'))
      .flatMap((f) => parseCsv(fs.readFileSync(`${DATA}/translated/${f}`, 'utf8')))
      .filter((r) => r.label === 'dolandiricilik')
      .map((r) => ({ set: 'ceviri', label: 'dolandiricilik', text: r.text_tr, kind: r.scam_type }))
      .filter(longEnough);
    rows.push(...sample(translated.filter((r) => r.kind === 'kargo'), 5).map(({ kind: _k, ...r }) => r));
    rows.push(...sample(translated.filter((r) => r.kind !== 'kargo'), 5).map(({ kind: _k, ...r }) => r));

    const items = rows.map((r, i) => {
      const local = decide(r.text);
      return { id: i + 1, set: r.set, label: r.label, tuned: r.tuned ?? false, local: local.level, masked: maskForAi(r.text) };
    });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(`${OUT_DIR}/input.json`, JSON.stringify(items, null, 1));
    console.log(`AI_COMPARE ${items.length} mesaj hazır`);
    expect(items.length).toBeGreaterThan(0);
  });
});
