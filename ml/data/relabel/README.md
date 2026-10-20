# Türkçe "spam"in yeniden etiketlenmesi

TurkishSMSCollection (Karasoy & Ballı, 2021) ve Uysal vd. (2013) veri setlerindeki "spam" mesajlarının
büyük çoğunluğu dolandırıcılık değil, **yasal ticari reklamdır** (Mersis numarası, RET/İYS ret yöntemi,
banka ve operatör kampanyaları). v1 modeli bu yüzden "reklam dedektörü" olarak çalışıyordu. v2'de bu
mesajlar 3 sınıfa ayrılır: `reklam`, `dolandiricilik`, (yanlışlıkla spam sayılmış) `normal`.

Betik: `python -m scripts.relabel_tr_spam` (testler: `tests/test_relabel_tr_spam.py`).

## Dosyalar
- `tr_spam_labels.csv`: her tekil spam mesajı için `key, source, label, scam_type, method, note`.
  **Metin içermez**; `key`, normalize edilmiş metnin SHA-1'inin ilk 12 karakteridir, ham veri yeniden
  indirildiğinde aynı mesaja eşleşir.
- `tr_spam_overrides.csv`: elle verilen kararlar (betik bunları otomatik etiketin üstüne yazar).

## Yöntem
1. Yasal reklam işareti (Mersis, "RET yaz", "SMS iptal", "istemiyorsanız"...) → `reklam` (920 mesaj).
2. Bahis/kumar işareti (bahis kelimeleri ya da "...bet.com" adresleri) → elle inceleme.
3. Dolandırıcılık ipuçları (kişisel bilgi isteme, bloke tehdidi, hukuki tehdit, para isteme, ödül + link/telefon) →
   elle inceleme. 94 adayın 75'i gerçek banka/operatör kampanyası çıktı (ör. "TC kimlik numaranızı 5724'e
   gönderin" kredi başvuruları).
4. Hiçbiri yoksa → `reklam`. Bu grupta ödül/arama/kredi kelimesi geçen 329 mesaj tek tek okundu, kalanından
   rastgele 80 mesajlık örneklem okundu. Okumada kaçan bahis siteleri bulununca bahis kuralı genişletildi.

## Sonuç (2.743 tekil spam)
| Etiket | TurkishSMSCollection | Uysal | Toplam |
|---|---|---|---|
| reklam | 2.368 | 326 | 2.694 |
| dolandiricilik | 33 | 4 | 37 |
| normal | 1 | 3 | 4 |
| atla (müstehcen ima, belirsiz) | 8 | 0 | 8 |

Dolandırıcılık türleri: bahis 14, odul 12 ("adınıza tanımlanan Samsung S6", "kol saati kazandınız, hemen
arayın"), diger 6 (sahte cinsel sağlık ürünü, ücretli rehber hattı), icra_dava 2 ("hakkınızda dava var mı,
11899'u arayın"), kargo 2, kredi 1.

5. Elle `reklam` dışı etiketlenen bir mesaja çok benzeyen (yalnızca isim/tarih/numara farklı) otomatik satırlar
   yeniden incelemeye alınır (`aday_benzer`); v2 eğitiminin yanlış alarmlarında bulunan iki kopya böyle düzeltildi.

**Sınırlılık:** Otomatik `reklam` grubunun tamamı okunmadı. İncelenen 80 mesajlık örneklemde bahis kuralı
düzeltildikten sonra 2 hata kaldı (ikisi de düzeltildi); bu grupta yaklaşık %1-3 hatalı etiket beklenebilir.
