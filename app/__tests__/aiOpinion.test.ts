import { askAi, compareOpinions, parseAiResponse } from '@/features/messages/aiOpinion';

const OK = { seviye: 'kirmizi', nedenler: ['Sahte bağlantı', '', 3], tavsiye: ' Tıklamayın. ', model: 'm1' };

function fakeFetch(response: { ok: boolean; body?: unknown } | Error) {
  return jest.fn(async (_url: string, _init: RequestInit) => {
    if (response instanceof Error) throw response;
    return { ok: response.ok, json: async () => response.body } as Response;
  });
}

describe('parseAiResponse', () => {
  it('sunucu seviyesini uygulama seviyesine çevirir, boş/geçersiz nedenleri atar', () => {
    expect(parseAiResponse(OK)).toEqual({ level: 'red', reasons: ['Sahte bağlantı'], advice: 'Tıklamayın.' });
    expect(parseAiResponse({ ...OK, seviye: 'reklam' })?.level).toBe('ad');
  });

  it.each([null, 'metin', { ...OK, seviye: 'guvenli' }, { ...OK, nedenler: 'x' }, { ...OK, tavsiye: '' }])(
    'beklenmeyen biçim reddedilir: %p',
    (body) => {
      expect(parseAiResponse(body)).toBeNull();
    },
  );
});

describe('askAi', () => {
  it('maskelenmiş metni sunucuya gönderir; anahtar göndermez', async () => {
    const fetchImpl = fakeFetch({ ok: true, body: OK });
    const result = await askAi('Kodunuz 482913, sorun olursa 0555 000 00 00', { url: 'http://pc:4100', fetchImpl });
    expect(result).toEqual({ status: 'ok', verdict: { level: 'red', reasons: ['Sahte bağlantı'], advice: 'Tıklamayın.' } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://pc:4100/api/mesaj-kontrol');
    expect(JSON.parse(String(init.body))).toEqual({ metin: 'Kodunuz [kod], sorun olursa [numara]' });
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|key/i);
  });

  it.each([
    ['sunucu adresi yok', null, { ok: true, body: OK }],
    ['sunucu hata döndü', 'http://pc:4100', { ok: false }],
    ['bağlantı yok', 'http://pc:4100', new TypeError('Network request failed')],
    ['bozuk cevap', 'http://pc:4100', { ok: true, body: { seviye: 'x' } }],
  ] as const)('%s → ulaşılamadı', async (_name, url, response) => {
    const fetchImpl = fakeFetch(response as never);
    expect(await askAi('Uzunca bir deneme mesajı', { url, fetchImpl })).toEqual({ status: 'unavailable' });
    if (!url) expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('zaman aşımında isteği iptal eder', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchImpl = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = askAi('Uzunca bir deneme mesajı', { url: 'http://pc:4100', fetchImpl, timeoutMs: 15_000 });
    jest.advanceTimersByTime(15_000);
    expect(await pending).toEqual({ status: 'unavailable' });
    expect(signal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});

describe('compareOpinions', () => {
  it.each([
    ['red', 'red', 'same'],
    ['green', 'ad', 'same'],
    ['red', 'green', 'aiSafer'],
    ['yellow', 'ad', 'aiSafer'],
    ['green', 'yellow', 'aiStricter'],
    ['ad', 'red', 'aiStricter'],
  ] as const)('telefon %s, yapay zekâ %s → %s', (local, ai, expected) => {
    expect(compareOpinions(local, ai)).toBe(expected);
  });
});
