import pytest

from src.translation_check import check_row


def row(text, label="dolandiricilik", scam_type="kargo"):
    return {"queue_id": "x", "label": label, "scam_type": scam_type, "text_tr": text}


def test_good_translation_passes():
    assert check_row(row("PTT: Gönderiniz adres eksikliği nedeniyle teslim edilemedi. Güncellemek için: ptt-teslimat-takip.xyz")) == []


@pytest.mark.parametrize(
    "text, fragment",
    [
        ("Kargonuz bekliyor, £1.99 ücreti ödeyin: ptt-takip.xyz", "yabancı para"),
        ("Tebrikler, 500 USD kazandınız! Hemen tıklayın", "yabancı para"),
        ("USPS: kargonuz teslim edilemedi, tıklayın", "yerelleştirilmemiş"),
        ("Hesabınız bloke. Please click here now to verify your account", "İngilizce"),
        ("Your package could not be delivered, please update address", "Türkçe"),
        ("Ödülünüz için hemen arayın: 0906 123 4567", "TR dışı telefon"),
    ],
)
def test_catches_untranslated_traces(text, fragment):
    assert any(fragment in p for p in check_row(row(text)))


def test_turkish_phone_and_long_tracking_numbers_ok():
    assert check_row(row("Kargonuz yolda. Takip no 2709659538381. Bilgi: 0555 123 45 67 veya 0850 222 33 44")) == []


def test_label_and_type_rules():
    assert check_row(row("Hesabınız bloke edildi, tıklayın", scam_type="")) == ["geçersiz dolandırıcılık türü: ''"]
    assert check_row(row("Migros: %20 indirim! SMS ret için RET yazıp 7447'ye gönderin", label="reklam", scam_type="kargo")) == [
        "dolandırıcılık olmayan satırda tür var"
    ]
    assert check_row({"queue_id": "x", "label": "atla", "scam_type": "", "text_tr": ""}) == []
    assert "geçersiz etiket" in check_row(row("metin metin metin metin", label="spam"))[0]


def test_foreign_tld_in_domain_is_not_a_leftover():
    assert check_row(row("Gonderiniz bekliyor, onaylayin: https://wwj4w-yurtici.us/jWX")) == []


def test_ascii_turkish_is_recognized():
    assert check_row(row("GONDEREN:ZiraatBank KONU:HEMEN ARAYIN: 0850 309 49 04! MESAJ: Hesap Kilitlendi!", scam_type="banka_hesap")) == []
