# e-Torun — Proje Planı ve Gereksinim Dokümanı

> Ders: Sosyal Sorumluluk · Prof. Dr. Akın Özçift · Teslim: **30 Aralık 2026** · Hedef bitiş: **13 Aralık 2026**
> Geliştirici: Ömer Faruk Damar · Ortam: Windows + iPhone (Expo Go) · Araç: Claude Code

---

## 0. İçindekiler
1. Problem, amaç, hedef kitle
2. Kapsam (MVP / ekstra / kapsam dışı)
3. Geliştirme ortamı ve kısıtlar (Windows + iPhone)
4. Mimari ve klasör yapısı
5. Modül A — Ana ekran, kurulum, ayarlar
6. Modül B — İlaç hatırlatıcı
7. Modül C — Acil yardım
8. Modül D — Mesaj kontrolü (ML + kurallar)
9. Makine öğrenmesi hattı (ml/)
10. Erişilebilirlik ve tasarım sistemi
11. Gizlilik, etik, güvenlik
12. Test stratejisi
13. Saha uygulaması (kullanıcı testi) — "nerede, ne zaman"
14. Zaman planı (haftalık)
15. Rapor (PDF) içeriği ve toplanacak görseller
16. Claude Code ile çalışma akışı ve ilk komutlar
17. Riskler ve B planları

---

## 1. Problem, amaç, hedef kitle

**Problem.** Yaşlı bireyler üç alanda dijital olarak savunmasız kalıyor:
- **İlaç takibi:** Birden fazla ilaç ve saat; unutma ya da çift doz riski.
- **Acil durum:** Akıllı telefonda rehbere girip doğru kişiyi bulmak stres anında zor.
- **SMS dolandırıcılığı:** e-Devlet, kargo, banka, icra, "ödül kazandınız" gibi sahte mesajlar en çok bu yaş grubunu hedef alıyor.

**Amaç.** Bu üç ihtiyacı, yaşlı kullanıcıya göre tasarlanmış **tek, sade, çevrimdışı ve gizliliği koruyan** bir mobil uygulamada toplamak.

**Hedef kitle.** 60+ yaş, akıllı telefonu temel düzeyde kullanan (arama yapabilen, WhatsApp kullanan) bireyler. İkincil kullanıcı: uygulamayı ilk kurulumda ayarlayan yakın (çocuk/torun).

**Rapor için istatistik:** Problem bölümüne Emniyet Genel Müdürlüğü, BTK, USOM veya bankaların yayımladığı resmi uyarı ve verilerden 1–2 güncel kaynak eklenecek (hafta 8'de araştırılır, uydurma rakam kullanılmaz).

---

## 2. Kapsam

Öncelik: **P0** = olmazsa olmaz, **P1** = MVP'de olmalı, **P2** = vakit kalırsa.

| ID | Özellik | Öncelik |
|---|---|---|
| A1 | 3 büyük butonlu ana ekran | P0 |
| A2 | İlk kurulum sihirbazı (isim, yakın kişi, bildirim izni) | P0 |
| A3 | Ayarlar: yazı boyutu, sesli okuma, kişiler, tüm verileri sil | P1 |
| B1 | İlaç ekle / düzenle / sil (ad, doz, saatler, günler) | P0 |
| B2 | Saatinde yerel bildirim | P0 |
| B3 | "Bugünkü ilaçlarım" listesi ve "ALDIM" işaretleme | P0 |
| B4 | Son 7 günün geçmişi (alındı/atlandı) | P1 |
| B5 | 15 dk içinde işaretlenmezse tekrar hatırlatma | P2 |
| B6 | İlaç stoğu takibi: kullanıma göre kaç gün kaldığını hesaplama, bitmeden uyarma | P1 |
| B7 | İlaç bitmek üzereyken randevu yönlendirmesi: MHRS / ALO 182 veya yakına hazır SMS | P1 |
| C1 | En fazla 3 yakın kişi, tek dokunuşla arama | P0 |
| C2 | 112 butonu (onay pencereli) | P0 |
| C3 | Konumumu SMS ile gönder | P2 |
| D1 | Mesaj yapıştır / panodan al | P0 |
| D2 | ML modeli ile risk skoru (cihaz içinde) | P0 |
| D3 | Kural tabanlı, anlaşılır gerekçeler | P0 |
| D4 | Yeşil / sarı / kırmızı sonuç ekranı + öneriler | P0 |
| D5 | Sonucu sesli okuma | P1 |
| D6 | "Yakınıma sor" → mesajı yakına SMS ile iletme | P1 |
| D7 | Dolandırıcılık türleri hakkında kısa bilgi kartları | P2 |

**Kapsam dışı (bilinçli):** gelen SMS'leri otomatik okuma (iOS izin vermez), sunucu/bulut, kullanıcı hesabı, App Store yayını, Android'e özel özellikler, push bildirim.

---

## 3. Geliştirme ortamı ve kısıtlar

### Kurulacaklar (Windows)
- Node.js LTS, Git for Windows, VS Code
- Python 3.11 veya 3.12 (kurulumda "Add to PATH" işaretli)
- Claude Code
- iPhone'a App Store'dan **Expo Go**

### Expo Go kuralları (en kritik kısıt)
- Mac olmadığı için Xcode, iOS simülatörü ve özel "development build" yok. **Her şey Expo Go içinde çalışmak zorunda.**
- App Store'daki Expo Go yalnızca **en güncel Expo SDK'yı** destekler. `create-expo-app@latest` bazen Expo Go'dan önce yeni SDK'ya geçer (Ekim 2026: şablon SDK 58, Expo Go SDK 57). Proje Expo Go'nun desteklediği SDK ile kurulur: `npx create-expo-app@latest --template default@sdk-57`.
- Paketler `npx expo install` ile eklenir (SDK ile uyumlu sürümü seçer).
- **Yerel bildirimler Expo Go'da çalışır**, push bildirimler çalışmaz. Bu proje için yalnızca yerel bildirim gerekiyor.
- Kullanılacak paketlerin hepsi Expo Go'da hazır gelir: `expo-notifications`, `expo-speech`, `expo-clipboard`, `expo-haptics`, `expo-linking`, `@react-native-async-storage/async-storage`, (P2) `expo-location`, `expo-contacts`.

### Bağlantı sorunları
- iPhone ve bilgisayar **aynı Wi-Fi**'da olmalı. Windows Güvenlik Duvarı ilk çalıştırmada Node için izin ister → "Özel ağlar" için izin ver.
- Yurt veya kampüs ağı cihazlar arası trafiği engelleyebilir → `npx expo start --tunnel`.
- Sessiz modda iOS bildirim sesini çalmaz. Kullanıcı testinde bunu not et.

---

## 4. Mimari ve klasör yapısı

```
yanimda/
├─ CLAUDE.md
├─ README.md
├─ .gitignore
├─ docs/
│  ├─ PROJE_PLANI.md
│  ├─ rapor/                 # ekran görüntüleri, saha fotoğrafları, diyagramlar
│  └─ kullanici-testi/       # onam metni, görev senaryoları, anket (kişisel veri yok)
├─ ml/
│  ├─ requirements.txt
│  ├─ data/
│  │  ├─ raw/                # indirilen veri setleri (lisans belirsizse .gitignore)
│  │  ├─ scam_tr.csv         # elle toplanan dolandırıcılık SMS'leri (anonim)
│  │  └─ processed/
│  ├─ src/
│  │  ├─ normalize.py        # TS ile birebir aynı
│  │  ├─ load_data.py
│  │  ├─ train.py            # model karşılaştırma + seçim
│  │  ├─ evaluate.py         # metrikler, karışıklık matrisi, eşik analizi
│  │  └─ export_model.py     # model.json + parity_vectors.json
│  ├─ tests/test_normalize.py
│  ├─ reports/               # metrics.json, confusion_matrix.png, pr_curve.png
│  └─ exports/parity_vectors.json
└─ app/
   ├─ app.json
   ├─ app/                   # expo-router ekranları (SDK 57 şablonunda fiilen src/app/ altında)
   │  ├─ _layout.tsx
   │  ├─ index.tsx           # ana ekran
   │  ├─ kurulum.tsx
   │  ├─ ayarlar.tsx
   │  ├─ ilaclar/index.tsx   # bugünkü ilaçlar
   │  ├─ ilaclar/liste.tsx   # tüm ilaçlar
   │  ├─ ilaclar/duzenle.tsx # ekle/düzenle (?id=)
   │  ├─ ilaclar/gecmis.tsx
   │  ├─ acil.tsx
   │  ├─ mesaj/index.tsx     # yapıştır + kontrol et
   │  └─ mesaj/sonuc.tsx
   ├─ src/
   │  ├─ theme/              # colors.ts, typography.ts, spacing.ts
   │  ├─ components/         # BigButton, ScreenContainer, HomeButton, TimePickerBig, ConfirmDialog, RiskBadge
   │  ├─ storage/            # tip güvenli AsyncStorage sarmalayıcı + şema sürümü
   │  ├─ features/
   │  │  ├─ medications/     # model, schedule.ts (saf), notifications.ts, store.ts
   │  │  ├─ emergency/       # contacts store, call.ts
   │  │  └─ settings/
   │  └─ detector/
   │     ├─ normalize.ts
   │     ├─ ngrams.ts        # sklearn char_wb birebir
   │     ├─ tfidf.ts
   │     ├─ classify.ts      # olasılık
   │     ├─ rules.ts         # açıklanabilir kurallar
   │     ├─ decide.ts        # olasılık + kurallar → yeşil/sarı/kırmızı
   │     └─ model.json       # ml/ tarafından üretilir, elle düzenlenmez
   └─ __tests__/
```

**Veri akışı (Mesaj kontrolü):**
`metin → normalize → char n-gram → TF-IDF (idf, sublinear, L2) → lojistik regresyon → p`
`ham metin → rules → tetiklenen kurallar + gerekçeler`
`(p, kurallar) → decide → {seviye, başlık, gerekçeler[], öneriler[]}`

**Depolama şeması** (AsyncStorage, anahtar başına JSON, `schemaVersion` alanıyla):
- `settings` → `{ schemaVersion, userName, fontScale: 'buyuk'|'cokBuyuk', speechEnabled, onboardingDone }`
- `contacts` → `Contact[]` → `{ id, name, relation, phone }` (en fazla 3)
- `medications` → `Medication[]` → `{ id, name, dose, times: "HH:mm"[], days: 'everyday' | number[] /*1=Pzt..7=Paz*/, note?, color, active, notificationIds: string[], stock?: MedicationStock, refill?: RefillInfo }`
  - `MedicationStock` → `{ unitsPerDose /*her alımda kaç adet, ör. 1 tablet*/, remainingUnits, updatedAt /*ISO*/, lowStockNotificationId? }`
  - `RefillInfo` → `{ department? /*ör. "Kardiyoloji"*/, doctor?, hospital?, contactId? /*SMS gidecek yakın*/ }`
- `doseLog` → `DoseLogEntry[]` → `{ medicationId, scheduledAt /*ISO*/, status: 'taken'|'skipped', recordedAt }` (30 günden eskisi silinir; bu yüzden stok, geçmişten hesaplanmaz, `stock.remainingUnits` üzerinde tutulur)
- `settings` içine: `refillWarningDays` (varsayılan 10)

---

## 5. Modül A — Ana ekran, kurulum, ayarlar

### A1 Ana ekran
- Üstte "Merhaba, {isim}" ve tarih (ör. "18 Ekim Pazar").
- Alt alta 3 büyük kart-buton, her biri ikon + iki satır metin:
  - 💊 **İlaçlarım** — altında "Sıradaki: 20:00 Tansiyon ilacı" (yoksa "Bugün başka ilaç yok"). Stoğu azalan ilaç varsa altında ⚠️ "Tansiyon ilacınız 8 gün sonra bitecek" satırı (B6).
  - 📞 **Acil Yardım** — "Yakınınızı veya 112'yi arayın".
  - ✉️ **Mesajı Kontrol Et** — "Şüpheli mesajı kontrol edin".
- Sağ üstte küçük değil, en az 64pt "Ayarlar" butonu.

### A2 Kurulum sihirbazı (ilk açılışta, 4 adım)
1. Hoş geldiniz + uygulamanın 3 işlevini anlatan tek ekran.
2. "Size nasıl hitap edelim?" (isim, isteğe bağlı).
3. Yakın kişi ekle (ad, yakınlık, telefon; en az 1 önerilir, atlanabilir).
4. Bildirim izni: önce **kendi açıklama ekranımız** ("İlaç saatlerinde size haber verebilmemiz için izin vermeniz gerekiyor"), sonra sistem izni. Reddedilirse ana ekranda kalıcı, sakin bir uyarı + "Ayarları aç" (`Linking.openSettings()`).

### A3 Ayarlar
- Yazı boyutu: Büyük / Çok büyük (önizlemeli).
- Sesli okuma: Açık / Kapalı.
- Yakın kişileri düzenle.
- "Tüm verilerimi sil" (2 aşamalı onay, bildirimleri de iptal eder).
- Hakkında: sürüm, "Verileriniz yalnızca bu telefonda saklanır."

**Kabul kriterleri:** Kurulum bir kez gösterilir. Uygulama kapatılıp açılınca veriler durur. "Tüm verilerimi sil" sonrası planlı bildirim sayısı 0 olur.

---

## 6. Modül B — İlaç hatırlatıcı

### Ekranlar
- **Bugünkü ilaçlarım:** Bugünün tüm dozları saat sırasıyla. Her satırda saat, ilaç adı, doz ve durum (⏳ Bekliyor / ✅ Alındı / ⚠️ Saati geçti). Bekleyen doz için büyük **ALDIM** butonu. Yanlışlıkla basılırsa 10 sn boyunca görünür "Geri al" butonu (toast değil, satırda).
- **Tüm ilaçlar:** Liste + "İlaç ekle".
- **İlaç ekle/düzenle:** Adım adım form (tek ekranda uzun form yerine):
  1. İlacın adı (serbest metin, ör. "Tansiyon ilacı").
  2. Doz (serbest metin, ör. "1 tablet").
  3. Saat(ler): büyük +/− düğmeli saat seçici (saat ve dakika 5'er dk adımla). Birden fazla saat eklenebilir.
  4. Günler: "Her gün" (varsayılan) veya gün seçimi.
  5. Renk/ikon seçimi (kutudaki ilacı tanımaya yardım).
  6. Özet + Kaydet.
- **Geçmiş:** Son 7 gün, gün gün alındı/atlandı.

### Bildirim mantığı (`features/medications/notifications.ts`)
- Her (ilaç × saat) için:
  - Her gün → `DAILY` tetikleyici (hour, minute).
  - Belirli günler → her gün için `WEEKLY` tetikleyici (weekday, hour, minute). **Dikkat:** Expo'da `weekday` 1 = Pazar. İç modelde 1 = Pazartesi, dönüştürme fonksiyonu yaz ve test et.
- Bildirim içeriği: başlık "💊 İlaç saati", gövde "{ad} – {doz}", `data: { medicationId, time }`, varsayılan ses.
- Dönen `notificationId`'ler ilaca kaydedilir. Düzenleme/silmede önce eskiler iptal edilir, sonra yenileri planlanır.
- Uygulama her açıldığında **senkronizasyon**: `getAllScheduledNotificationsAsync()` ile depodaki beklenen liste karşılaştırılır. Eksikse yeniden planlanır, fazlaysa iptal edilir (tek doğruluk kaynağı = depo).
- iOS 64 sınırı: planlanacak toplam tetikleyici > 60 ise kaydetme ve kullanıcıya sade bir uyarı göster.
- Bildirime dokunulunca `addNotificationResponseReceivedListener` → "Bugünkü ilaçlarım" ekranı açılır, ilgili satır vurgulanır.
- Ön plandayken de görünmesi için `setNotificationHandler` (alert + ses).
- (P2) B5: Doz zamanında bugüne özel tek seferlik +15 dk bildirimi planla, ALDIM'a basılınca iptal et.

### Saf fonksiyonlar (testli)
- `getDosesForDate(medications, date) → Dose[]`
- `getNextDose(medications, now) → Dose | null`
- `getDoseStatus(dose, log, now) → 'taken' | 'skipped' | 'pending' | 'missed'` (saatinden 60 dk sonra işaretlenmemişse `missed`)
- `toExpoWeekday(isoWeekday)`
- `countTriggers(medications)` (B6'nın tek seferlik "ilacınız bitiyor" bildirimleri de sayılır)
- `getDailyUnits(med)`: günlük tüketim = `unitsPerDose × times.length × (her gün ? 1 : days.length / 7)`
- `getDaysLeft(med) → number | null` (stok girilmemişse `null`) ve `getRunOutDate(med, now)`
- `getRefillStatus(med, now, warningDays) → 'ok' | 'soon' | 'critical' | 'empty' | 'unknown'` (soon: ≤ warningDays, critical: ≤ 3 gün)
- `buildRefillSms(med, contact, userName, daysLeft) → string`

### B6 — İlaç stoğu ve bitiş tahmini
- İlaç ekleme sihirbazına isteğe bağlı bir adım: "Elinizde kaç tablet/kapsül var?" ve "Her seferinde kaç tane alıyorsunuz?" (varsayılan 1). Atlanabilir; atlanırsa stok takibi yapılmaz.
- **Kullanıma bağlı hesap:** ALDIM'a basılınca `remainingUnits -= unitsPerDose`, Geri al'da geri eklenir. Atlanan doz stoktan düşmez; böylece tahmin, kullanıcının gerçek alışkanlığına göre uzar/kısalır.
- Kalan gün = `remainingUnits / getDailyUnits(med)`, aşağı yuvarlanır. Ekranda yaklaşık dille: "Yaklaşık 12 gün yetecek kadar ilacınız var (30 Ekim'e kadar)".
- **"Yeni kutu aldım"** butonu: kutudaki adet girilir, `remainingUnits`'e eklenir (yanlış girişe karşı "Düzelt" ile doğrudan da yazılabilir).
- Uyarı: kalan gün `refillWarningDays` (varsayılan 10; MHRS randevusu birkaç gün sürebildiği için) ve altına düşünce:
  - "Bugünkü ilaçlarım" ve ana ekrandaki İlaçlarım kartında kalıcı, sakin bir uyarı satırı (⚠️ ikon + metin, yalnızca renk değil): "Tansiyon ilacınız yaklaşık 8 gün sonra bitecek."
  - Tahmini bitişten `refillWarningDays` gün önceye **tek seferlik yerel bildirim** (her stok değişiminde iptal edilip yeniden planlanır; 64 sınırına dahil).
- Stok 0'a inerse ALDIM yine çalışır (stok negatif olmaz, 0'da kalır) ve "İlacınız bitmiş olabilir" uyarısı gösterilir — uygulama doz almayı asla engellemez.

### B7 — Randevu yönlendirmesi
Uyarı satırına veya ilaç detayına dokununca "İlacınız bitmeden reçete için randevu alın" ekranı. Üç büyük seçenek:
1. **📞 ALO 182'yi ara** (MHRS çağrı merkezi) → `tel:182`. Telefonla randevu, yaşlı kullanıcı için en kolay yol.
2. **📱 MHRS uygulamasını aç** → App Store sayfası `https://apps.apple.com/tr/app/id1539508996` (yüklüyse "Aç", değilse "Al"; mağazadaki adı CDAS olarak değişti, bu yüzden ad değil kimlik kullanılır) ve **🌐 MHRS internet sitesi** → `https://mhrs.gov.tr/vatandas/`. Uygulamayı doğrudan açmak denendi ama mümkün değil: mhrs.gov.tr'de apple-app-site-association olsa da uygulama evrensel bağlantıları fiilen sahiplenmiyor (iPhone'da www'li ve www'suz adreste "MHRS'de Aç" çıkmıyor) ve belgelenmiş URL şeması yok. Uygulamanın kendisi ağ isteği atmaz.
3. **👨‍👩‍👧 Yakınımdan randevu iste** → kayıtlı yakınlardan biri seçilir (ilacın `refill.contactId`'si varsa o önceden seçili), `sms:{telefon}&body=...` ile mesaj uygulaması **hazır metinle açılır**; gönder tuşuna kullanıcı kendisi basar (uygulama SMS'i kendiliğinden göndermez). Örnek metin:
   > Merhaba Ayşe, ben Fatma. Tansiyon ilacım yaklaşık 8 gün sonra bitecek. Reçete yazdırmak için Kardiyoloji bölümünden Dr. Mehmet Yılmaz'a (Manisa Şehir Hastanesi) MHRS'den randevu alabilir misin? Teşekkürler.
   - Bölüm/doktor/hastane girilmemişse ilgili kısım cümleden çıkarılır ("...reçete için doktorumdan randevu alabilir misin?").
   - **T.C. kimlik numarası mesaja asla eklenmez** (gizlilik; randevuyu alan yakın bunu zaten bilir veya sorar).
- Bölüm/doktor/hastane ve SMS gidecek yakın, ilaç ekleme sihirbazında isteğe bağlı "Reçete bilgisi" adımında ya da sonradan ilaç detayında girilir. Bölüm için sık kullanılanlardan büyük butonlu liste (Dahiliye, Kardiyoloji, Nöroloji, Endokrinoloji, Göğüs Hastalıkları, Aile Hekimi...) + serbest metin.
- **Tıbbi sorumluluk:** Uygulama doz veya ilaç değişikliği önermez; yalnızca "bitmeden doktorunuza görünün" hatırlatması yapar. Hakkında ekranındaki not geçerlidir.

**B6/B7 kabul kriterleri:** 10 tablet + günde 2 doz girilen ilaç 5 gün olarak gösterilir; 3 kez ALDIM sonrası 3.5 → "yaklaşık 3 gün". Geri al stoğu geri getirir. Uyarı eşiğinin altına düşünce ana ekranda uyarı görünür ve tek seferlik bildirim planlanır; "Yeni kutu aldım" sonrası uyarı kalkar ve bildirim yeniden planlanır. SMS ekranı doğru yakının numarası ve eksiksiz metinle açılır; uygulama SMS'i kendiliğinden göndermez. Stok girilmemiş ilaçta hiçbir stok uyarısı çıkmaz.

**Kabul kriterleri:** 2 dk sonrasına kurulan ilaç bildirimi uygulama kapalıyken gelir. Düzenleme sonrası eski saatte bildirim gelmez. ALDIM ve Geri al doğru çalışır. Gece yarısı geçişinde "bugün" listesi yenilenir (uygulama ön plana geldiğinde `AppState` ile).

---

## 7. Modül C — Acil yardım

- Ekranda kayıtlı yakınlar için büyük kartlar: "📞 {Ad} ({yakınlık})". Tek dokunuş → `Linking.openURL('tel:...')`. iOS kendi arama onayını da gösterir.
- En altta ayrı renkte **112 ACİL** butonu → önce uygulama içi onay ("112 Acil Çağrı Merkezi aranacak. Emin misiniz?" — Evet/Hayır), sonra `tel:112`.
- Kişi yoksa: "Henüz kimse eklenmedi" + "Kişi ekle" butonu.
- Telefon doğrulaması: boşluk/tire temizle; `05XXXXXXXXX`, `5XXXXXXXXX` veya `+905XXXXXXXXX` kabul et, ekranda okunaklı biçimde göster (`0555 123 45 67`).
- (P2) C3 **Konumumu gönder**: `expo-location` ile tek konum al → `sms:{telefon}&body=Acil durumdayım, konumum: https://maps.google.com/?q=lat,lng`. iOS'ta `sms:` gövde formatını gerçek cihazda test et.

**Kabul kriterleri:** Hiçbir test 112'yi gerçekten aramaz (geliştirme sırasında 112 yerine kendi numaranla dene). Geçersiz numara kaydedilemez.

---

## 8. Modül D — Mesaj kontrolü

### Akış
1. Ekranda büyük metin kutusu + **"📋 Panodan yapıştır"** butonu (`expo-clipboard`). Altta kısa yönerge: "Şüphelendiğiniz mesajı basılı tutup Kopyala deyin, sonra bu butona basın."
2. **Kontrol Et** → sonuç ekranı (cihaz içinde, internet gerekmez, < 200 ms).

### Sonuç ekranı
| Seviye | Görünüm | Başlık | Ana öneri |
|---|---|---|---|
| Kırmızı | ⛔ + kırmızı zemin | "DİKKAT! Bu mesaj büyük ihtimalle dolandırıcılık." | "Linke tıklamayın, kimseye şifre veya kod söylemeyin, para göndermeyin." |
| Sarı | ⚠️ + sarı zemin | "Bu mesajda şüpheli işaretler var." | "Emin olmadan işlem yapmayın, yakınınıza danışın." |
| Yeşil | ✅ + yeşil zemin | "Belirgin bir tehlike işareti bulunmadı." | "Yine de para veya şifre isteyen mesajlara dikkat edin." |
| Mavi (v2) | 📢 + mavi zemin | "Bu bir reklam / kampanya mesajı." | "Belirgin bir dolandırıcılık işareti görünmüyor. İstemiyorsanız mesajdaki "RET" yöntemiyle bu reklamları durdurabilirsiniz." |

- Altında **"Neden?"** listesi: tetiklenen kuralların sade açıklamaları (en fazla 4).
- Butonlar: **🔊 Sesli oku** (`expo-speech`, `language: 'tr-TR'`, yavaş hız ~0.85), **👨‍👩‍👧 Yakınıma sor** (mesaj metnini kayıtlı yakına `sms:` ile gönderme ekranı açar), **Ana Sayfa**.
- Model olasılığı yüzde olarak gösterilmez (yaşlı kullanıcıya anlam ifade etmez). Rapordaki geliştirici bölümünde anlatılır.

### Kurallar (`rules.ts`) — ham metin üzerinde, normalize edilmiş kopyayla eşleşir
| Kural | Örnek tetikleyiciler | Kullanıcıya açıklama |
|---|---|---|
| `LINK` | http, www, alan adı kalıbı (resmi adresler ve e-posta adresleri hariç) | "Mesajda bir internet bağlantısı var. Bankalar ve devlet kurumları SMS'teki bağlantıdan bilgi girmenizi istemez." |
| `FAKE_LINK` (v2) | adreste kurum adı ama resmi adres değil: `ptt-teslimat-takip.xyz`, `turkiye.gov.tr.iade-basvuru.com`, `https://ptt.gov.tr@bit.ly/..` | "Bağlantı adresi bir kurumun adını taklit ediyor ama o kurumun gerçek adresi değil." |
| `OFFICIAL_LINK` (v2, bilgilendirici) | bütün linkler kamu kurumu adresi (`*.gov.tr`, `*.bel.tr`, `*.edu.tr`, `*.k12.tr`, `*.pol.tr`, `*.tsk.tr`) | "Mesajdaki bağlantı bir kamu kurumunun resmi adresi. Yine de bilgi girmeden önce adresin tam olarak aynı olduğunu kontrol edin." |
| `SHORT_LINK` | bit.ly, tinyurl, cutt.ly, t.ly, rebrand.ly | "Bağlantı kısaltılmış; nereye gittiği gizleniyor." |
| `URGENCY` | hemen, son gün, 24 saat, aksi takdirde, bloke, askıya, iptal edilecek | "Sizi acele ettirmeye çalışıyor. Dolandırıcılar düşünmenize fırsat vermek istemez." |
| `IMPERSONATION` | e-devlet, ptt, kargo, banka adları, vergi, icra, sgk, emniyet, savcılık, masak, turkcell/vodafone/türk telekom | "Resmi bir kurum veya şirket adına yazılmış gibi görünüyor." |
| `PRIZE` | kazandınız, kazanın, hediye, ödül, çekiliş, iade, bonus ("anket" tek başına değil) | "Ödül veya para iadesi vaat ediyor." |
| `PERSONAL_INFO` | şifre, kart bilgi, cvv, tc kimlik, doğrulama/onay kodu | "Kişisel bilgilerinizi veya kodunuzu istiyor." |
| `PAYMENT` | IBAN kalıbı, ödeme yapın, gümrük ücreti, borç | "Para göndermenizi veya ödeme yapmanızı istiyor." |
| `GAMBLING` | bahis, casino, deneme bonusu, freespin, canlı maç, hoşgeldin/kayıp/yatırım bonusu | "Yasa dışı bahis reklamı olabilir." |
| `CALLBACK` | arayınız, irtibata geçin, bize ulaşın | "Sizden mesajdaki numarayı aramanızı istiyor. Kurumu aramanız gerekiyorsa numarayı mesajdan değil, resmi sitesinden bulun." |
| `OTP_INFO` (bilgilendirici) | "doğrulama kodunuz / onay kod" + rakam | "Bu bir doğrulama kodu. Sizi arayan kişi banka görevlisi olsa bile bu kodu kimseye söylemeyin." |
| `AD_MARKER` (v2) | SMS ret, RET yaz, İYS, Mersis, "almak istemiyorsanız" | "Mesajda yasal reklam işaretleri var (reklamı durdurma yöntemi veya şirket sicil numarası)." |

Anahtar kelimeler normalize edilmiş metinde aranır, böylece Türkçe karaktersiz yazımlar da yakalanır ("hesabiniz bloke").

### Karar mantığı (`decide.ts`) — v2 (Ekim 2026)
Model 3 olasılık verir: pD (dolandırıcılık), pR (reklam), pN (normal). Eşikler pD'ye uygulanır: T_HIGH = 0,40, T_LOW = 0,20 (doğrulama setinde normal + reklam yanlış alarmı kırmızıda ≤ %1, sarıda ≤ %3 olacak şekilde; alt sınırda kırpıldı).
```
YEŞİL   ← doğrulama kodu VEREN (istemeyen), bilinmeyen link içermeyen mesaj ∧ kural birleşimi yok
YEŞİL   ← bütün linkleri kamu kurumu adresi ∧ para / şifre / arama / bahis / ödül yok
REKLAM  ← yasal reklam işareti ∧ pD < T_LOW ∧ tehlike işareti yok
KIRMIZI ← pD ≥ T_HIGH
          veya kural birleşimi ∧ pR < 0,5 ∧ (pD ≥ 0,1 ∨ FAKE_LINK)
REKLAM  ← pR ≥ 0,5 ∧ pD < T_LOW ∧ tehlike işareti yok ∧ bilinmeyen link yok
SARI    ← pD ≥ T_LOW, ya da kural birleşimi, ya da güçlü tek işaret (LINK, SHORT_LINK, GAMBLING, FAKE_LINK),
          ya da en az iki zayıf işaret ∧ pN < 0,5
YEŞİL   ← diğer durumlar

Kural birleşimi: LINK ∧ (kurum adı ∨ ödül ∨ acele ∨ kişisel bilgi)
                 PAYMENT ∧ (acele ∨ (kurum adı ∧ iletişim kanalı))
                 PERSONAL_INFO ∧ (acele ∨ (kurum adı ∧ iletişim kanalı))
                 CALLBACK ∧ kurum adı ∧ acele            (iletişim kanalı = link, arama ya da acele)
Tehlike işareti (Reklam denmesini engeller): kişisel bilgi isteği, bahis, FAKE_LINK, kısa link + ödül, ödeme + acele
```
Gerekçeler ve ölçümler §9.6 "Karar katmanı v2"de. Aşağıdaki v1 mantığı tarihçe için korunuyor.

#### v1 (Aşama 5)
```
KIRMIZI  ← p ≥ T_HIGH
           veya LINK ∧ (IMPERSONATION ∨ PRIZE ∨ URGENCY ∨ PERSONAL_INFO)
           veya PAYMENT ∧ (URGENCY ∨ IMPERSONATION)
           veya PERSONAL_INFO ∧ (IMPERSONATION ∨ URGENCY)
           veya CALLBACK ∧ IMPERSONATION ∧ URGENCY
SARI     ← p ≥ T_LOW
           veya güçlü tek işaret (LINK, SHORT_LINK, GAMBLING)
           veya en az iki farklı işaret (OTP_INFO hariç)
YEŞİL    ← diğer durumlar
```
- `T_HIGH` ve `T_LOW` doğrulama setinden seçilir (başlangıç: 0.80 / 0.40), `model.json` içinde saklanır. Seçilen: 0.67 / 0.30.
- Kısa metin (< 15 karakter) → "Kontrol için mesaj çok kısa" uyarısı.
- **Uygulamada yapılan değişiklikler (Aşama 5, ölçüme dayalı):**
  - İlk kural "herhangi bir kural → sarı" idi. Gerçek test setinde (806 mesaj, model + kurallar birlikte) günlük sohbetteki tek kelimeler ("hemen", "acil", "hediyeler için teşekkürler", "wifi şifresi") yanlış alarmı %1,3'ten **%4,3**'e çıkardı (hedef ≤ %3). Zayıf işaretler tek başına sarı yapmayacak şekilde değiştirildi → yanlış alarm **%1,4** (352 güvenli mesajda 5; kalanlar modelin kendi hataları). Şüpheli mesajların %99,5'i en az sarı (418'de 416; 411 kırmızı).
  - Ek kurallar: **CALLBACK** ("arayınız", "irtibata geçin" — uzlaştırma/hukuk bürosu tuzakları), link adresinde kurum adı (ptt-kargo.xyz, turkiye.gov.clskl.com) → IMPERSONATION, resmi `*.gov.tr` linkleri LINK sayılmaz, bankanın gerçek doğrulama kodu mesajı ("kimseyle paylaşmayın") "şifre istiyor" sayılmaz.
  - scam_tr'deki 46 gerçek dolandırıcılık mesajının 44'ü en az sarı (41 kırmızı). Not: model bu mesajların çoğunu eğitimde gördü; bu sayı daha çok kural katmanını ölçer.

---

## 9. Makine öğrenmesi hattı (`ml/`)

### 9.1 Veri
- **TurkishSMSCollection:** Türkçe istenmeyen/meşru etiketli SMS veri seti (2024 MDPI makalesinde kullanılan). Kaggle/GitHub'dan indirilecek, lisansı kontrol edilecek.
- **Uysal vd. (2013) Türkçe SMS koleksiyonu:** 425 spam + 450 meşru mesaj. Hugging Face'te `akuysal/turkishSMS-ds` olarak mevcut.
- **`scam_tr.csv` (kendi toplayacağın):** Gerçek dolandırıcılık SMS'leri (ailenin telefonları, kurumların paylaştığı uyarı örnekleri). Hedef ≥ 150 mesaj. İsim, telefon, link ve kod gibi kişisel kısımlar `[İSİM]` vb. ile anonimleştirilir. Kolonlar: `text, label(1), source, collected_at`.
- (İsteğe bağlı) Sentetik örnekler: yalnızca **eğitim** setine girer. Test seti yalnızca gerçek mesajlardan oluşur. Raporda dürüstçe belirtilir.
- Etiket: `0 = güvenli`, `1 = şüpheli` (spam + dolandırıcılık birleşik).
- Tekrarlar: normalize edilmiş metne göre tekilleştir (aynı mesajın hem eğitimde hem testte olmasını engeller).
- Bölme: %70 eğitim / %15 doğrulama / %15 test, stratified, `random_state=42`.

### 9.2 Normalizasyon (Python ↔ TS birebir)
Sırayla:
1. Unicode NFC.
2. `İ`, `I`, `ı` → `i` (**`lower()`'dan önce**; Python'da `'İ'.lower()` iki karakter üretir).
3. Küçük harfe çevir.
4. Aksan katlama: `ç→c, ğ→g, ö→o, ş→s, ü→u, â→a, î→i, û→u`.
5. URL → ` urltoken ` (regex: `https?://[^ \t\n\r]+`, `www\.[^ \t\n\r]+`, ve `[a-z0-9-]+\.(com|net|org|xyz|top|info|tr|link|site|online|shop|click|live|app)(/[^ \t\n\r]*)?`).
6. IBAN → ` ibantoken ` (`tr[0-9]{2}( ?[0-9]{4}){5} ?[0-9]{2}`).
7. Telefon → ` teltoken ` (`(\+?90|0)? ?5[0-9]{2} ?[0-9]{3} ?[0-9]{2} ?[0-9]{2}`).
8. Kalan rakam grupları → ` num `.
9. `[a-z0-9]` dışındaki her karakter → boşluk.
10. Birden fazla boşluğu teke indir, baştan ve sondan kırp.

Python'da `\d` ve `\s` yerine açık karakter sınıfları kullanılır. `ml/tests/test_normalize.py` ve `app/__tests__/normalize.test.ts` aynı ≥ 30 örnek girdi/çıktı çiftini paylaşır (`ml/exports/parity_vectors.json`).

### 9.3 Öznitelik ve model
- `TfidfVectorizer(analyzer='char_wb', ngram_range=(3,5), min_df=2, max_features=20000, sublinear_tf=True, lowercase=False)`, metin önceden normalize edilmiş halde verilir.
  - Neden karakter n-gram: Türkçe eklemeli bir dil ("hesabınız/hesabınızın"), dolandırıcılar da kasıtlı yazım hatası yapar. Karakter n-gramı ikisine de dayanıklıdır.
- Karşılaştırılacak modeller (5-katlı stratified CV, F1 ve ROC-AUC): MultinomialNB, LogisticRegression(`class_weight='balanced'`, C ∈ {0.1, 1, 10}), LinearSVC.
- **Seçim: Lojistik Regresyon.** Olasılık verir, TS'te 20 satırla çalıştırılabilir. Diğerleri raporda karşılaştırma tablosu olarak yer alır.
- Raporlanacaklar (`ml/reports/`): sınıf dağılımı, CV tablosu, test seti precision/recall/F1/ROC-AUC, karışıklık matrisi PNG, precision-recall eğrisi, eşik seçim gerekçesi, yanlış sınıflanan 10 örnek analizi, en etkili 20 n-gram (her iki yönde).
- Hedef: test F1 ≥ 0.95, yanlış pozitif oranı ≤ %3 (yaşlıyı gereksiz korkutmamak için).

### 9.4 Dışa aktarma (`export_model.py`)
`app/src/detector/model.json` (v2, 3 sınıf; v1 tek `intercept` ve `[idf, coef]` kullanıyordu):
```json
{
  "version": "2.0.0",
  "createdAt": "...",
  "model": "LogisticRegression multinomial C=10.0 (4_tr_sentetik)",
  "classes": ["normal", "reklam", "dolandiricilik"],
  "ngramRange": [3, 5],
  "intercepts": [3.56, -1.74, -1.82],
  "thresholds": { "high": 0.4, "low": 0.2 },
  "features": { "ngram": [idf, coef_normal, coef_reklam, coef_dolandiricilik] }
}
```
- Sayılar 6 basamağa yuvarlanır. Boyut sınırı 1,2 MB; gerçekleşen 911 KB (20.000 n-gram).
- `ml/exports/parity_vectors.json`: 198 mesaj için `{ text, normalized, probabilities }`; sklearn'e en büyük fark 2·10⁻⁷.

### 9.5 TS tarafı (birebir sklearn)
- **`char_wb` n-gram:** Metin boşluklara göre bölünür. Her kelime `" " + w + " "` yapılır. Her n için kaydırarak n-gram alınır. sklearn'deki "kelime n'den kısaysa bir kez say" (`if offset == 0: break`) davranışı aynen uygulanır. Uzunluk hesabında `Array.from(w)` kullanılır.
- **TF:** `1 + ln(count)` → `× idf` → L2 normalizasyon (yalnızca modelde olan n-gramlar üzerinden).
- **Olasılık (v2):** her sınıf için `z_k = intercept_k + Σ x_j·coef_jk`, softmax. (v1: `p = 1 / (1 + e^(−z))`.)
- **Parity testi:** tüm vektörlerde her sınıf için `|p_ts − p_py| < 1e-4` ve `normalized` metinler birebir aynı.

### 9.6 Veri ve model v2 — reklam ≠ dolandırıcılık (Ekim 2026)

**Neden:** v1 modeli Migros'un yasal kampanya SMS'ine %99 ile "dolandırıcılık" dedi. Ölçüm: TurkishSMSCollection ve Uysal'ın "spam" sınıfı (2.742 mesaj) büyük ölçüde **yasal ticari reklam** (mağaza/banka/operatör kampanyası); gerçek dolandırıcılık kalıbı birkaç yüz mesajda. v1 aslında bir **reklam dedektörü** oldu ve raporlanan F1 0,99 bu yüzden yanıltıcıydı. Aynı hata, aynı veri setini kullanan açık kaynak Türkçe projelerde de görülüyor; Türkçe'de gerçek SMS dolandırıcılığı içeren düzgün etiketli açık veri seti bulunamadı — bu çalışmanın özgün katkılarından biri.

**Ara önlem (yapıldı; v2 karar katmanıyla değiştirildi, aşağıda):** yasal reklam işareti (SMS ret / RET yaz / İYS / Mersis) taşıyan ve dolandırıcılık işareti olmayan mesaj → mavi "📢 Reklam mesajı"; bankaların, kargo firmalarının, operatörlerin ve büyük mağazaların resmi alan adları (+ `*.gov.tr`) link/kurum taklidi sayılmaz.

**Sınıflar (model):** `0 = normal`, `1 = reklam` (yasal ticari ileti), `2 = dolandırıcılık` (oltalama, sahte kurum/kargo/banka, sahte ödül/iade, kod/şifre/para isteme, yakın taklidi, yasa dışı bahis). Dolandırıcılığın **türü** model sınıfı değildir; açıklanabilir kurallarla belirlenir (📦 kargo, 🏛️ e-Devlet/icra/vergi, 🏦 banka/hesap, 🎁 ödül/iade, 🎰 bahis, 👨‍👩‍👧 yakın taklidi, 💰 yatırım/kripto). Kullanıcıya: kırmızı (dolandırıcılık + türü) / sarı (şüpheli: model kararsız) / yeşil (normal) / mavi (reklam).

**Veri kaynakları:**

| Kaynak | Lisans | Kullanım |
|---|---|---|
| TurkishSMSCollection, Uysal 2013 | belirsiz (repoya girmez) | "spam" → **reklam**; dolandırıcılığa benzeyen adaylar ve bahis tek tek incelenip yeniden etiketlenir |
| [SmishTank Dataset I](https://arxiv.org/abs/2402.18430) (1.062, 2022–24, gerçek) | CC BY-NC-SA 4.0 | çeviri + yerelleştirme → dolandırıcılık (kategori eşlemesi: Account Alert, Delivery, Prize, Finance/Crypto, Lawsuits, Loans, Job, Wrong Number/Romance) |
| [Mendeley SMS Phishing](https://data.mendeley.com/datasets/f45bkkt8pr/1) (5.971; 638 smishing, 489 spam) | CC BY 4.0 | smishing + spam çeviri + yerelleştirme; normal mesajlar kullanılmaz |
| [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) | CC BY 4.0 | Mendeley ile 4.943 ortak; yalnızca fazladan 65 spam |
| scam_tr.csv (46 gerçek TR) | kaynaklı | altın test |
| Kullanıcının gelen kutusu (normal, reklam, dolandırıcılık) | kişisel, anonimleştirilir, repoya girmez | altın test (+ zor negatifler) |

**Çeviri ve Türkiye'ye yerelleştirme** (Claude ile, parti parti; orijinal + çeviri + kaynak + lisans saklanır):
- Para: £/$/€ → TL, gerçekçi tutarlar (küçük ücret 29,90–49,90 TL; ödül 10.000–50.000 TL; yatırım "günde 5.000 TL").
- Kurum/marka: USPS/Royal Mail/DHL → PTT, Yurtiçi, Aras, MNG; IRS/HMRC → GİB/e-Devlet; NHS → e-Nabız/MHRS; E-ZPass/toll → HGS/OGS; DMV/DVLA → trafik cezası/Emniyet; Bank of America/Chase/Wells Fargo/Citi → Ziraat, Garanti, İş Bankası, Akbank, Yapı Kredi; Amazon/Costco/Home Depot → Trendyol, Hepsiburada, Migros; T-Mobile/Verizon → Turkcell, Vodafone, Türk Telekom; uluslararası olanlar (Apple, Netflix, WhatsApp, Binance) kalır.
- Telefon: TR biçimi (05xx, 0850, 444 xx xx); ücretli hatlar → 0900 / kısa numara. Link: taklit mantığı korunur, Türk bağlamına taşınır (`usps-redelivery.com` → `ptt-teslimat-takip.xyz`); kısa linkler kalır.
- Reklamlarda yasal işaretler (İYS, "RET yazıp 7447'ye gönderin", Mersis) eklenir; dolandırıcılıkta eklenmez (ya da gerçek hayattaki gibi nadiren).
- İsim, tarih (GG.AA.YYYY), adres Türk bağlamında. Yazım çeşitliliği: bir kısmı bilinçli olarak Türkçe karaktersiz / büyük harfli (gerçek SMS'lerdeki gibi).
- **Son kontrol betiği (testli):** £/$/"UK"/"txt"/"postcode" kalıntısı, telefon/link biçimi, Türkçe dil oranı, mevcut veriyle tekrar.

**Dürüstlük kuralları:** Çevrilmiş ve sentetik satırlar **yalnızca eğitimde**; test her zaman gerçek Türkçe mesajlarla. Her satırda `source, license, translated, synthetic` alanları; çevrilmiş veriye düşük örnek ağırlığı. Raporda çevirinin yapay zekâ ile yapıldığı açıkça yazılır.

**Sızıntıya karşı ayırma:** Şablon gruplama (rakam/tarih/link soyutlanmış iskelet + benzerlik) — aynı şablon ya eğitimde ya testte (uygulamada `StratifiedGroupKFold`, sınıf oranı korunarak).

**Model (plan):** 3 sınıflı lojistik regresyon (telefonda çevrimdışı, Python ↔ TS parity sürer). Açıklanabilir sinyaller (link resmi/bilinmeyen/kısa, yasal reklam işareti, IBAN, acele) modele değil **kural katmanına** bırakıldı: model linkin adresini görmez (normalizasyon her linki `urltoken` yapar), linkin güvenilirliğine kurallar karar verir. Bu, parity'yi basit tutan bilinçli bir iş bölümü.

**Ölçüm (plan):** Altın test setinde sınıf başına kesinlik / yakalama / F1, karışıklık matrisi, hata analizi. **Ablasyon:** (1) yalnız TR, (2) + çeviri, (3) + sentetik — gerçek mesajlarda her eklemenin etkisi.

#### Yapılanlar ve sonuçlar (v2)

**Veri hazırlığı:**
- **Çeviri:** SmishTank, Mendeley ve UCI kuyruğundaki 2.095 mesaj 42 partide elden geçirildi → 555 dolandırıcılık, 66 reklam, 1.474 atlama (çoğu aynı şablonun tekrarı; ayrıca müstehcen, yalnızca link, Türk bağlamında karşılığı yok, etiketi belirsiz). Ayrıntı: `ml/data/translated/README.md`.
- **Yeniden etiketleme:** TurkishSMSCollection + Uysal'daki 2.743 tekil "spam" → 2.694 reklam, 37 dolandırıcılık (bahis 14, sahte ödül 12, sahte sağlık ürünü/ücretli hat 6, "dava var mı, 11899'u arayın" 2, kargo 2, kredi 1), 4 normal (polis ve bankanın dolandırıcılık uyarıları), 8 atlama. Yasal reklam işareti olan 920 mesaj otomatik; 94 dolandırıcılık adayı ve ödül/arama/kredi kelimesi geçen 329 mesaj tek tek okundu, kalan reklamlardan 80'lik örneklem kontrol edildi. Elle dolandırıcılık denen mesajın isim/tutar değiştirilmiş kopyaları da yeniden incelemeye alınır. Ayrıntı: `ml/data/relabel/README.md`.
- **Sentetik zor negatifler:** 440 meşru Türkçe mesaj (banka, kargo, kamu, sağlık, operatör, ulaşım, kişisel/aile; 40'ı linkli kargo bildirimi) yalnızca eğitim için yazıldı. Ayrıntı: `ml/data/synthetic/README.md`.
- **Bölme:** gerçek mesajlar (5.365 tekil) karakter n-gram benzerliği ≥ 0,8 olan şablon gruplarına ayrıldı (4.885 grup) ve `StratifiedGroupKFold` ile ~%70/15/15 bölündü; doğrulama ve test yalnızca gerçek mesaj (her biri 767: 370 normal, 385 reklam, **12 dolandırıcılık**). Gerçek dışı satırlar yalnızca eğitimde; doğrulama/test metniyle birebir aynı olanlar çıkarılır.

**Ablasyon (5 katlı şablon gruplamalı çapraz doğrulama, tüm 83 gerçek dolandırıcılık mesajıyla):** Tek testte 12 dolandırıcılık mesajı olduğu için (bir mesaj F1'i ~0,04 oynatır; iki etiket düzeltmesi tek bir test F1'ini 0,89'dan 0,96'ya çıkardı) yapılandırma karşılaştırması çapraz doğrulamayla yapıldı. Her satırda en iyi C:

| Yapılandırma (örnek ağırlığı) | Makro F1 | Dolandırıcılık kesinliği | Yakalama | Ort. kesinlik (AP) | Eğitime girmeyen zor negatiflerde "dolandırıcılık" |
|---|---|---|---|---|---|
| 1. Yalnız TR | 0,908 | 0,79 | 0,71 | 0,83 | %33 |
| 2. TR + çeviri (0,5) | 0,870 | 0,52 | 0,81 | 0,72 | %50 |
| 3. TR + çeviri + sentetik (0,5) | 0,863 | 0,53 | 0,75 | 0,67 | %10 |
| **4. TR + sentetik (1,0) — seçilen** | **0,907** | **0,79** | 0,70 | 0,81 | **%3** |

- **Olumsuz bulgu (raporlanacak):** makine çevirisiyle yerelleştirilmiş yabancı dolandırıcılık verisi, hangi ağırlıkla eklenirse eklensin (0,05–0,5 denendi) gerçek Türkçe mesajlarda dolandırıcılık **kesinliğini** 0,79'dan 0,50–0,58'e düşürdü: model gerçek Türk reklamlarını dolandırıcılık sanmaya başladı (çevirilerdeki "Migros/Koçtaş + hediye + TL" dili Türk kampanyalarına çok benziyor). Çeviriler son modelde kullanılmadı; karar katmanının "görülmemiş dolandırıcılık" güvenlik testinde kullanıldı.
- **Seçim kuralı (test setine bakılmadan):** CV makro F1'i en iyinin 0,005 yakınındaki adaylardan, eğitime girmeyen sentetik zor negatiflerde en az "dolandırıcılık" diyen. Bu ölçüt yapay zekâ ile yazılmış veri içerdiği için ayrıca belirtilir; gerçek veride 1 ve 4 eşdeğer.

**Seçilen modelin test sonucu (767 gerçek mesaj, yalnızca model):** makro F1 0,947. Normal F1 0,993, reklam F1 0,991, dolandırıcılık kesinlik 0,75 / yakalama 1,00 (12/12). Kırmızı eşikte normal + reklam yanlış alarmı %0,5 (normal %0,3, reklam %0,8); sarı eşikte %2,0. Güven aralığı 12 dolandırıcılık mesajı yüzünden geniş; gelen kutusu mesajlarıyla yeniden ölçülecek.

**v1 ile karşılaştırma (aynı test seti):** v1 kırmızı eşikte gerçek reklamların **%99,7'sini** dolandırıcılık sayıyordu (normal + reklam yanlış alarmı %51); v2'de %0,8. Eğitime girmeyen sentetik meşru mesajlarda kırmızı: v1 %27 → v2 %6.

**Karar katmanı v2 (model + kurallar, uygulamanın kullanıcıya gösterdiği sonuç):** Kurallar tek başına karar verdiğinde gerçek reklamların 234/770'i kırmızıydı (link + "hediye", banka adı + link); bu kombinasyonların 263/268'inde model mesajın reklam olduğunu biliyordu, gerçek dolandırıcılıkta ise 13 kombinasyonun 11'inde model reklam demiyordu → kural kırmızısı model reklam demiyorsa verilir. Kurum adı meşru mesajlarda çok geçtiği için ödeme/şifre kelimesiyle birlikte ancak bir iletişim kanalı varsa kırmızı yapar. Model "Koçtaş'tan hediye kartı + link", "Migros anketi 1.000 TL" gibi sahte kampanyaları da reklam sanabildiğinden (görülmemiş çeviri dolandırıcılığının 100/555'i), **yasal reklam işareti olmayan ve bilinmeyen link içeren mesaja "Reklam" denmez**: 2021'den beri ticari SMS'te ret yöntemi zorunlu (6563 s. Kanun, İYS).

| Grup (uygulamadaki sonuç) | v1 (model + kurallar) | v2 |
|---|---|---|
| Gerçek reklam (770) | 234 kırmızı, 159 sarı, 144 reklam | 7 kırmızı, 281 sarı, **478 reklam** |
| Gerçek normal (676, kısa olmayan) | — | 666 yeşil, 6 sarı, 1 kırmızı, 3 reklam |
| Gerçek dolandırıcılık (24) | 23 kırmızı, 1 yeşil | 21 kırmızı, 2 sarı, 1 yeşil |
| Görülmemiş çeviri dolandırıcılık (555) | — | 305 kırmızı, 160 sarı, 32 reklam, 58 yeşil |
| Sentetik meşru 001–008 (400) | 110 kırmızı, 134 sarı | 7 kırmızı, 12 sarı |

- Gerçek reklamlardaki 281 sarı büyük ölçüde ret işareti taşımayan 2015 dönemi linkli reklamlar (İYS öncesi). Görülmemiş dolandırıcılıktaki 58 yeşil çoğunlukla linksiz "yanlış numara" açılışları ("Selam Burcu, uzun zaman oldu"); tek mesajdan yakalanmaları beklenemez. Kaçan tek gerçek dolandırıcılık: linksiz "terör soruşturması, parayı güvenli hesaba aktarın".
- Sentetik meşru sonuçlarının %80'i eğitimde görülmüş mesajlar; yalnızca karşılaştırma için.

**Telefonda (Expo Go, gerçek gelen kutusu) bulunan yanlış alarmlar ve düzeltmeler:**

| Mesaj türü | Sorun | Düzeltme |
|---|---|---|
| Kariyer.net doğrulama kodu ("onay kod … paylaşma") | Model %44; "onay kod" ve "paylaşma" tanınmıyordu | Kısa kod kalıpları; kod veren, bilinmeyen link içermeyen mesaj yeşil |
| İşe alım bilgilendirmesi (e-posta adresi içeren) | `ad@vodafone.com` link + kurum taklidi sayılıyordu | E-posta adresleri link değil (`x@y` link içindeyse korunur) |
| İŞKUR iş ilanı (`esube.iskur.gov.tr`) | Model iş ilanı dilini sahte iş ilanına benzetiyordu | Yalnızca kamu kurumu linkli, para/şifre/arama/ödül istemeyen mesaj yeşil (YouTube/Kariyer.net gibi platformlar bu istisnayı almaz) |
| Amazon teslimat + memnuniyet anketi linki | Model %83 (eğitimde linkli meşru kargo mesajı yoktu); "anket" ödül sayılıyordu | 40 linkli meşru kargo bildirimi eklenip yeniden eğitildi (%16); "anket" tek başına ödül değil. Sahte kargo yakalama değişmedi (60 → 61 kırmızı) |
| İK platformu linkli değerlendirme bildirimi | Sarı | Doğru davranış: ad + giriş kodu + bilinmeyen link, sahte işe alım mesajıyla aynı biçimde |

Her düzeltmeden sonra yukarıdaki gruplarla gerileme ölçümü yapıldı; ilk denemelerde bulunan iki yan etki (boşluksuz "geldi.Yarın" yazımının link sayılması, YouTube linkli sahte piyango mesajının yeşile dönmesi) commit öncesi düzeltildi. Testlerde kullanıcının mesajlarının yalnızca uydurma benzerleri var.

**Sınırlılıklar:** (1) Gerçek Türkçe dolandırıcılık örneği az (83; testte 12) — kullanıcının gelen kutusu `ml/data/raw/inbox/` ile genişletilecek, nihai rakamlar ondan sonra. (2) Model linkin adresini görmez; bilinmeyen bir şirket adresi ancak kurallar ve metin diliyle değerlendirilir. (3) Tek mesajlık "yanlış numara" / sohbet açılışları (dolandırıcılığın ilk adımı) yakalanamaz. (4) Seçim ve bazı kurallar yapay zekâ ile yazılmış sentetik veride ölçüldü; raporda ayrıca belirtilir.

**Dosyalar:** ham yabancı veri `ml/data/raw/foreign/<kaynak>/` (repoya girmez); çeviriler `ml/data/translated/*.csv` (kaynak lisansıyla birlikte, CC BY / CC BY-NC-SA koşullarına uygun olarak repoda); kullanıcı mesajları `ml/data/raw/inbox/` (repoya girmez).

---

## 10. Erişilebilirlik ve tasarım sistemi

**İlkeler:** Ekran başına tek ana görev; büyük, net, yüksek kontrast; okunur dil; hata yapmaya dayanıklı (onay + geri al).

| Öğe | Değer |
|---|---|
| Gövde yazısı | 20pt (Çok büyük: 24pt) |
| Başlık | 28–32pt, kalın |
| Buton yazısı | 24pt, kalın |
| Dokunma alanı | ≥ 64×64pt, butonlar arası ≥ 16pt boşluk |
| Kontrast | ≥ 7:1 (WCAG AAA) |
| Renk paleti | Arka plan `#FFFFFF`, metin `#111111`, birincil `#0B4F9C`, tehlike `#B00020`, uyarı arka planı `#FFF3C4` + metin `#5C4300`, başarı `#1B5E20` |
| Dynamic Type | iOS yazı büyütmesine uyulur, en az 1 en fazla 1.4 kat. Büyütmeyi sistem değil `AppText` hesaplar (`allowFontScaling={false}` + `useWindowDimensions().fontScale`): uygulama açıkken ayar değişince iOS metinleri yeniden ölçmüyor, kırpıyordu |
| VoiceOver | Tüm butonlarda Türkçe `accessibilityLabel`, gerekirse `accessibilityHint`; her ekranda başlık (`accessibilityRole="header"`); emoji ve madde işaretleri okunmaz (`utils/a11y.ts` › `spokenText`) |
| Duyurular | Sonradan beliren hata, onay ve uyarılar, sihirbazda adım değişimi, saat seçicide yeni saat, Aldım / Geri al `AccessibilityInfo.announceForAccessibility` ile okunur (iOS `accessibilityLiveRegion`'ı desteklemez) |
| Dokunsal geri bildirim | Her ana butonda `expo-haptics` hafif titreşim |
| Yasaklar | Küçük ikon-buton, yalnızca renkle anlam, kaydırma zorunluluğu, kaybolan uyarı, İngilizce terim, soluk/devre dışı buton (basınca ne yapılacağı söylenir) |

**Ortak bileşenler:** `AppText`, `AppTextInput` (etiketli, kalıcı hata satırı), `BigButton` (ikon + başlık + alt metin, varyantlar: primary/danger/neutral), `OptionButton` (seçili durumu ✓ + "Seçili" yazısıyla), `ScreenContainer` (güvenli alan + başlık + Ana Sayfa butonu), `ConfirmDialog` (büyük Evet/Hayır, yanlışlıkla basmayı önlemek için aralı), `Notice` (kalıcı uyarı kutusu), `TimePickerBig` (+/− düğmeli, tekerleksiz). Risk seviyesi ayrı bir bileşen değil, sonuç ekranındaki `LEVEL_STYLE` ile çizilir.

### 10.1 Denetim ve sonuçlar (Aşama 6, Ekim 2026)

**A — Otomatik testler** (`app/__tests__/accessibility.test.tsx`, denetleyici `app/test-utils/a11yAudit.ts`, kontrast `src/theme/contrast.ts`):

- **Kontrast:** WCAG 2.x göreli parlaklık formülüyle hesaplanır. Tüm renk çiftleri ve dört sonuç seviyesi ≥ 7:1.

  | Çift | Oran |
  |---|---|
  | metin / zemin | 18.9 |
  | beyaz / ana renk | 8.0 |
  | beyaz / tehlike | 7.3 |
  | uyarı metni / uyarı zemini | 8.4 |
  | beyaz / başarı | 7.9 |
  | ikincil metin / zemin | 12.6 |

- **Ekran taraması:** 14 ekran durumu (sonuç kırmızı ve yeşil dahil) örnek verilerle çizilir. Ağaç dolaşılır ve şunlar denetlenir:
  - her yazı ≥ 20pt;
  - yazı ile arkasındaki zemin ≥ 7:1;
  - basılabilir her öğede rol ve okunabilir ad;
  - dokunma alanı ≥ 64pt;
  - ekranda başlık;
  - yazı kutusunda etiket;
  - İngilizce terim yok.

  Tarama sistem yazı ölçeği **1**'de yapılır (en kötü durum). Jest'in varsayılan ölçeği 2'dir; bu ölçekte yazılar 1.4 kat büyük ölçülür ve 20pt alt sınırı boşa çıkar.
- **Öz-test:** Denetleyicinin küçük yazı, düşük kontrast, rolsüz/küçük buton ve başlıksız ekranı gerçekten yakaladığı ayrı bir testle doğrulanır.
- **Sonuç:** İhlal çıkmadı. Aşama 1–5'te bileşenler (`AppText`, `BigButton`, `ScreenContainer`) kurallara göre yazıldığı için ekranlar kendiliğinden uyuyordu.

**B — Ekran ekran inceleme** (otomatik testin göremediği VoiceOver davranışı). Bulunan ve düzeltilen sorunlar:

| Sorun | Düzeltme |
|---|---|
| VoiceOver emojileri adıyla okuyordu ("kum saati Bekliyor", "uyarı işareti 1 ilacınız bitmek üzere") | `spokenText`: düz metinde ve buton etiketinde süs karakterleri atılır; sesli okuma da aynı kuralı kullanır (eski kural ⏳ ⏭️ ↩️ • ℹ️ işaretlerini kaçırıyordu) |
| Doğrulama hatası, "mesaj bulunamadı", stok onayı, rehberden doldurma bilgisi iOS'ta okunmuyordu (`accessibilityLiveRegion` yalnızca Android) | `announce` / `useAnnounce`; `Notice`'a `announce` seçeneği (yalnızca sonradan beliren uyarılarda; ekranla açılan kalıcı uyarılar her girişte okunmasın) |
| Kurulum ve ilaç ekleme sihirbazında İleri'ye basınca ekran değişiyor ama VoiceOver fark etmiyordu (buton yerinde kalıyor) | Yeni adımın adı ve sırası duyurulur ("Hangi saatlerde? 3. adım, toplam 7"; stok takibi seçilirse reçete adımı eklenir ve toplam 8 olur) |
| Saat seçicide + / − sonrası yeni saat söylenmiyordu | Her basışta "saat 9 tam" / "saat 8, 5 geçe" |
| ALDIM / Geri al sonrası sessizlik | "Tansiyon ilacı alındı olarak işaretlendi. 10 saniye içinde geri alabilirsiniz." |
| İlaç kartında durum iki kez okunuyordu (satır etiketi + ayrı durum yazısı) | Ayrı yazı ekran okuyucudan gizlendi |
| Kutu boşken "Kontrol Et" soluk ve devre dışıydı; yaşlı kullanıcı nedenini anlamıyor, VoiceOver "soluk" diyordu | Buton her zaman etkin; basınca "Önce mesajı yapıştırın…" uyarısı |

Testler: `app/__tests__/screenReader.test.tsx` (15 test). Toplam uygulama testi 273 → 315.

**C — Elle test listesi:** [`docs/erisilebilirlik-kontrol-listesi.md`](erisilebilirlik-kontrol-listesi.md). İçerik:
- VoiceOver ile ekran ekran 28 madde;
- en büyük metin + "Çok büyük";
- gri tonlama, kalın metin, kontrastı artır;
- dokunma ve anlaşılırlık;
- örnek mesajlar ve bulunan sorunlar tablosu.

**Sınırlar:**
- Otomatik tarama stil değerlerini ölçer, gerçek çizimi değil. Kırpılma, taşma ve odak sırası yalnızca telefonda görülür.
- Duyuruların VoiceOver'da gerçekten okunduğu testte taklit edilir (`announceForAccessibility` çağrısı denetlenir). Asıl doğrulama C listesiyle iPhone'da yapılacaktır.
- Sonuç ekranı sarı ve reklam seviyeleri ekran taramasına ayrıca alınmadı. Renk çiftleri kontrast testinde denetlenir, düzen kırmızı/yeşil ile aynıdır.

---

## 11. Gizlilik, etik, güvenlik
- Tüm veriler yalnızca cihazda. Ağ isteği yok, analitik yok, reklam yok (KVKK açısından en temiz yaklaşım; raporda vurgulanır).
- SMS içerikleri saklanmaz. Kontrol edilen mesaj ekrandan çıkınca bellekten atılır.
- Uygulama tıbbi tavsiye vermez. Hakkında ekranına "İlaç dozunu doktorunuz belirler, bu uygulama yalnızca hatırlatır." notu konur.
- **Ad ve resmiyet:** Uygulamanın adı "e-Torun" (önceki çalışma adı "Yanımda"). "e-" ön eki yasal olarak devlete ayrılmış değildir, ancak e-Devlet / e-Nabız'ı çağrıştırdığı için resmi kurum izlenimi verilmez: T.C. ibaresi, ay-yıldız, devlet logosu veya renkleri kullanılmaz; kurulumun ilk ekranında ve Hakkında'da "e-Torun bir devlet uygulaması değildir; gönüllü bir öğrenci projesidir" notu yer alır. Ticari yayın planlanırsa TÜRKPATENT'te 9. ve 42. sınıflarda marka araması yapılmalı (Ekim 2026 itibarıyla App Store TR'de aynı adlı uygulama yok).
- Dolandırıcılık tespiti %100 değildir. Yeşil sonuçta da dikkat uyarısı bulunur.
- Kullanıcı testinde: bilgilendirilmiş onam, isim yerine "K1, K2" kodu, fotoğraflarda yüz yok ya da açık izin var, test için uygulamaya gerçek ilaç bilgisi değil örnek veri girilir.

---

## 12. Test stratejisi
- **Birim (Jest, `jest-expo`):** normalize, ngrams, tfidf, classify, rules, decide, schedule fonksiyonları, telefon doğrulama, weekday dönüşümü.
- **Parity:** Python ↔ TS (bölüm 9.5).
- **Python (pytest):** normalize örnekleri, export edilen JSON'un şeması.
- **Erişilebilirlik (otomatik):** kontrast, ekran taraması ve ekran okuyucu davranışı (bölüm 10.1).
- **Erişilebilirlik (elle):** `docs/erisilebilirlik-kontrol-listesi.md` (VoiceOver, büyük yazı, gri tonlama).
- **Elle test kontrol listesi (iPhone):**
  - [ ] 2 dk sonraya kurulan bildirim uygulama kapalıyken geliyor
  - [ ] Bildirime dokununca doğru ekran açılıyor
  - [ ] İlaç silinince bildirimi de siliniyor
  - [ ] Stok uyarısı ve "ilacınız bitiyor" bildirimi doğru günde geliyor; "Yeni kutu aldım" sonrası kalkıyor
  - [ ] "Yakınımdan randevu iste" SMS uygulamasını doğru numara ve hazır metinle açıyor (iOS `sms:` gövde biçimi)
  - [ ] Çok büyük yazı + iOS en büyük metin ayarında taşma yok
  - [ ] VoiceOver ile 3 ana görev tamamlanabiliyor
  - [ ] Uçak modunda her şey çalışıyor
  - [ ] 10 gerçek dolandırıcılık + 10 gerçek normal SMS doğru seviyede
  - [ ] Bildirim izni reddedilince uygulama çökmüyor, uyarı gösteriyor

---

## 13. Saha uygulaması — "nerede, hangi zaman diliminde"
Hocanın istediği "projenin nerede ve ne zaman gerçekleştiği" kısmı buradan çıkar.

- **Yer:** Gebze/Kocaeli. Aile büyükleri, komşular veya bir semt/cami derneği, muhtarlık ya da yaşlı merkezi.
- **Zaman:** 30 Kasım – 6 Aralık 2026 haftası. Rapora net tarihler yazılır.
- **Katılımcı:** 3–5 kişi, 60+ yaş.
- **Hazırlık (`docs/kullanici-testi/`):** 1 sayfalık onam metni, görev kâğıdı, 5 soruluk anket (gülen yüz ölçekli, 1–5).
- **Görevler** (uygulama senin iPhone'unda, örnek verilerle):
  1. "Her akşam 20:00'de alınan 'Tansiyon ilacı'nı ekleyin."
  2. "Gelen hatırlatmayı açıp 'Aldım' deyin." (2 dk sonrasına kurulmuş örnek bildirim)
  3. "Kızınızı arayın." (kayıtlı kişi = senin numaran)
  4. "Size gösterdiğim 3 mesajı kontrol edin." (1 normal, 2 dolandırıcılık)
- **Ölçülecekler:** görev tamamlandı mı, süre, yardım gerekti mi, anket puanları, akılda kalan cümleler (anonim).
- **Belgeler:** Fotoğraflar (eller + ekran, yüz yok), mümkünse kurum veya muhtarlıktan teşekkür/katılım yazısı, sonuç tablosu.
- Test sonrası en az 2 iyileştirme yapılır ve raporda "geri bildirimle yapılan değişiklikler" olarak yer alır (sosyal sorumluluk projesinin güçlü kanıtı).

---

## 14. Zaman planı

| Hafta | Tarih | İş | Çıktı |
|---|---|---|---|
| 1 | 19–25 Eki | Ortam kurulumu, repo, Expo iskeleti, tema ve bileşenler; veri setlerini indirme; dolandırıcılık SMS'i toplamaya başlama | Expo Go'da açılan ana ekran |
| 2 | 26 Eki–1 Kas | ML: normalize, veri birleştirme, model karşılaştırma, eşik, export, parity vektörleri | `model.json`, `reports/` |
| 3 | 2–8 Kas | Kurulum sihirbazı, ayarlar, depolama katmanı, Acil Yardım modülü | A1–A3, C1–C2 |
| 4 | 9–15 Kas | İlaç modülü + bildirimler + senkronizasyon + stok takibi ve randevu yönlendirmesi | B1–B4, B6–B7 |
| 5 | 16–22 Kas | Dedektör TS (normalize, n-gram, tfidf, classify, rules, decide), parity testi, sonuç ekranı, sesli okuma, Yakınıma sor | D1–D6 |
| 6 | 23–29 Kas | Erişilebilirlik cilası, elle test listesi, hata durumları, kullanıcı testi materyalleri | Test edilebilir sürüm |
| 7 | 30 Kas–6 Ara | **Saha uygulaması**, fotoğraflar, geri bildirim, düzeltmeler | Test sonuçları |
| 8 | 7–13 Ara | README, ekran görüntüleri, mimari diyagram, PDF rapor | **Teslim** |
| Tampon | 14–30 Ara | Gecikmeler için | — |

Hızlı ilerlersen 3–5. haftalar sıkıştırılabilir ve saha testi Kasım ortasına çekilebilir.

---

## 15. Rapor (PDF) içeriği
Hocanın 3 maddesine birebir karşılık gelecek şekilde, tek PDF dosyası:

1. **Kapak:** Manisa Celal Bayar Üniversitesi · Hasan Ferdi Turgutlu Teknoloji Fakültesi · Yazılım Mühendisliği · Sosyal Sorumluluk Dersi · Proje adı ("e-Torun: Yaşlı Bireyler için Dijital Yardımcı Uygulama") · Ad Soyad · Öğrenci No: ______ · Dersi veren: Prof. Dr. Akın Özçift · Aralık 2026.
2. **Projenin kısa tanıtımı:** problem ve kaynaklı istatistik, amaç, hedef kitle, özellikler, kullanılan teknolojiler, **nerede** (Gebze/Kocaeli, geliştirme + saha uygulaması yeri) ve **zaman dilimi** (Ekim–Aralık 2026, saha testi tarihleri).
3. **Resimler ve belgeler:** ana ekran ve her modülden ekran görüntüleri, kırmızı/sarı/yeşil sonuç örnekleri, mimari diyagram, model karşılaştırma tablosu ve karışıklık matrisi, saha fotoğrafları, kullanıcı testi sonuç tablosu, varsa teşekkür yazısı, GitHub QR kodu.
4. Sonuç, kazanımlar, geliştirme önerileri, kaynakça.

**Toplanacaklar listesi (süreç boyunca `docs/rapor/` içine):** her modülün ekran görüntüsü (iPhone yan tuş + ses açma) · ML grafikleri · saha fotoğrafları · anket sonuçları · kaynak linkleri.

---

## 16. Claude Code ile çalışma akışı
1. `yanimda/` klasörünü aç. `CLAUDE.md` köke, bu dosya `docs/PROJE_PLANI.md` olarak gider. `git init` yap ve GitHub'da `omer-damar/yanimda` reposunu oluştur.
2. Her aşamayı **ayrı bir oturumda/görevde** ver. Büyük işlerde önce plan modunda plan iste, onaylayınca kodlat.
3. Her aşama sonunda: testler + tip kontrolü + iPhone'da deneme + commit.

**Sırayla verilecek komut örnekleri:**
- *Aşama 1:* "docs/PROJE_PLANI.md bölüm 3, 4 ve 10'u oku. `app/` altında en güncel Expo şablonuyla TypeScript + expo-router projesi kur, tema dosyalarını ve BigButton, ScreenContainer, ConfirmDialog bileşenlerini oluştur, ana ekranı (A1) sahte verilerle yap. Jest'i jest-expo ile kur."
- *Aşama 2:* "Bölüm 9'u oku. `ml/` klasörünü kur, normalize.py'yi ve testlerini yaz, veri yükleme ve train.py'yi hazırla. Veri dosyalarını ben `ml/data/raw/` içine koyacağım; beklenen dosya formatlarını README'ye yaz."
- *Aşama 3:* "Bölüm 5 ve 7: kurulum sihirbazı, ayarlar, depolama katmanı ve Acil Yardım modülü."
- *Aşama 4:* "Bölüm 6: ilaç modülü. Önce saf fonksiyonları ve testlerini yaz, sonra bildirimleri, sonra ekranları; ardından B6 stok takibi ve B7 randevu yönlendirmesi."
- *Aşama 5:* "Bölüm 8 ve 9.5: dedektörün TS tarafı, parity testi ve sonuç ekranı."
- *Aşama 6:* "Bölüm 10 ve 12'deki kontrol listesine göre tüm ekranları denetle ve düzelt."

---

## 17. Riskler ve B planları

| Risk | Etki | B planı |
|---|---|---|
| Expo Go yeni SDK'ya güncellenir, proje açılmaz | Yüksek | `npx expo install expo@latest --fix` ile SDK yükseltilir. Ders süresince büyük yükseltme beklenmez |
| Aynı ağda bağlantı yok | Orta | `--tunnel` |
| Türkçe veri seti yetersiz veya ulaşılamıyor | Orta | Uysal vd. (HF) + kendi `scam_tr.csv` + sınırlı sentetik veri; kurallar katmanı tek başına da çalışır |
| Model JS'te farklı sonuç veriyor | Orta | Parity testi. Gerekirse word n-gram + daha basit normalizasyon |
| Bildirimler gelmiyor | Yüksek | İzin durumu kontrolü, Odaklanma/Sessiz modu notu, `getAllScheduledNotificationsAsync` ile hata ayıklama ekranı (yalnızca geliştirme) |
| Saha testine katılımcı bulunamaz | Orta | Aile büyükleri + komşular. En az 3 kişi yeterli |
| Zaman | Düşük | P2 maddeleri atılır, P0+P1 ile proje tamdır |

---

### Kaynaklar
- Expo Notifications dokümanı: https://docs.expo.dev/versions/latest/sdk/notifications/
- Uysal, A. K., Gunal, S., Ergin, S., & Gunal, E. S. (2013). The impact of feature extraction and selection on SMS spam filtering. *Elektronika ir Elektrotechnika*, 19(5), 67–72. — https://huggingface.co/datasets/akuysal/turkishSMS-ds
- SMS Spam Detection System Based on Deep Learning Architectures for Turkish and English Messages (2024), *Applied Sciences* — https://www.mdpi.com/2076-3417/14/24/11804
