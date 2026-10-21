import { maskForAi } from '@/features/messages/maskForAi';

describe('maskForAi', () => {
  it.each([
    ['Beni 0555 000 00 00 numarasından arayın', 'Beni [numara] numarasından arayın'],
    ['Destek: +90 555 000 0000', 'Destek: [numara]'],
    ['Çağrı merkezi (0212) 000 00 00', 'Çağrı merkezi [numara]'],
    ['Kuryemiz 4440000 numarasından arayabilir', 'Kuryemiz [numara] numarasından arayabilir'],
    ['Bize 444 0 000 hattından ulaşın', 'Bize [numara] hattından ulaşın'],
    ['Doğrulama kodunuz: 482913. Kimseyle paylaşmayın.', 'Doğrulama kodunuz: [kod]. Kimseyle paylaşmayın.'],
    ['IBAN: TR00 0000 0000 0000 0000 0000 00 hesabına', 'IBAN: [iban] hesabına'],
    ['Kart 0000 0000 0000 0000 ile ödeme', 'Kart [kart] ile ödeme'],
    ['Bilgi için ornek.kisi@example.com adresine yazın', 'Bilgi için [eposta] adresine yazın'],
    ['123456789012 nolu kargonuz yolda', '[kod] nolu kargonuz yolda'],
  ])('%s', (input, expected) => {
    expect(maskForAi(input)).toBe(expected);
  });

  it('tutar, yıl, saat ve kısa kodlar kalır (karar için gerekli)', () => {
    expect(maskForAi('05.08.2026 saat 08:30, 1500 TL gümrük ücreti ödeyin. B002')).toBe(
      '05.08.2026 saat 08:30, 1500 TL gümrük ücreti ödeyin. B002',
    );
  });

  it('bağlantının adresi kalır, yolundaki kişiye özel uzun sayılar gizlenir', () => {
    expect(maskForAi('Takip: https://aras.la/Mo1Xi0 ve yurticikargo.com/takip/418820196634')).toBe(
      'Takip: https://aras.la/Mo1Xi0 ve yurticikargo.com/takip/[kod]',
    );
    expect(maskForAi('Hemen girin: https://ptt-kargo-0555.xyz/odeme')).toBe('Hemen girin: https://ptt-kargo-0555.xyz/odeme');
  });

  it('maskelenecek bir şey yoksa metin aynen kalır', () => {
    const text = 'Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?';
    expect(maskForAi(text)).toBe(text);
  });
});
