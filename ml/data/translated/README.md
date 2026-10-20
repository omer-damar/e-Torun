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

## Kolonlar
`queue_id, label (normal | reklam | dolandiricilik | atla), scam_type, text_tr, note`
