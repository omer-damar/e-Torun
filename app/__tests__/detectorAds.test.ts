import { decide, isLegalAd } from '@/detector/decide';
import { findRules, isOfficialLink } from '@/detector/rules';

const MIGROS =
  'Sevgili Moneyli, MJET HASEKI AKSARAY ISTANBUL magazasina ozel her Sali ve Cuma gunu paketli Uzman Kasap kiyma, kofte, dana ve kuzu etlerinde %20 indirim! 1 - 31 Ekim tarihleri arasinda gecerlidir. Sec Al urunleri harictir. Stoklarla sinirlidir. Migros Tic. SMS Ret: 7447 ye RET MG yaz MN:0622052951300016 B016';
const GARANTI_AD =
  'Garanti BBVA: Bonus kartinizla 500 TL ve uzeri alisverise 50 TL bonus! Detay: garantibbva.com.tr SMS ret icin RET yazip 3340a gonderin. Mersis:0879001756600379';

describe('resmi alan adları', () => {
  it.each([
    ['https://www.garantibbva.com.tr/kampanya', true],
    ['yurticikargo.com/takip', true],
    ['https://ptt.gov.tr', true],
    ['https://garantibbva-guvenlik.com/giris', false],
    ['https://garantibbva.com.tr.xyz.com/a', false],
    ['ptt-kargo-takip.xyz', false],
  ])('%s → %s', (url, expected) => {
    expect(isOfficialLink(url)).toBe(expected);
  });

  it('resmi linkli kurum mesajı "link + kurum taklidi" sayılmaz', () => {
    expect(findRules('Yurtiçi Kargo: gönderiniz dağıtımda, takip: yurticikargo.com/takip')).not.toContain('LINK');
  });
});

describe('ara önlem: yasal reklam', () => {
  it('Migros kampanyası "Reklam" (önceden %99 ile kırmızıydı)', () => {
    const d = decide(MIGROS);
    expect(d.level).toBe('ad');
    expect(d.title).toMatch(/reklam/i);
    expect(d.reasons).toEqual([expect.stringMatching(/yasal reklam işaretleri/)]);
  });

  it('resmi linkli banka kampanyası "Reklam"', () => {
    expect(decide(GARANTI_AD).level).toBe('ad');
  });

  it.each([
    // Reklam işareti eklemiş ama dolandırıcılık işaretleri taşıyan mesajlar reklam sayılmaz:
    'Garanti BBVA: hesabiniz bloke edildi, sifrenizi dogrulayin. SMS ret icin RET yazip 3340a gonderin.',
    'Kampanya! Odul kazandiniz bit.ly/x1 SMS ret icin RET yazip 7447ye gonderin.',
    'Ziraat: bonus iadeniz icin https://ziraat-iade.xyz/giris adresine girin. Mersis:0123456789',
    'Deneme bonusu 500 TL! Yeni adres: bahis-giris.com SMS ret: RET yaz 7447',
  ])('reklam kılığında dolandırıcılık: %s', (text) => {
    const d = decide(text);
    expect(d.level).not.toBe('ad');
    expect(['red', 'yellow']).toContain(d.level);
  });

  it('isLegalAd yalnızca reklam işareti varken ve tehlike işareti yokken doğru', () => {
    expect(isLegalAd(['AD_MARKER'])).toBe(true);
    expect(isLegalAd(['AD_MARKER', 'PRIZE', 'IMPERSONATION'])).toBe(true);
    // Kurum adı + başka bir site linki (banka kartıyla mağaza kampanyası) tek başına tehlike değil.
    expect(isLegalAd(['AD_MARKER', 'LINK', 'IMPERSONATION'])).toBe(true);
    expect(isLegalAd(['AD_MARKER', 'PERSONAL_INFO'])).toBe(false);
    expect(isLegalAd(['AD_MARKER', 'LINK', 'FAKE_LINK', 'IMPERSONATION'])).toBe(false);
    expect(isLegalAd(['AD_MARKER', 'LINK', 'SHORT_LINK', 'PRIZE'])).toBe(false);
    expect(isLegalAd(['AD_MARKER', 'GAMBLING'])).toBe(false);
    expect(isLegalAd(['PRIZE'])).toBe(false);
  });

  it('kurum adını taklit eden link adresi ayrı işaretlenir', () => {
    expect(findRules('Bonus iadeniz için https://ziraat-iade.xyz/giris adresine girin')).toEqual(
      expect.arrayContaining(['FAKE_LINK', 'LINK', 'IMPERSONATION']),
    );
    expect(findRules('Bonus kampanyası: www.kliksa.com/kampanya')).not.toContain('FAKE_LINK');
  });

  it('bahis sitelerinin "bahis" demeden kullandığı kalıplar', () => {
    expect(findRules('10TL FREE bonus, canli mac izle, 15dk cekim')).toContain('GAMBLING');
  });

  it('belediye, üniversite ve okul uzantıları resmi', () => {
    expect(isOfficialLink('https://www.ankara.bel.tr/odeme')).toBe(true);
    expect(isOfficialLink('ogrenci.ege.edu.tr')).toBe(true);
    expect(isOfficialLink('ankara-bel.tr.odeme.xyz')).toBe(false);
  });
});
