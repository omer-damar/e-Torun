# e-Torun — Yaşlılar için Dijital Yardımcı

Yaşlı bireyler için tek, sade ve gizliliği koruyan bir iPhone uygulaması (Expo / React Native):

- 💊 **İlaç hatırlatıcı:** ilaç saatinde yerel bildirim, "Aldım" ve geri alma, 7 günlük geçmiş,
  stok takibi ve ilaç bitmeden randevu yönlendirmesi (ALO 182, MHRS, yakına hazır SMS)
- 📞 **Acil yardım:** kayıtlı yakınları ve 112'yi (her zaman onaylı) tek dokunuşla arama
- ✉️ **Mesaj kontrolü:** şüpheli SMS'i telefonun içindeki bir makine öğrenmesi modeli ve anlaşılır
  kurallarla değerlendirme: **yüksek risk / dikkat / belirgin risk yok / reklam**
- 🤖 **İsteğe bağlı ikinci görüş:** Ayarlar'dan açılırsa sonuç ekranında "Yapay zekâya da sor"
  (mesaj gönderilmeden önce numara, kod, IBAN ve kart bilgileri gizlenir)

Erişilebilirlik önceliklidir:
- en az 20pt yazı, 64pt dokunma alanı ve 7:1 kontrast;
- VoiceOver desteği ve iOS büyük yazı uyumu;
- her ekranda "Ana Sayfa" butonu, kaybolan uyarı yok.

Manisa Celal Bayar Üniversitesi Yazılım Mühendisliği, **Sosyal Sorumluluk** dersi bireysel projesi.

> **e-Torun bir devlet uygulaması değildir**; "e-" ön eki yalnızca adın parçasıdır.
> (Önceki çalışma adı "Yanımda"; repo ve Expo proje kimliği `yanimda` olarak kaldı.)

Ayrıntılı gereksinimler, mimari, ölçümler ve sonuçlar: [docs/PROJE_PLANI.md](docs/PROJE_PLANI.md)

## Gizlilik

- Kişiler, ilaçlar, ayarlar ve kontrol edilen mesajlar **yalnızca telefonda** kalır. Hesap, analitik ve reklam yoktur.
- Mesaj kontrolü internetsiz, telefonun içinde çalışır.
- Tek ağ isteği, kullanıcının Ayarlar'dan açıp sonuç ekranında **kendisinin başlattığı** "Yapay zekâya da sor" isteğidir. Mesaj maskelenmiş olarak `server/`'a gider; sunucu mesajı loglamaz, saklamaz.
- Yapay zekâ API anahtarı yalnızca sunucunun `.env` dosyasındadır; uygulamaya hiçbir zaman konmaz.

## Klasör yapısı

```
yanimda/
├─ CLAUDE.md               # geliştirme kuralları
├─ docs/
│  ├─ PROJE_PLANI.md       # gereksinimler, mimari, ölçümler, sonuçlar
│  ├─ erisilebilirlik-kontrol-listesi.md   # iPhone'da elle erişilebilirlik testi
│  └─ rapor/               # ders raporu, ekran görüntüleri, fotoğraflar
├─ app/                    # Expo (React Native) + TypeScript + expo-router
│  ├─ src/app/             # ekranlar
│  ├─ src/components/      # BigButton, ScreenContainer, ConfirmDialog …
│  ├─ src/detector/        # SMS sınıflandırıcı (model.json + kurallar + karar)
│  ├─ src/features/        # modüllerin iş mantığı
│  ├─ src/theme/ · src/utils/
│  ├─ test-utils/          # erişilebilirlik denetleyicisi, altın test okuyucu
│  └─ __tests__/           # Jest testleri
├─ server/                 # isteğe bağlı yapay zekâ ikinci görüşü (Node, bağımlılıksız)
└─ ml/                     # Python: veri, eğitim, dışa aktarma, ölçümler
   ├─ data/                # scam_tr, çeviriler, sentetik ve yeniden etiketlenmiş veri
   ├─ src/ · scripts/ · tests/
   ├─ reports/             # metrikler, karışıklık matrisleri, karşılaştırmalar
   └─ exports/             # Python ↔ TypeScript eşitlik vektörleri
```

## Çalıştırma

### Uygulama (Expo Go, SDK 57)

Gereksinimler: Node.js LTS ve iPhone'da App Store'dan **Expo Go**.

```bash
cd app
npm install
npx expo start --port 8082   # QR kodunu iPhone kamerasıyla okut
npx jest                     # testler
npx tsc --noEmit             # tip kontrolü
npx expo install <paket>     # paket ekleme (npm install değil)
```

### Yapay zekâ sunucusu (isteğe bağlı)

```bash
cd server
copy .env.example .env       # GEMINI_API_KEY'i .env'e yaz (Google AI Studio)
npm start                    # http://0.0.0.0:4100
npm test
```

Uygulamanın sunucuyu bulması için `app/.env` dosyasına `EXPO_PUBLIC_LLM_URL=http://<bilgisayarın IP'si>:4100` yazılır (örnek: `app/.env.example`). Adres değişince Metro `--clear` ile yeniden başlatılır. Sunucu kapalıyken uygulama normal çalışır; yalnızca yapay zekâ butonu "ulaşılamadı" der.

### Model (ml/)

Python 3.11+ gerekir.

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m pytest
python -m src.dataset_v2     # birleştir, tekilleştir, şablon gruplamalı böl
python -m src.train_v2       # ablasyon, model ve eşik seçimi, reports/*_v2
python -m src.export_model   # app/src/detector/model.json + exports/parity_vectors.json
```

Model: karakter n-gram TF-IDF + üç sınıflı lojistik regresyon (normal / reklam / dolandırıcılık), telefonda saf TypeScript ile çalışır; Python ile birebir aynı sonucu verdiği eşitlik testiyle doğrulanır. Sonuçlar ve karşılaştırmalar: `docs/PROJE_PLANI.md` bölüm 8–9 ve `ml/reports/`.

## Veri ve lisanslar

Ham veri setleri `ml/data/raw/` içine indirilir ve **repoda yoktur**:

| Dosya | Kaynak |
|---|---|
| `TurkishSMSCollection.csv` | [onrkrsy/TurkishSMS-Collection](https://github.com/onrkrsy/TurkishSMS-Collection) (Karasoy & Ballı, 2021) |
| `uysal_*.parquet` | [akuysal/turkishSMS-ds](https://huggingface.co/datasets/akuysal/turkishSMS-ds) (Uysal vd., 2013) |
| `foreign/` | SmishTank, Mendeley SMS Phishing, UCI SMS Spam |

Repodaki türetilmiş veriler:
- `ml/data/scam_tr.csv`: yayımlanmış gerçek dolandırıcılık SMS'leri (anonimleştirilmiş, kaynaklı) ve sentetik örnekler.
- `ml/data/translated/`: yabancı setlerin yapay zekâ ile Türkçeye çevrilip yerelleştirilmiş hâlleri. Kaynak lisansları korunur: SmishTank kaynaklılar **CC BY-NC-SA 4.0**, Mendeley ve UCI kaynaklılar **CC BY 4.0**; ayrıntı klasörün README'sinde.
- `ml/data/synthetic/`: yapay zekâ ile yazılmış meşru mesajlar (yalnızca eğitimde).
- `ml/data/relabel/`: TurkishSMSCollection "spam" mesajlarının reklam / dolandırıcılık olarak yeniden etiketlenmesi.

Kullanıcının kendi gelen kutusundan etiketlediği mesajlar (altın test) `ml/data/raw/inbox/` içinde kalır ve repoya girmez; repoda yalnızca toplu sayılar vardır.

## Geliştirme

Proje Claude Code (Anthropic) yardımıyla geliştirildi; çalışma akışı `docs/PROJE_PLANI.md` bölüm 16'da anlatılır.
