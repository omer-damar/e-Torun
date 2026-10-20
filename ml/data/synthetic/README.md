# Sentetik normal mesajlar (zor negatifler)

Bu klasördeki `normal_*.csv` dosyalarındaki mesajlar **gerçek değildir**. Yapay zekâ (Claude, Anthropic) ile
Türkiye'deki kurumların gerçekte gönderdiği SMS biçimleri örnek alınarak **yazılmıştır**. Amaçları modele
"dolandırıcılığa benzeyen ama meşru" mesajları öğretmektir: doğrulama kodları, harcama bildirimleri, kargo
teslimatı, e-Devlet ve MHRS bildirimleri, fatura hatırlatmaları, yakınlardan gelen gündelik mesajlar.

- Yalnızca **eğitimde** kullanılır; model başarısı her zaman gerçek Türkçe mesajlarla ölçülür
  (bkz. `docs/PROJE_PLANI.md` bölüm 9.6, ablasyon adımı "+ sentetik").
- İsimler, telefon numaraları, kart/hesap numaraları ve kodlar **uydurmadır**. Telefon numaraları
  `0850 000 ..` / `0555 000 ..` biçimindedir; gerçek kişi ya da kurum numarası kullanılmaz.
- Linkler yalnızca kurumların **resmi alan adlarıdır** (ör. `turkiye.gov.tr`, `ptt.gov.tr`), çünkü meşru
  mesajları dolandırıcılıktan ayıran en önemli işaretlerden biri budur.
- Reklam mesajı yoktur; yasal reklamlar ayrı `reklam` sınıfıdır.
- `normal_009.csv` (40 mesaj): **linkli** meşru kargo/e-ticaret bildirimleri ("teslim edildi, memnuniyet
  anketi", "dağıtıma çıktı, canlı takip"). Telefonda gerçek bir Amazon teslimat bildirimi modelden %83
  dolandırıcılık olasılığı alıyordu: eğitimde linkli meşru kargo mesajı neredeyse yoktu ve model linkin
  adresini görmez (normalizasyon her linki "urltoken" yapar). Eklendikten sonra aynı mesaj %16 aldı;
  sahte kargo mesajlarını yakalama oranı değişmedi (çeviri kargo dolandırıcılığı: 60 → 61 kırmızı).

## Güncel ölçüm (v1 dedektör, 400 mesaj)
| Parti | Konu | Yeşil | Sarı | Kırmızı |
|---|---|---|---|---|
| 001, 005 | banka ve finans | 15 | 45 | 40 |
| 002 | kargo | 10 | 18 | 22 |
| 003, 006 | kamu, sağlık, operatör, belediye | 33 | 34 | 32 (+1 reklam) |
| 007 | ulaşım, hizmet, e-ticaret | 19 | 24 | 7 |
| 004, 008 | kişisel, aile, uygulama kodları | 78 | 13 | 9 |
| **Toplam** | | **155** | **134** | **110** |

Kurumsal mesajlarda yanlış alarm çok yüksek; kişisel mesajlarda düşük. v2 hedefi: bu mesajların
neredeyse hepsi yeşil, gerçek dolandırıcılık yakalama oranı korunarak.

## İlk ölçüm (v1 dedektör, 200 mesaj)
Uygulamadaki mevcut dedektör (v1 model + kurallar) bu 200 meşru mesajın **136'sını** sarı ya da kırmızı
buldu (kırmızı 68, sarı 68, yeşil 63, reklam 1). Ölçüm sırasında iki kural hatası düzeltildi (tutar/tarihin
link sayılması, "gönderiniz"in para isteği sayılması; kırmızı 81 → 68). Kalan yanlış alarmların ana sebebi
v1 modelinin kurumsal dili "spam" sanması ve kurum adı geçen her mesajın "kurum taklidi" sayılmasıdır;
v2 eğitiminin bu mesajlarla çözmesi beklenir. Gerçek başarı yine gerçek mesajlarla ölçülecektir.

Şema `data/translated/` ile aynıdır (`queue_id, label, scam_type, text_tr, note`); `queue_id` = `syn:NNNN`,
`label` = `normal`, `note` = kategori. Denetim: `python -m src.translation_check`.
