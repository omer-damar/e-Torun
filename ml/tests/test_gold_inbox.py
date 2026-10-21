import numpy as np

from src.gold_inbox import ML_DIR, model_rates, parse_inbox, parse_label


def test_parse_label_accepts_turkish_letters_and_tuned_suffix():
    assert parse_label("dolandiricilik") == ("dolandiricilik", False)
    assert parse_label("  DOLANDIRICILIK ") == ("dolandiricilik", False)
    assert parse_label("Dolandırıcılık") == ("dolandiricilik", False)
    assert parse_label("Emin değilim") == ("emin_degilim", False)
    assert parse_label("normal ayarlandi") == ("normal", True)
    assert parse_label("spam") is None


def test_example_file_matches_app_parser_expectations():
    # app/__tests__/goldInbox.test.ts aynı dosyadan aynı sonucu bekler.
    items, errors, _ = parse_inbox((ML_DIR / "data" / "inbox_ornek.txt").read_text(encoding="utf-8"))
    assert errors == []
    assert [(it.label, it.tuned) for it in items] == [
        ("normal", False),
        ("reklam", False),
        ("dolandiricilik", False),
        ("normal", True),
        ("emin_degilim", False),
    ]


def test_parse_keeps_multiline_text_and_reports_problems():
    items, _, _ = parse_inbox("normal\nbirinci satır\n#ikinci satır\n")
    assert items[0].text == "birinci satır\n#ikinci satır"

    items, errors, duplicates = parse_inbox("spam\nmerhaba\n---\nnormal\n---\nnormal\naynı\r\n---\r\nnormal\naynı\n")
    assert errors == ['1. blok: etiket tanınmadı: "spam"', "2. blok: mesaj metni yok"]
    assert len(items) == 1
    assert duplicates == 1


def test_model_rates_use_both_thresholds():
    rates = model_rates(np.array([0.1, 0.3, 0.5, 0.9]), {"low": 0.2, "high": 0.4})
    assert rates == {"kirmizi": 0.5, "sari_veya_kirmizi": 0.75}
