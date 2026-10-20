import pytest

from scripts.relabel_tr_spam import classify, key_of
from src.normalize import normalize


def run(text):
    return classify(normalize(text), text)


@pytest.mark.parametrize(
    "text",
    [
        "LOFT'ta %50 indirim! SMS almak istemiyorsaniz LOFT yazip 7889'a gonderin",
        "Tum urunlerde %30 indirim. Mersis:0859052472300016",
        "Kampanya: kargo bedava! Cikmak icin: HBSMS yaz 3172'ye gonder.",
    ],
)
def test_legal_ad_marker_is_ad(text):
    assert run(text)[:2] == ("reklam", "oto_reklam_isareti")


@pytest.mark.parametrize(
    "text",
    [
        "Bahisin tek adresi, 300 TL hosgeldin bonusu",
        "En yuksek oranlar, 30 dakikada cekim www.jojobet2.com",
        "%15 Para Yatirma Bonusu ve hizli cekim",
    ],
)
def test_gambling_goes_to_review(text):
    assert run(text)[:2] == ("dolandiricilik", "aday_bahis")


def test_fraud_cue_goes_to_review_but_stays_ad_until_checked():
    label, method, reason = run("Kredi icin TC kimlik numaranizi 3280'e gonderin")
    assert (label, method) == ("reklam", "aday_dolandiricilik")
    assert "kişisel bilgi" in reason


def test_plain_ad_is_default_ad():
    assert run("Kis indirimi basladi! Tum montlarda %40 indirim magazalarimizda")[:2] == (
        "reklam",
        "oto_reklam_varsayilan",
    )


def test_key_is_stable_and_short():
    assert key_of("ornek metin") == key_of("ornek metin")
    assert len(key_of("ornek metin")) == 12
