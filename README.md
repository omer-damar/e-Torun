# e-Torun — Yaşlılar için Dijital Yardımcı

Yaşlı bireyler için tek, sade, çevrimdışı ve gizliliği koruyan bir mobil uygulama:

- 💊 **İlaç hatırlatıcı:** ilaç saatlerinde yerel bildirim, "Aldım" işaretleme, 7 günlük geçmiş
- 📞 **Acil yardım:** kayıtlı yakınları ve 112'yi (onaylı) tek dokunuşla arama
- ✉️ **Mesaj kontrolü:** şüpheli SMS'i cihaz içindeki bir ML modeli ve anlaşılır kurallarla değerlendirme

Manisa CBÜ Yazılım Mühendisliği, Sosyal Sorumluluk dersi bireysel projesidir.
**e-Torun bir devlet uygulaması değildir**; "e-" ön eki yalnızca adın parçasıdır.
(Önceki çalışma adı "Yanımda"; repo klasörü ve Expo proje kimliği `yanimda` olarak kaldı.)
Tüm veriler yalnızca telefonda saklanır. Uygulamanın sunucusu, hesabı ve analitiği yoktur.
Ayrıntılı plan için: [docs/PROJE_PLANI.md](docs/PROJE_PLANI.md)

## Klasör yapısı

```
yanimda/
├─ CLAUDE.md               # geliştirme kuralları
├─ docs/
│  ├─ PROJE_PLANI.md       # gereksinimler, mimari, zaman planı
│  ├─ rapor/               # ekran görüntüleri, diyagramlar, saha fotoğrafları
│  └─ kullanici-testi/     # onam metni, görev senaryoları, anket
├─ ml/                     # Python: SMS sınıflandırıcı eğitimi ve dışa aktarma
│  ├─ data/{raw,processed}/
│  ├─ src/ · tests/ · reports/ · exports/
└─ app/                    # Expo (React Native) + TypeScript + expo-router
   ├─ src/app/             # ekranlar (expo-router)
   ├─ src/components/      # BigButton, ScreenContainer, ConfirmDialog …
   ├─ src/theme/           # renk, tipografi, boşluk sabitleri
   ├─ src/features/        # modüllerin iş mantığı
   ├─ src/utils/           # saf yardımcı fonksiyonlar
   └─ __tests__/           # Jest testleri
```

## Çalıştırma

### Uygulama (Expo Go)

Gereksinimler: Node.js LTS ve iPhone'da App Store'dan **Expo Go**.

```bash
cd app
npm install
npx expo start            # QR kodunu iPhone kamerasıyla okut
npx expo start --tunnel   # telefon ve bilgisayar aynı ağda bağlanamazsa
```

Geliştirme komutları:

```bash
npx jest                  # testler
npx tsc --noEmit          # tip kontrolü
npx expo install <paket>  # paket ekleme (npm install değil)
```

### Model (ml/)

Python 3.11+ gerekir. Ham veri setleri lisansları belirsiz olduğu için repoda **yoktur**,
aşağıdaki adlarla `ml/data/raw/` içine indirilmelidir:

| Dosya | Kaynak | İçerik |
|---|---|---|
| `TurkishSMSCollection.csv` | [onrkrsy/TurkishSMS-Collection](https://github.com/onrkrsy/TurkishSMS-Collection) (Karasoy & Ballı, 2021) | 4.751 mesaj; `Message;Group;GroupText`, Group 1 = Spam, 2 = Normal |
| `uysal_train.parquet`, `uysal_validation.parquet` | [akuysal/turkishSMS-ds](https://huggingface.co/datasets/akuysal/turkishSMS-ds) `data/` klasörü (Uysal vd., 2013) | 850 mesaj; `text`, `label` (spam / legitimate) |

`ml/data/scam_tr.csv` repodadır: haber, Şikayetvar ve hukuk bürosu uyarı sayfalarında
yayımlanmış gerçek dolandırıcılık SMS'leri (anonimleştirilmiş, kaynak adresiyle) ve
belgelenen kalıplardan yazılmış sentetik örnekler. Sentetik satırlar (`synthetic=True`)
yalnızca eğitim setine girer; test seti yalnızca gerçek mesajlardan oluşur.
Dosya `ml/scripts/build_scam_tr.py` ile üretilir.

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m src.load_data     # birleştir, tekilleştir, %70/%15/%15 böl
python -m src.train         # model karşılaştırma, eşik seçimi, reports/
python -m src.export_model  # app/src/detector/model.json + exports/parity_vectors.json
python -m pytest
```

Sonuçlar `ml/reports/` altında: `metrics.json`, `cv_comparison.csv`,
`confusion_matrix.png`, `pr_curve.png`, `top_ngrams.json`, `data_summary.json`.
