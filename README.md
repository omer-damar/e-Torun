# Yanımda — Yaşlılar için Dijital Yardımcı

Yaşlı bireyler için tek, sade, çevrimdışı ve gizliliği koruyan bir mobil uygulama:

- 💊 **İlaç hatırlatıcı:** ilaç saatlerinde yerel bildirim, "Aldım" işaretleme, 7 günlük geçmiş
- 📞 **Acil yardım:** kayıtlı yakınları ve 112'yi (onaylı) tek dokunuşla arama
- ✉️ **Mesaj kontrolü:** şüpheli SMS'i cihaz içindeki bir ML modeli ve anlaşılır kurallarla değerlendirme

Manisa CBÜ Yazılım Mühendisliği, Sosyal Sorumluluk dersi bireysel projesidir.
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

Henüz kurulmadı, Aşama 2'de eklenecek. Komutlar için `CLAUDE.md` dosyasına bakın.
