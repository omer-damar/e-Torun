"""ml/data/scam_tr.csv dosyasını üretir (tek seferlik, elle düzenlenebilir kaynak).

Gerçek mesajlar: haber, Şikayetvar ve hukuk bürosu uyarı sayfalarında yayımlanmış,
kullanıcıların aldığı dolandırıcılık SMS'leri. İsim, telefon, link anonimleştirildi:
  [İSİM] → kişi/büro adı   [TEL] → cep numarası   [LİNK] → bağlantı   [TUTAR] → para tutarı
Sabit hat numaraları 0212 000 00 00 gibi sahte değerlerle değiştirildi. Kaynak sayfada
"..." ile kısaltılmış mesajlar görünen kısmıyla alındı.

Sentetik mesajlar (synthetic=True): belgelenen kalıplardan elle yazıldı, YALNIZCA
eğitim setine girer (bkz. load_data.split). Etiket 0 olanlar, modelin her kargo/banka
mesajını şüpheli saymaması için gerçekçi güvenli kurumsal mesajlardır.

Çalıştırma: python -m scripts.build_scam_tr
"""

import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "scam_tr.csv"
COLLECTED_AT = "2026-10-18"

SV_KARGO = "https://www.sikayetvar.com/kargo-sms-dolandiriciligi"
SV_TESLIM = "https://www.sikayetvar.com/kargo-sms-dolandiriciligi/kargonuz-teslim-edilemedi"
SV_PTT = "https://www.sikayetvar.com/kargo-sms-dolandiriciligi/ptt"
SV_UZLAS = "https://www.sikayetvar.com/dava-icra-sms-dolandiriciligi/uzlastirma"
SV_ICRA = "https://www.sikayetvar.com/dava-icra-sms-dolandiriciligi"
WEBRECORD = "https://webrecord.media/sahte-kargo-ve-e-devlet-smsi-nasil-anlasilir-gercek-orneklerle-dolandirici-mesaj-rehberi/"
UZUNTOK = "https://fatihuzuntok.av.tr/hizmetlerimiz/i-s-hukuku/son-zamanlarda-dolandiricilik-mesajlarina-karsi-kapsamli-rehber"
METESAHIN = "https://www.avukatmetesahin.com/post/icra-takibi-sms-dolandiriciligi-ve-sahte-mesajlar"
CILGIN = "https://cilginteknoloji.com/sahte-sms/"
VEGA = "https://vegahukukistanbul.com/blog/sahte-icra-mesaji-dolandiriciligi"
BIRLIK = "https://www.gazetebirlik.com/gundem/dolandiricilarin-hgs-ve-ispark-tuzagi-bu-linklere-dikkat/168505"
CUMHURIYET = "https://www.cumhuriyet.com.tr/turkiye/yurttasin-telefonuna-giden-hgs-borcunuz-var-mesaji-yeni-yontem-oldu-dolandirici-tuzagi-2409478"

REAL_SCAMS = [
    # Kargo / PTT
    ("Kargonuz adres hatası nedeniyle teslim edilemedi. Güncellemek için tıklayın.", WEBRECORD),
    ("Merhaba, 1 paketiniz var ancak adresiniz doğrulanamadı. Ek bilgi için bağlantıya tıklayın veya kargonuzu onaylamak için [TEL] numarasını arayın.", UZUNTOK),
    ("Yurtiçi Kargo: Siparişiniz teslim edilemedi, iadeyi önlemek için bilgilerinizi doğrulayın", SV_KARGO),
    ("Siparişiniz teslim edilemedi. İadeyi önlemek için bilgilerinizi doğrulayın: [LİNK]", SV_TESLIM),
    ("sn Müşterimiz mcd2026006616534 numaralı ve 56,74 TL faturaya [LİNK] adresinden ulaşabilirsiniz.", SV_KARGO),
    ("Gönderiniz işleme alındı, teslimat için bilgilerinizi onaylayın", SV_TESLIM),
    ("Yurtiçi Kargo: siparişiniz hazır. Teslimat bilgilerinizi onaylayın: [LİNK]", SV_TESLIM),
    ("PTT teslimat hatırlatıcısı Değerli müşterimiz, paketinizi birçok kez teslim etmeye çalıştık ancak adres bilgilerinizin hatalı olması nedeniyle teslimat gerçekleştirilemedi! Lütfen bilgileri 6 saat içinde düzeltin:", SV_TESLIM),
    ("Paketiniz depomuza ulaştı, ancak eksik adres nedeniyle teslim edemiyoruz. Lütfen teslimat bilgilerinizi", SV_TESLIM),
    ("PTT ekspres teslimat hatırlatması; paketiniz kurye depomuzda kaldı.", SV_TESLIM),
    ("PTT bilgilendirme. Sn ilgili tebligatınız teslim edilememiştir. Detaylı bilgi için arayınız. [TEL]", SV_PTT),
    ("Ziraat Bankası 2709659538381 barkod numaralı gönderiniz dağıtıma çıkarılmıştır, gün içinde 0312 000 00 00 numaralı", SV_PTT),
    ("Kargonuz teslim edilemedi, adres bilginizi güncelleyin", CILGIN),
    # Banka / hesap
    ("Kartınız güvenlik nedeniyle bloke edildi, açmak için tıklayın.", WEBRECORD),
    ("Sayın müşterimiz, hesabınızda şüpheli işlem tespit edilmiştir. Hesabınız 24 saat içinde bloke edilecektir. Hemen doğrulamak için tıklayın: [LİNK]", UZUNTOK),
    ("Acil: Hızlı kâr fırsatı — hesabınıza 3 gün içinde %30 getiri. Başlamak için kimliğinizi ve IBAN'ınızı gönderin.", UZUNTOK),
    ("Bilgisayarınız virüs kapladı. Uzaktan yardım için bu bağlantıyı indirip çalıştırın: [LİNK]", UZUNTOK),
    # e-Devlet / vergi / icra / mahkeme
    ("e-Devlet şifreniz askıya alındı", WEBRECORD),
    ("e-Devlet şifreniz iptal edilecek", CILGIN),
    ("Vergi borcunuz nedeniyle dosyanız icraya verildi. Borcu öğrenmek ve itiraz etmek için tıklayın: [LİNK]", UZUNTOK),
    ("Mahkeme kararına göre hakkınızda 7 gün içinde hapis cezası uygulanacaktır. Kararı ve itiraz haklarınızı görmek için tıklayın: [LİNK]", UZUNTOK),
    ("Hakkınızda icra takibi başlatılmıştır, detaylar için e-Devlet linkine tıklayın", VEGA),
    ("Hakkınızda icra takibi başlatıldı, 24 saat içinde ödeme yapmanız gerekiyor, aksi takdirde haciz işlemi uygulanacaktır. Detaylar", VEGA),
    ("e-tebligatınızın yasal süresi dolmuştur", SV_UZLAS),
    ("Sayın [İSİM], uzlaştırma dosyanızın son günüdür, bilgi almak için iletişime geçiniz", SV_UZLAS),
    ("Sayın, adil ceza dosyanız uzlaştırma kapsamına alınmıştır, bilgi için iletişime geçiniz", SV_UZLAS),
    ("Sn. [İSİM] uzlaştırma dosyanızın savcılığa iadesi için son gündür, mağduriyet yaşamamak adına arayın: [İSİM] h. B. 0212 000 00 00", SV_UZLAS),
    ("Hakkınızda açılmış uzlaştırma dosyanızın bugün bizdeki son günüdür, lütfen en kısa sürede dönüş sağlayın", SV_UZLAS),
    ("Sn. Müvekkilimiz, uzlaşma dosyanızın son günüdür. Lütfen irtibata geçiniz. [İSİM] Hukuk 0312 000 00 00", SV_UZLAS),
    ("Sn. [İSİM] Uzlaştırma dosyanızın Savcılığa iadesi için son günüdür. Mağduriyet yaşamamak adına arayın: [İSİM] h. B. 0312 000 00 01", SV_UZLAS),
    ("evraklarınız uzlaştırmaya gitmekte", SV_UZLAS),
    ("Sn. [İSİM], uzlaşma dosyanız büromuza devredilmiştir. Bugün 17:00'ye kadar aramazsanız hakkınızda ağır ceza", METESAHIN),
    ("Hakkınızda yasadışı bahis oynadığınız tespit edilmiştir", METESAHIN),
    ("Sipariş verip teslim almadığınız kargo yüzünden firmamız zarara uğradı. 3.000 TL icra masrafı ödememek için", METESAHIN),
    ("Adınız bir terör soruşturmasına karıştı, parayı güvenli hesaba aktarın", METESAHIN),
    ("Tarım kredisi borcunuz icraya düştü", METESAHIN),
    ("[TEL] nolu numarayı hemen arayın, yoksa evinize haciz gelir.", METESAHIN),
    ("Sayın [İSİM] dosyanız işleme alınmıştır. Bilgi için irtibata geçiniz. [İSİM] Hukuk Bürosu 0212 000 00 02", SV_ICRA),
    ("Sn. [İSİM] evraklarınız işleme alınmıştır. Bilgi için arayınız. [İSİM] hukuk bürosu tel: 0216 000 00 00", SV_ICRA),
    ("Sn. [İSİM] evraklarınız işleme alınmıştır. Bilgi almak için ulaşın. [İSİM] Hukuk Bürosu Tel: 0312 000 00 03", SV_ICRA),
    # HGS / geçiş
    ("Geçiş borcunuz var, ceza uygulanmadan ödeyin.", WEBRECORD),
    ("Ödenmemiş HGS Borcunuz var, icra işlemlerinin başlatılmaması adına ödeme yapmanız gerekiyor", BIRLIK),
    ("Borcunuzu ödemek için linke tıklayın", BIRLIK),
    ("HGS borcunuz var, icra işlemi başlatılacaktır", CUMHURIYET),
    # Ödül
    ("Tebrikler, telefon kazandınız.", WEBRECORD),
    ("Tebrikler! [TUTAR] TL para kazandınız. Ödülü almak için banka bilgilerinizi veya kimlik bilgilerinizi doğrulayın.", UZUNTOK),
]

# Belgelenen kalıplardan yazılmış sentetik dolandırıcılık mesajları (yalnızca eğitim).
SYNTHETIC_SCAMS = {
    "kargo": [
        "PTT: Gönderiniz gümrükte bekletilmektedir. [TUTAR] TL gümrük ücretini ödemezseniz iade edilecektir: [LİNK]",
        "Aras Kargo: Teslimat adresiniz eksik. 24 saat icinde guncellemezseniz paketiniz iade edilecek [LİNK]",
        "MNG Kargo bilgilendirme: paketiniz dagitim merkezinde, teslimat ucreti odenmedi. Odeme: [LİNK]",
        "Sayın alıcı, kargonuz için ek ücret gereklidir. Ödeme yapılmazsa gönderi iptal olacaktır. [LİNK]",
        "Paketiniz teslim edilemedi. Yeni teslimat tarihi secmek icin tiklayin [LİNK]",
        "Yurtici Kargo: Adresinize ulasilamadi. Kargonuz 2 gun sonra iade edilecek, hemen guncelleyin [LİNK]",
        "Gönderiniz yurt dışından geldi, teslim için kimlik doğrulaması yapmanız gerekiyor: [LİNK]",
        "PTT Kargo: [TUTAR] TL eksik posta ucreti bulunmaktadir. Bugun odenmezse gonderiniz imha edilecektir [LİNK]",
        "Trendyol siparişiniz depoda bekliyor. Teslimat için kart bilgilerinizi onaylayın [LİNK]",
        "Kargonuz şubede, teslim almak için 1,99 TL hizmet bedelini ödeyin: [LİNK]",
        "Surat Kargo: Paketinizin teslimati askiya alindi. Bilgilerinizi dogrulayin [LİNK]",
        "Değerli müşterimiz, siparişinizin teslimatı adres hatası nedeniyle başarısız oldu. Son gün bugün [LİNK]",
    ],
    "banka": [
        "Ziraat Bankası: Hesabınız güvenlik nedeniyle askıya alınmıştır. Açmak için bilgilerinizi güncelleyin [LİNK]",
        "Sayin musterimiz kartiniz yurt disinda kullanildi. Islemi siz yapmadiysaniz hemen iptal edin [LİNK]",
        "Garanti BBVA: Mobil bankacılık şifrenizin süresi doldu. Yenilemek için tıklayın [LİNK]",
        "İş Bankası: hesabınıza [TUTAR] TL bloke konuldu. Kaldırmak için kimlik doğrulaması yapın [LİNK]",
        "Kredi kartı aidatınız iade edilecektir. İade için kart bilgilerinizi girin [LİNK]",
        "Akbank: Kartınız bloke olmuştur. Müşteri temsilcimiz sizi arayacak, gelen kodu kendisine iletiniz.",
        "Banka hesabiniz 12 saat icinde kapatilacak. Engellemek icin dogrulama yapin [LİNK]",
        "Halkbank: Bonus puanlarınızın süresi bugün doluyor, [TUTAR] TL puanı nakde çevirmek için tıklayın [LİNK]",
        "Sayın müşterimiz, internet bankacılığı girişiniz engellendi. Doğrulama kodunu [TEL] numarasına iletin.",
        "Yapi Kredi: Hesabinizdan supheli para transferi yapildi. Itiraz icin [LİNK]",
        "Vakıfbank: Kart limitiniz [TUTAR] TL artırıldı, onaylamak için tıklayınız [LİNK]",
        "Kartınızın güvenlik kodu sistemde eksik görünüyor, işlemleriniz durdurulacaktır. Tamamlayın: [LİNK]",
    ],
    "edevlet": [
        "e-Devlet: Adınıza [TUTAR] TL destek ödemesi tanımlanmıştır. Başvuru için son gün bugün [LİNK]",
        "T.C. e-Devlet Kapısı: Elektrik fatura iadeniz hesaplandı. İade almak için tıklayın [LİNK]",
        "Sayın vatandaşımız, adınıza e-tebligat gönderilmiştir. Görüntülemek için giriş yapın [LİNK]",
        "e-Devlet: Emekli ikramiyeniz yatırılmak üzere onay beklemektedir. Onay için [LİNK]",
        "Gelir İdaresi: Vergi iadeniz bulunmaktadır. IBAN bilgilerinizi girerek iadenizi alın [LİNK]",
        "SGK: Prim borcunuz nedeniyle sağlık hizmetleriniz durdurulacaktır. Ödeme için [LİNK]",
        "e-devlet sifreniz 24 saat icinde iptal edilecektir. Yenilemek icin tiklayin [LİNK]",
        "Aile Bakanlığı: Yaşlı aylığı başvurunuz onaylandı. Ödeme için kart bilgilerinizi doğrulayın [LİNK]",
        "Trafik cezanız bulunmaktadır. 3 gün içinde ödenmezse ehliyetinize el konulacaktır [LİNK]",
        "Nüfus Müdürlüğü: Kimlik kartınızın geçerlilik süresi dolmuştur. Randevu ve ücret için [LİNK]",
        "turkiye.gov.tr: Hakkınızda düzenlenen ihtarnameyi görmek için tıklayınız [LİNK]",
        "Sayin vatandas, deprem yardimi hesabiniza aktarilmak uzere bekliyor. Onaylayin [LİNK]",
    ],
    "icra": [
        "Sn. [İSİM], hakkınızda başlatılan icra dosyası bugün kesinleşecektir. Bilgi için acil arayın 0212 000 00 10",
        "Avukatlık Bürosu: Ödenmemiş borcunuz nedeniyle maaşınıza haciz konulacaktır. Görüşme için [TEL]",
        "Hakkınızda açılan ceza davası ile ilgili ifadeniz alınacaktır. Dosyanız e-Devlette görünmez, bizi arayın [TEL]",
        "Sayın [İSİM], arabuluculuk dosyanız gizli statüdedir. Son gün bugün, büromuzla iletişime geçin 0312 000 00 11",
        "Icra dairesi: Borcunuz [TUTAR] TL. Bugun odenmezse evinize haciz memuru gelecektir. Odeme [LİNK]",
        "Sn. [İSİM] dosyanız savcılığa sevk edilmek üzeredir. Mağdur olmamak için en geç 16:00'ya kadar arayınız.",
        "Hakkınızda dolandırıcılık suçlamasıyla soruşturma başlatılmıştır. Detay için [LİNK]",
        "Karayolları geçiş ihlali nedeniyle hakkınızda icra takibi başlatıldı. Av. [İSİM] [LİNK]",
    ],
    "hgs_ceza": [
        "HGS: Ödenmemiş geçiş ücretiniz bulunmaktadır. 10 kat ceza uygulanmadan ödeyin [LİNK]",
        "OGS/HGS gecis ihlal borcunuz [TUTAR] TL. Son odeme tarihi bugun [LİNK]",
        "İSPARK: Ödenmemiş otopark borcunuz icraya devredilecektir. Hemen ödeyin [LİNK]",
        "KGM: Köprü ve otoyol geçiş borcunuz bulunmaktadır, ceza almamak için tıklayın [LİNK]",
        "Plakaniza kayitli gecis ihlali tespit edildi. Itiraz veya odeme icin [LİNK]",
    ],
    "odul": [
        "Turkcell: 20 yıllık müşterimiz olarak [TUTAR] TL hediye kazandınız! Almak için tıklayın [LİNK]",
        "Tebrikler! Çekilişimizde iPhone kazandınız. Kargo ücretini ödeyerek hediyenizi alın [LİNK]",
        "Vodafone puanlarınız bugün sona eriyor! [TUTAR] TL değerindeki puanınızı hemen kullanın [LİNK]",
        "Migros müşterisi olarak 500 TL alışveriş çeki kazandınız. Son gün: bugün [LİNK]",
        "Sayın abonemiz, hattınıza 50 GB hediye internet tanımlandı. Aktif etmek için [LİNK]",
        "TEBRIKLER! Sansli numaralar arasindasiniz, [TUTAR] TL odulunuzu almak icin bilgilerinizi girin [LİNK]",
        "Türk Telekom: faturanızdan [TUTAR] TL iade hakkı kazandınız, IBAN girin [LİNK]",
        "Bayram hediyeniz hazır! Ücretsiz kahve makinesi için sadece kargo bedeli ödeyin [LİNK]",
    ],
    "bahis_yatirim": [
        "Deneme bonusu 500 TL! Yatırımsız freespin için hemen üye ol [LİNK]",
        "Canli bahis ve casinoda %200 hosgeldin bonusu. Yeni adresimiz: [LİNK]",
        "Günde [TUTAR] TL kazanmak ister misiniz? Uzman ekibimizle kripto yatırımına başlayın [LİNK]",
        "Borsa sinyal grubumuza katilin, hafta sonuna kadar %40 garanti kazanc. WhatsApp: [TEL]",
        "Altın yatırımında kaçırılmayacak fırsat! Devlet destekli fon, hemen başvurun [LİNK]",
        "Binance TR: hesabınızdan çekim talebi oluşturuldu. Siz değilseniz iptal edin [LİNK]",
        "Yasal bahis degil ama kazandirir: deneme bonusu ve sinirsiz cevrim [LİNK]",
    ],
    "kisisel": [
        "Anne telefonum bozuldu, bu yeni numaram. Acil para lazım, şu IBAN'a gönderir misin TR12 0006 1000 0000 0000 0000 01",
        "Baba ben, numaramı değiştirdim. Okulda bir sorun oldu, acil [TUTAR] TL lazım. Kimseye söyleme.",
        "Merhaba, yanlışlıkla size doğrulama kodu gönderildi, lütfen gelen 6 haneli kodu bana iletir misiniz?",
        "WhatsApp hesabınız başka cihazda açılmak isteniyor. Engellemek için size gelen kodu bu numaraya yazın.",
        "Teyze ben komşunun oğlu, annem hastanede, bankadan para çekemiyorum. Hesabıma [TUTAR] TL atar mısın?",
    ],
}

# Gerçekçi, güvenli kurumsal mesajlar (etiket 0, yalnızca eğitim).
SYNTHETIC_SAFE = {
    "banka_otp": [
        "Garanti BBVA internet bankacılığı giriş şifreniz: 482913. Bu şifreyi kimseyle paylaşmayınız. B002",
        "İş Bankası: 1234 ile biten kartınızla yapılan 245,00 TL harcama onaylanmıştır.",
        "Ziraat Bankasi: Hesabiniza 3.500,00 TL maas odemesi yapilmistir. Iyi gunler dileriz.",
        "Akbank: Kartınızın son ödeme tarihi 25.10.2026, ödenecek tutar 1.250,40 TL.",
        "Doğrulama kodunuz 718204. Banka çalışanları bu kodu asla sizden istemez.",
        "Yapı Kredi: Otomatik ödeme talimatınızla elektrik faturanız ödenmiştir.",
        "Halkbank: 15.10.2026 tarihli 500 TL para transferiniz alıcı hesabına geçmiştir.",
        "QNB: Hesap ekstreniz hazırlanmıştır. Mobil uygulamadan görüntüleyebilirsiniz.",
    ],
    "kargo": [
        "Yurtiçi Kargo: 3XY123456 nolu gönderiniz dağıtıma çıkmıştır. Takip: yurticikargo.com",
        "PTT: RR123456789TR barkodlu gönderiniz şubemize ulaşmıştır. Kimliğinizle teslim alabilirsiniz.",
        "Aras Kargo: Gönderiniz bugün 18:00'e kadar teslim edilecektir.",
        "Trendyol siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler.",
        "MNG Kargo: Paketiniz teslim alındı. Teslim alan: kendisi.",
        "Hepsiburada: Siparişiniz kargoya verildi, uygulamadan takip edebilirsiniz.",
    ],
    "kamu_saglik": [
        "MHRS: 22.10.2026 09:30 tarihinde Dahiliye randevunuz oluşturulmuştur. Gelemeyecekseniz iptal ediniz.",
        "e-Nabız: Tahlil sonuçlarınız sisteme yüklenmiştir.",
        "Sayın vatandaşımız, grip aşınız için aile hekiminize başvurabilirsiniz.",
        "Eczane: Reçeteli ilaçlarınız hazırdır, gün içinde teslim alabilirsiniz.",
        "E-Devlet Kapısı şifreniz değiştirilmiştir. Bu işlemi siz yapmadıysanız ALO 160'ı arayınız.",
        "Nüfus Müdürlüğü randevunuz 28.10.2026 saat 10:15 olarak kaydedilmiştir.",
        "Aile hekiminiz Dr. randevunuz yarın saat 11:00'dedir.",
        "SGK: Emekli aylığınız hesabınıza yatırılmıştır.",
    ],
    "fatura_operator": [
        "Turkcell: Ekim ayı faturanız 289,90 TL, son ödeme tarihi 30.10.2026.",
        "Vodafone: Paketinizin 5 GB internet hakkının %80'ini kullandınız.",
        "Türk Telekom: Arıza kaydınız kapatılmıştır. Memnuniyet için teşekkür ederiz.",
        "İGDAŞ: Doğalgaz faturanız 845,60 TL. Son ödeme 05.11.2026.",
        "Elektrik kesintisi: 20.10.2026 10:00-14:00 arası mahallenizde planlı bakım yapılacaktır.",
        "ISKI: Su faturaniz 210,50 TL olarak tahakkuk etmistir.",
    ],
    "gunluk": [
        "Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?",
        "İlacını içtin mi baba? Akşam ararım.",
        "Toplantı yarına ertelendi, saat 10'da görüşelim.",
        "Doğum günün kutlu olsun teyzeciğim, nice mutlu yıllara!",
        "Pazardan domates ve biber aldım, kapıya bıraktım.",
        "Hastane randevuna ben götüreceğim, 9'da kapıda ol.",
    ],
}


def main() -> None:
    rows = [
        {"text": t, "label": 1, "source": url, "collected_at": COLLECTED_AT, "synthetic": False}
        for t, url in REAL_SCAMS
    ]
    for category, texts in SYNTHETIC_SCAMS.items():
        rows += [
            {"text": t, "label": 1, "source": f"sentetik:{category}", "collected_at": COLLECTED_AT, "synthetic": True}
            for t in texts
        ]
    for category, texts in SYNTHETIC_SAFE.items():
        rows += [
            {"text": t, "label": 0, "source": f"sentetik_guvenli:{category}", "collected_at": COLLECTED_AT, "synthetic": True}
            for t in texts
        ]
    with OUT.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label", "source", "collected_at", "synthetic"])
        writer.writeheader()
        writer.writerows(rows)
    real = len(REAL_SCAMS)
    print(f"{OUT.name}: {len(rows)} satır (gerçek dolandırıcılık {real}, sentetik {len(rows) - real})")


if __name__ == "__main__":
    main()
