# Çevrilmiş ve Türkiye'ye yerelleştirilmiş SMS'ler

Bu klasördeki `batch_*.csv` dosyaları, aşağıdaki açık veri setlerindeki İngilizce SMS'lerin
**yapay zekâ (Claude, Anthropic) ile Türkçeye çevrilip Türkiye bağlamına uyarlanmış** hâlleridir.
Yalnızca **eğitimde** kullanılır; model başarısı her zaman gerçek Türkçe mesajlarla ölçülür
(bkz. `docs/PROJE_PLANI.md` bölüm 9.6).

| `queue_id` öneki | Kaynak | Lisans |
|---|---|---|
| `smishtank:` | Timko, D., Rahman, M. L. *Smishing Dataset I: Phishing SMS Dataset from Smishtank.com* (CODASPY 2024), https://smishtank.com | CC BY-NC-SA 4.0 |
| `mendeley:` | Mishra, S., Soni, D. *SMS Phishing Dataset for Machine Learning and Pattern Recognition*, Mendeley Data, v1, 2022, doi:10.17632/f45bkkt8pr.1 | CC BY 4.0 |
| `uci:` | Almeida, T. A., Gómez Hidalgo, J. M. *SMS Spam Collection*, UCI Machine Learning Repository, doi:10.24432/C5CC84 | CC BY 4.0 |

**Bu klasördeki türetilmiş veri**, kaynaklarının koşullarına uygun olarak paylaşılır: SmishTank
kaynaklı satırlar **CC BY-NC-SA 4.0** (atıf, ticari olmayan kullanım, aynı lisansla paylaşım),
Mendeley ve UCI kaynaklı satırlar **CC BY 4.0** (atıf).

## Neler değiştirildi
- Çeviri + yerelleştirme: para birimi (TL, gerçekçi tutarlar), kurum ve markalar (ör. USPS → PTT /
  Yurtiçi, IRS → GİB / e-Devlet, Wells Fargo → Ziraat), telefon numaraları (TR biçimi, **sahte**),
  linkler (taklit mantığı korunarak **sahte** adresler), isimler, tarihler.
- Orijinal metin **saklanmaz** (gerçek numara ve canlı oltalama linkleri içerdiği için); her satır
  `queue_id` ile kaynağına bağlanır (`scripts/prepare_translation_queue.py`).
- `label = atla`: yalnızca link içeren, aynı şablonun tekrarı olan ya da Türk bağlamında karşılığı
  olmayan mesajlar.
- Her parti `python -m src.translation_check` ile denetlenir (yabancı para / terim / İngilizce
  kalıntı, Türkçe olma, TR telefon biçimi, tekrar).

## Sonuç (42 parti, kuyruğun tamamı)
| | Satır |
|---|---|
| İşlenen | 2.095 (SmishTank 1.048, Mendeley 996, UCI 51) |
| `dolandiricilik` | 555 |
| `reklam` | 66 |
| `atla` | 1.474 |

Atlamaların çoğu **aynı şablonun tekrarıdır** (ör. "0900'lü hattı arayın, ödül kazandınız" Mendeley'de
yüzlerce kez geçer); her şablondan bir iki örnek tutuldu ki model ezberlemesin. Geri kalanı müstehcen
içerik, yalnızca link, Türk bağlamında karşılığı olmayan (ABD'ye özgü dava, emlak vb.) ya da etiketi
belirsiz (gerçek kurum bildirimi olabilecek) mesajlardır. UCI'deki ek mesajların hepsi Mendeley
şablonlarının tekrarı çıktı.

Dolandırıcılık türleri: banka_hesap 158, odul 133, kargo 65, yakin_romantik 55, diger 49,
edevlet_vergi 30, yatirim 17, abonelik_fatura 17, is_ilani 16, kredi 8, icra_dava 6, bahis 1.

## Kolonlar
`queue_id, label (normal | reklam | dolandiricilik | atla), scam_type, text_tr, note`
