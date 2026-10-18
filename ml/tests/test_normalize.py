import json
from pathlib import Path

import pytest

from src.normalize import normalize

# Aynı dosya app/__tests__/normalize.test.ts tarafından da okunur (Python ↔ TS eşitliği).
CASES = json.loads((Path(__file__).parent / "normalize_cases.json").read_text(encoding="utf-8"))


def test_case_count():
    assert len(CASES) >= 30


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["input"][:30] or "<boş>")
def test_shared_cases(case):
    assert normalize(case["input"]) == case["expected"]


def test_dotted_capital_i_is_single_char():
    # 'İ'.lower() Python'da 'i' + U+0307 üretir; normalize bunu önlemeli.
    assert normalize("İ") == "i"


def test_turkish_and_ascii_spellings_match():
    assert normalize("HESABINIZ BLOKE EDİLDİ") == normalize("hesabiniz bloke edildi")


def test_decomposed_input_is_composed_first():
    # 'ş' = 's' + U+0327 (birleşik çengel) olarak gelirse de 's' olmalı.
    assert normalize("şifre") == "sifre"


@pytest.mark.parametrize(
    "text",
    ["https://ptt-kargo.xyz/a", "www.ornek.com", "sahte-banka.com.tr/giris", "bit.ly/3abc", "t.co/x"],
)
def test_links_become_single_token(text):
    assert normalize(text) == "urltoken"


def test_dotted_word_is_not_a_link():
    assert normalize("ali.trabzon") == "ali trabzon"


@pytest.mark.parametrize("text", ["0555 123 45 67", "+905551234567", "5551234567", "0 555 1234567"])
def test_phone_numbers(text):
    assert normalize(text) == "teltoken"


@pytest.mark.parametrize("text", ["TR12 0006 1005 1978 6457 8413 26", "TR120006100519786457841326"])
def test_iban(text):
    assert normalize(text) == "ibantoken"


def test_idempotent():
    for case in CASES:
        assert normalize(case["expected"]) == case["expected"]
