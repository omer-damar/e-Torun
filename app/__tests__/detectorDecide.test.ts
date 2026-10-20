import { decide, decideFrom } from '@/detector/decide';
import { findRules } from '@/detector/rules';

describe('findRules', () => {
  it('Türkçe karaktersiz yazımı da yakalar', () => {
    expect(findRules('HESABINIZ BLOKE EDİLMİŞTİR')).toContain('URGENCY');
    expect(findRules('hesabiniz bloke edilmistir')).toContain('URGENCY');
  });

  it('link ve kısa link', () => {
    expect(findRules('Detay: https://ptt-kargo.xyz/a')).toEqual(expect.arrayContaining(['LINK', 'IMPERSONATION']));
    expect(findRules('tıkla bit.ly/3abc')).toEqual(expect.arrayContaining(['LINK', 'SHORT_LINK']));
  });

  it('resmi .gov.tr linki link kuralı tetiklemez; taklidi tetikler ve kurum taklidi sayılır', () => {
    expect(findRules('Başvurunuz için https://www.turkiye.gov.tr adresini ziyaret edin')).not.toContain('LINK');
    expect(findRules('İadeniz için https://turkiye.gov.tr.clskl.com/iade')).toEqual(
      expect.arrayContaining(['LINK', 'IMPERSONATION']),
    );
  });

  it('tutar ve tarih link sayılmaz; resmi adresli banka bildirimi link kuralı tetiklemez', () => {
    expect(findRules('Enpara.com: Kredi kartı limitiniz 25.000,00 TL olarak güncellendi.')).not.toContain('LINK');
    expect(findRules('Başvurunuz 01.04.2024 tarihinde başlar. Ayrıntılar iskur.gov.tr')).not.toContain('LINK');
    expect(findRules('Tutar 25.000,00 TL, ayrıntılar sahte-site.com')).toContain('LINK');
  });

  it('kargo mesajındaki "gönderiniz" para isteği sayılmaz; "para gönderin" sayılır', () => {
    expect(findRules('Yurtiçi Kargo: gönderiniz bugün dağıtıma çıkmıştır.')).not.toContain('PAYMENT');
    expect(findRules('Acil para lazım, şu hesaba hemen gönderin')).toContain('PAYMENT');
  });

  it('@ ile gizlenen adres resmi sayılmaz (asıl hedef @ işaretinden sonrası)', () => {
    expect(findRules('Gönderiniz için https://ptt.gov.tr@bit.ly/3Yy29Ws')).toContain('LINK');
    expect(findRules('Üyeliğiniz için http://www.ptt.gov.tr:911@s955054819.onlinehome.us/mo')).toEqual(
      expect.arrayContaining(['LINK', 'IMPERSONATION']),
    );
  });

  it('kelime başında eşleşir, kelime içinde değil', () => {
    expect(findRules('Toplantı arasında görüşürüz, betonu döktük')).toEqual([]);
  });

  it('IBAN ve ödeme', () => {
    expect(findRules('TR12 0006 1005 1978 6457 8413 26 hesabına hemen yatırın')).toEqual(
      expect.arrayContaining(['PAYMENT', 'URGENCY']),
    );
  });

  it('doğrulama kodu bilgilendirici kural', () => {
    expect(findRules('Doğrulama kodunuz 482913. Kimseyle paylaşmayın.')).toEqual(['OTP_INFO']);
  });
});

describe('decideFrom (plan bölüm 8 karar tablosu)', () => {
  const t = { high: 0.67, low: 0.3 };
  it('olasılık eşikleri', () => {
    expect(decideFrom(0.9, [], t)).toBe('red');
    expect(decideFrom(0.4, [], t)).toBe('yellow');
    expect(decideFrom(0.1, [], t)).toBe('green');
  });

  it('kural birleşimleri kırmızı (model reklam demiyorsa)', () => {
    expect(decideFrom(0.1, ['LINK', 'IMPERSONATION'], t)).toBe('red');
    expect(decideFrom(0.1, ['PAYMENT', 'URGENCY'], t)).toBe('red');
    expect(decideFrom(0.1, ['PERSONAL_INFO', 'IMPERSONATION', 'CALLBACK'], t)).toBe('red');
    expect(decideFrom(0.1, ['CALLBACK', 'IMPERSONATION', 'URGENCY'], t)).toBe('red');
  });

  it('kurum adı + şifre/ödeme kelimesi, iletişim kanalı (link, arama, acele) yoksa kırmızı değil', () => {
    // Ekstre, kod ve maaş bildirimleri: "QNB: kredi kartı borcunuz ... son ödeme tarihi".
    expect(decideFrom(0.05, ['PAYMENT', 'IMPERSONATION'], t)).not.toBe('red');
    expect(decideFrom(0.05, ['PERSONAL_INFO', 'IMPERSONATION'], t)).not.toBe('red');
    expect(decideFrom(0.1, ['PAYMENT', 'IMPERSONATION', 'CALLBACK'], t)).toBe('red');
  });

  it('model reklam diyorsa kural birleşimi en fazla sarı; düşük olasılıkta da sarı (kurum taklitli link hariç)', () => {
    expect(decideFrom({ dolandiricilik: 0.05, reklam: 0.9 }, ['LINK', 'PRIZE'], t)).toBe('yellow');
    expect(decideFrom({ dolandiricilik: 0.05, reklam: 0.1 }, ['LINK', 'PRIZE'], t)).toBe('yellow');
    expect(decideFrom({ dolandiricilik: 0.05, reklam: 0.1 }, ['LINK', 'FAKE_LINK', 'IMPERSONATION'], t)).toBe('red');
  });

  it('model reklam diyorsa: link yoksa "Reklam", bilinmeyen link ya da tehlike işareti varsa değil', () => {
    expect(decideFrom({ dolandiricilik: 0.02, reklam: 0.9 }, ['PRIZE'], t)).toBe('ad');
    expect(decideFrom({ dolandiricilik: 0.02, reklam: 0.9 }, ['LINK'], t)).toBe('yellow');
    expect(decideFrom({ dolandiricilik: 0.02, reklam: 0.9 }, ['GAMBLING'], t)).toBe('yellow');
    expect(decideFrom({ dolandiricilik: 0.02, reklam: 0.9 }, ['PERSONAL_INFO'], t)).not.toBe('ad');
  });

  it('yasal reklam işareti "Reklam" yapar, ama model dolandırıcılıktan şüpheleniyorsa yapmaz', () => {
    expect(decideFrom({ dolandiricilik: 0.05, reklam: 0.9 }, ['LINK', 'PRIZE', 'AD_MARKER'], t)).toBe('ad');
    expect(decideFrom({ dolandiricilik: 0.4, reklam: 0.5 }, ['LINK', 'PRIZE', 'AD_MARKER'], t)).not.toBe('ad');
  });

  it('zayıf işaretler tek başına sarı yapmaz; güçlü tek işaret sarı; iki zayıf işaret model normal demiyorsa sarı', () => {
    for (const id of ['IMPERSONATION', 'OTP_INFO', 'URGENCY', 'PRIZE', 'PERSONAL_INFO', 'PAYMENT', 'CALLBACK'] as const) {
      expect(decideFrom(0.1, [id], t)).toBe('green');
    }
    expect(decideFrom(0.1, ['LINK'], t)).toBe('yellow');
    expect(decideFrom(0.1, ['GAMBLING'], t)).toBe('yellow');
    const unsure = { dolandiricilik: 0.1, reklam: 0.45 };
    expect(decideFrom(unsure, ['CALLBACK', 'IMPERSONATION'], t)).toBe('yellow');
    expect(decideFrom(unsure, ['URGENCY', 'PRIZE'], t)).toBe('yellow');
    // Model açıkça "normal" diyorsa iki zayıf işaret yeşil kalır.
    expect(decideFrom(0.1, ['URGENCY', 'PRIZE'], t)).toBe('green');
    // Kurum adı yalnızca link, arama, şifre ya da ödemeyle birlikte sayılır.
    expect(decideFrom(unsure, ['IMPERSONATION', 'PRIZE'], t)).toBe('green');
  });
});

describe('decide — telefonda yanlış alarm veren gerçek mesajlar', () => {
  it('kısa biçimli doğrulama kodu ("onay kod", "paylaşma") yeşil ve kod uyarısı gösterilir', () => {
    const d = decide('Lütfen bu kodu kimseyle paylasma. Kariyer.net onay kod 482913');
    expect(d.level).toBe('green');
    expect(d.rules).toContain('OTP_INFO');
    expect(d.reasons.join(' ')).toMatch(/kodu kimseye söylemeyin/);
  });

  it('e-posta adresi link sayılmaz; kurumun kendi adresinden gelen bilgilendirme kırmızı değil', () => {
    const text =
      'Başvurduğunuz programın değerlendirme testi noreply@vodafone.com adresinden gönderildi. Henüz tamamlamadıysanız şimdi tam zamanı! Vodafone İnsan Kaynakları';
    expect(findRules(text)).not.toContain('LINK');
    expect(findRules(text)).not.toContain('FAKE_LINK');
    expect(decide(text).level).not.toBe('red');
  });

  it('e-posta değil link içindeki "@" hilesi yine yakalanır', () => {
    expect(findRules('Gönderiniz için https://ptt.gov.tr@bit.ly/3Yy29Ws')).toContain('LINK');
  });

  it('kod veren ama bilinmeyen link de içeren mesaj yeşile çekilmez', () => {
    expect(decide('Doğrulama kodunuz 482913. Kimseyle paylaşmayın. İşlemi iptal için: iptal-islem.xyz').level).not.toBe('green');
  });
});

describe('decide — kurumsal meşru mesajlar (v2 karar katmanı)', () => {
  it.each([
    'QNB: Kredi kartı ekstreniz kesildi. Dönem borcu: 7.842,30 TL, asgari ödeme: 3.136,92 TL, son ödeme tarihi: 25.03.2024.',
    'Yurtiçi Kargo: 418820133647 takip numaralı gönderiniz bugün dağıtıma çıkmıştır. Takip: yurticikargo.com',
    'Ankara Büyükşehir Belediyesi: Su faturanızın son ödeme tarihi 20.03.2024. Tutar: 287,40 TL. Ödeme: ankara.bel.tr',
    'Dede konumu atıyorum, hastanenin otoparkındayız: https://maps.app.goo.gl/kX3Lm9Qw2',
  ])('kırmızı değil: %s', (text) => {
    expect(decide(text).level).not.toBe('red');
  });
});

describe('decide — gerçek örnekler (scam_tr kaynaklı)', () => {
  it.each([
    'Sayın müşterimiz, hesabınızda şüpheli işlem tespit edilmiştir. Hesabınız 24 saat içinde bloke edilecektir. Hemen doğrulamak için tıklayın: https://ornek-baglanti.com/a1',
    'Siparişiniz teslim edilemedi. İadeyi önlemek için bilgilerinizi doğrulayın: https://ornek-baglanti.com/a1',
    'Vergi borcunuz nedeniyle dosyanız icraya verildi. Borcu öğrenmek ve itiraz etmek için tıklayın: https://ornek-baglanti.com/a1',
    'Sn. uzlaştırma dosyanızın savcılığa iadesi için son gündür, mağduriyet yaşamamak adına arayın: h. B. 0212 000 00 00',
    'Ödenmemiş HGS Borcunuz var, icra işlemlerinin başlatılmaması adına ödeme yapmanız gerekiyor',
  ])('kırmızı: %s', (text) => {
    expect(decide(text).level).toBe('red');
  });

  it('modelin kaçırdığı "evrak işleme alındı, arayınız" mesajı en az sarı', () => {
    const d = decide('Sn. evraklarınız işleme alınmıştır. Bilgi için arayınız. hukuk bürosu tel: 0216 000 00 00');
    expect(['yellow', 'red']).toContain(d.level);
    expect(d.reasons.length).toBeGreaterThan(0);
  });

  it.each([
    'Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?',
    'Doğum günün kutlu olsun teyzeciğim, nice mutlu yıllara!',
    'Hastane randevuna ben götüreceğim, 9da kapıda ol.',
    // Gerçek test setinde yanlış alarm veren günlük cümleler:
    'Şimdi geldi, duşa girip çıkıyor hemen',
    'Hediyeler için çok teşekkür ederiz, keşke seni de görebilseydik',
    'Wifi ın şifresini soracaktım?',
    'Eski Hapishane galiba, gardiyan odası falan var',
  ])('yeşil: %s', (text) => {
    expect(decide(text).level).toBe('green');
  });

  it('doğrulama kodu mesajı yeşil ama kodu söylememe uyarısı gösterilir', () => {
    const d = decide('Garanti BBVA internet bankacılığı giriş şifreniz: 482913. Bu şifreyi kimseyle paylaşmayınız.');
    expect(d.level).not.toBe('red');
    expect(d.reasons.join(' ')).toMatch(/kodu kimseye söylemeyin|şifre/);
  });

  it('kısa sahte e-tebligat parçası en az sarı (kurum + süre doldu)', () => {
    expect(['yellow', 'red']).toContain(decide('e-tebligatınızın yasal süresi dolmuştur').level);
  });

  it('kısa metin', () => {
    expect(decide('merhaba').level).toBe('too_short');
  });

  it('en fazla 4 gerekçe; kırmızıda ana öneri doğru', () => {
    const d = decide(
      'TEBRİKLER! e-Devlet adına 5.000 TL ödül kazandınız. Hemen şifrenizi ve kart bilgilerinizi girin, TR12 0006 1005 1978 6457 8413 26 hesabına masraf ödeyin: bit.ly/x1',
    );
    expect(d.level).toBe('red');
    expect(d.reasons.length).toBeLessThanOrEqual(4);
    expect(d.advice).toMatch(/Linke tıklamayın/);
  });
});
