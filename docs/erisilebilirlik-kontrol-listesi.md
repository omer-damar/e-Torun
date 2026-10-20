# e-Torun — Erişilebilirlik kontrol listesi (iPhone, elle)

Otomatik testler (`app/__tests__/accessibility.test.tsx`, `screenReader.test.tsx`) kodu ölçer: yazı boyutu,
kontrast, buton rolü/etiketi, dokunma alanı, başlık, İngilizce terim. Bu liste ise **gerçek telefonda** ancak
insanın görebileceği şeyler içindir: VoiceOver'ın gerçekte ne okuduğu, büyük yazıda taşma, odak sırası.
Hedefler `PROJE_PLANI.md` bölüm 10'dadır.

Her madde için sonuç sütununa **✔** (sorun yok), **✘** (sorun var, notu yazın) ya da **—** (denenmedi) yazın.

| Test tarihi | Telefon / iOS sürümü | Deneyen | Uygulama sürümü (commit) |
|---|---|---|---|
| | | | |

---

## 0. Hazırlık

- Telefonun dili **Türkçe** olmalı (VoiceOver Türkçe sesle okusun).
- Ayarlar › Erişilebilirlik › **Erişilebilirlik Kısayolu** › VoiceOver'ı seçin. Böylece yan tuşa üç kez
  basarak VoiceOver açılıp kapanır.
- Uygulamayı Expo Go'da açın. Sağ alttaki dişli düğmesi **Expo Go'ya aittir**, uygulamanın parçası değildir;
  değerlendirmeye katmayın.
- Örnek verilerde gerçek kişi bilgisi kullanmayın: kişi "Ayşe (Kızım)", telefon `0555 000 00 00`,
  ilaç "Tansiyon ilacı, 1 tablet, 08:00 ve 20:00".
- 112 denemelerinde onay penceresinde her zaman **Hayır**'a basın.

### VoiceOver hareketleri (kısa hatırlatma)

| Hareket | Ne yapar |
|---|---|
| Tek parmakla sağa / sola kaydır | Sonraki / önceki öğe |
| Çift dokunma | Seçili öğeye bas |
| İki parmakla yukarı kaydır | Ekranın tamamını baştan oku |
| Rotor (iki parmakla çevirme) › Başlıklar, sonra aşağı/yukarı kaydır | Başlıklar arasında atla |
| İki parmakla dokunma | Okumayı durdur |

---

## 1. VoiceOver ile ekran ekran

| # | Ekran | Ne yapılır | Beklenen | Sonuç |
|---|---|---|---|---|
| 1.1 | Açılış görseli | VoiceOver açıkken uygulamayı başlatın | "e-Torun. Dijital torununuz…" okunur; dokununca ana ekrana geçer, kendisi de ~2,5 sn'de kapanır | |
| 1.2 | Kurulum | Adımları VoiceOver ile tamamlayın | Her adımda "Adım 2 / 4" yerine "2. adım, toplam 4" okunur | |
| 1.3 | Kurulum | "Başlayalım" / "İleri"ye basın | Yeni adımın adı **kendiliğinden söylenir** ("Size nasıl hitap edelim? 2. adım, toplam 4") | |
| 1.4 | Kurulum › Yakın | Adı boş bırakıp Kaydet'e basın | Hata kutunun altında görünür **ve** okunur ("Adı: …") | |
| 1.5 | Kurulum › Bildirim | "İzin ver" › iOS penceresinde "İzin Verme" | "Bildirim izni verilmedi" uyarısı kendiliğinden okunur | |
| 1.6 | Ana ekran | Soldan sağa gezin | Sıra: Ayarlar › selamlama başlığı › tarih › İlaçlarım › Acil Yardım › Mesajı Kontrol Et | |
| 1.7 | Ana ekran | İlaçlarım butonunda durun | "İlaçlarım. Sıradaki: …" okunur; **emoji adı okunmaz** ("hap", "uyarı işareti" gibi) | |
| 1.8 | Ana ekran | Stok uyarısı varken | Uyarı metni ve "Tansiyon ilacı için randevu al" okunur | |
| 1.9 | Bugünkü ilaçlarım | İlaç kartında durun | "08:00, Tansiyon ilacı, 1 tablet, beyaz renkli. Bekliyor" **bir kez** okunur ("kum saati" denmez) | |
| 1.10 | Bugünkü ilaçlarım | ALDIM'a çift dokunun | "Tansiyon ilacı alındı olarak işaretlendi. 10 saniye içinde geri alabilirsiniz." okunur | |
| 1.11 | Bugünkü ilaçlarım | 10 sn içinde Geri al | "… Aldım işareti geri alındı." okunur | |
| 1.12 | İlaç ekle | Sihirbazı ilerletin | Her adımda yeni adımın adı ve sırası okunur | |
| 1.13 | İlaç ekle › Saat | + / − butonlarına basın | Her basışta yeni saat okunur ("saat 9 tam", "saat 8, 5 geçe") | |
| 1.14 | İlaç ekle | Ad boşken İleri | Hata uyarısı kendiliğinden okunur | |
| 1.15 | İlaç ekle › Günler | Bir günü seçin / kaldırın | "seçili / seçili değil" durumu okunur | |
| 1.16 | Stok | "Yeni kutu aldım" › 28 › Ekle | "28 tane eklendi. Şimdi elinizde … var." okunur | |
| 1.17 | Son 7 gün | Rotor › Başlıklar | Her gün bir başlık olarak atlanabilir | |
| 1.18 | Acil Yardım | Kişi butonunda durun | "Ayşe (Kızım) kişisini ara. Sıfır, beş, beş, beş…" numara tek tek rakamlarla okunur ("beş yüz elli beş" denmez) | |
| 1.19 | Acil Yardım | 112 ACİL › çift dokunma | Onay penceresi açılır, odak pencerenin **içinde kalır** (arkadaki butonlara geçilmez); Hayır ile kapanır | |
| 1.20 | Mesaj kontrol | Kutu boşken "Kontrol Et" | Buton soluk değil; "Önce mesajı yapıştırın…" uyarısı okunur | |
| 1.21 | Mesaj kontrol | Panodan yapıştır (pano boş) | "Kopyalanmış bir mesaj bulunamadı…" okunur | |
| 1.22 | Sonuç (kırmızı) | Örnek A ile kontrol edin | İlk okunan: "Sonuç" başlığı, sonra "Yüksek risk. …"; "giriş yok" (⛔) denmez; nedenlerde "madde işareti" denmez | |
| 1.23 | Sonuç | "Sesli oku" | Türkçe, yavaş okur; emoji okunmaz; "Okumayı durdur" ile durur | |
| 1.24 | Sonuç | "Ayşe kişisine sor" | Mesajlar uygulaması hazır metinle açılır, **göndermez** | |
| 1.25 | Ayarlar | Yazı boyutu seçenekleri | "Büyük, seçili" / "Çok büyük" durumu okunur | |
| 1.26 | Ayarlar | Tüm verilerimi sil | İki ayrı onay penceresi; ikisinde de Hayır ile çıkılabilir | |
| 1.27 | Her ekran | Rotor › Başlıklar | Her ekranın en az bir başlığı var; ekran adı başlık olarak okunur | |
| 1.28 | Her ekran | Alttaki "Ana Sayfa" | Her ekranda var (ana ekran ve kurulum hariç), "Ana Sayfa. Ana ekrana döner" okunur | |

**Örnek mesajlar** (panoya kopyalayıp deneyin, gerçek değildir):

- **A (kırmızı):** `Sayın müşterimiz, hesabınız 24 saat içinde bloke edilecektir. Hemen doğrulayın: https://banka-dogrula.xyz/giris`
- **B (yeşil):** `Anne akşam yemeğe geliyoruz, bir şey almamız lazım mı?`
- **C (reklam, mavi):** `Sonbahar indirimi başladı! Tüm ürünlerde %30 indirim. Mağazalarımızda. Ret için RET yazıp 3330'a gönderin. B002`

---

## 2. Büyük yazı (Dynamic Type)

Ayarlar › Erişilebilirlik › Ekran ve Metin Boyutu › **Daha Büyük Metin**: açın ve kaydırıcıyı en sağa getirin.
Uygulamada Ayarlar › Yazı boyutu › **Çok büyük** seçin. (Uygulama sistem büyütmesini en fazla 1,4 kat uygular.)

| # | Ne yapılır | Beklenen | Sonuç |
|---|---|---|---|
| 2.1 | Bütün ekranları gezin | Hiçbir yazı kesilmez, üst üste binmez, "…" ile kısalmaz (yalnızca sonuç ekranındaki alıntı mesaj 6 satırla sınırlıdır) | |
| 2.2 | Ana ekran | Ayarlar butonu başlığın **üstünde**, başlık harf harf bölünmüyor | |
| 2.3 | Ayarlar › Yakınlarım | "Düzenle" ve "Sil" sığmazsa alt alta geçer | |
| 2.4 | Saat seçici | Saat rakamı ve +/− butonları ekrana sığar | |
| 2.5 | Uygulama açıkken sistem yazı boyutunu değiştirin, geri dönün | Yazılar yeni boyuta göre yeniden çizilir, kırpılma yok | |
| 2.6 | Klavye açıkken (kişi ekle, mesaj kutusu) | Yazı kutusu ve altındaki buton klavyenin altında kalmaz, kaydırılarak ulaşılır | |
| 2.7 | Kaydırma | Uzun ekranlarda içerik kayar, **Ana Sayfa butonu hep görünür** | |

---

## 3. Renk ve görme

| # | Ayar | Beklenen | Sonuç |
|---|---|---|---|
| 3.1 | Erişilebilirlik › Ekran ve Metin Boyutu › Renk Filtreleri › **Gri Tonlama** | Sonuç seviyeleri yalnızca renkle değil, simge + yazıyla ayırt edilir ("Yüksek risk", "Dikkat", "Belirgin risk yok", "Reklam mesajı") | |
| 3.2 | Gri tonlamada ilaç durumu | "Bekliyor / Alındı / Saati geçti" yazıyla okunur | |
| 3.3 | Gri tonlamada seçenekler | Seçili olan ✓ ve "Seçili" yazısıyla belli | |
| 3.4 | **Kalın Metin** açık | Düzen bozulmuyor | |
| 3.5 | **Kontrastı Artır** açık | Düzen bozulmuyor | |
| 3.6 | Güneş altında / ekran parlaklığı en düşükte | Ana ekrandaki üç buton okunabiliyor | |

---

## 4. Dokunma ve motor beceri

| # | Ne yapılır | Beklenen | Sonuç |
|---|---|---|---|
| 4.1 | Tüm butonlara başparmakla basın | Yanlışlıkla komşu butona basılmıyor (butonlar ≥ 64pt, aralarında boşluk var) | |
| 4.2 | Onay pencereleri | Evet ve Hayır arasında geniş boşluk; Evet'e kazara basmak zor | |
| 4.3 | Her ana butona basın | Hafif titreşim hissedilir | |
| 4.4 | ALDIM'a yanlışlıkla basın | 10 sn boyunca "Geri al" çıkar | |
| 4.5 | Saat seçici | Kaydırma tekerleği yok; yalnızca + / − dokunuşu | |
| 4.6 | Ayarlar › Erişilebilirlik › Dokunma › **Dokunma Uyarlamaları** (Tutma Süresi açık) | Butonlar yine çalışır | |

---

## 5. Anlaşılırlık

| # | Ne yapılır | Beklenen | Sonuç |
|---|---|---|---|
| 5.1 | Bütün ekranları okuyun | İngilizce kelime ve teknik terim yok; yaşlı biri her yazıyı ilk okuyuşta anlıyor (anlaşılmayan kelimeyi not edin) | |
| 5.2 | Hata mesajları | Ne olduğunu **ve ne yapılacağını** söylüyor ("Kutudaki sayıyı rakamla yazın. Örnek: 28") | |
| 5.3 | Uyarılar | Kendiliğinden kaybolmuyor (toast yok); sorun çözülene kadar kalıyor | |
| 5.4 | Sonuç ekranı | Olasılık yüzdesi gösterilmiyor; ne yapılacağı tek cümleyle söyleniyor | |
| 5.5 | Kurulum | Bir yaşlı kullanıcı yardımsız tamamlayabiliyor (bkz. saha testi) | |

---

## 6. Bulunan sorunlar

| # | Madde | Ne oldu | Ekran görüntüsü | Önem (yüksek/orta/düşük) | Düzeltildi mi (commit) |
|---|---|---|---|---|---|
| | | | | | |
