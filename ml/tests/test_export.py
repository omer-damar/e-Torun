import json
import math
from pathlib import Path

import pytest
from sklearn.feature_extraction.text import TfidfVectorizer

from src.export_model import (
    MAX_MODEL_BYTES,
    MODEL_PATH,
    PARITY_PATH,
    char_wb_ngrams,
    fraud_probability,
    predict_from_export,
)
from src.features import NGRAM_RANGE
from src.normalize import normalize

SKLEARN_ANALYZER = TfidfVectorizer(analyzer="char_wb", ngram_range=NGRAM_RANGE, lowercase=False).build_analyzer()


@pytest.mark.parametrize(
    "text",
    [
        "hesabiniz bloke edildi",
        "a",  # kelime n'den kısa: bir kez sayılır
        "ab cd",
        "abc",
        "urltoken num teltoken",
        "cok fazla bosluk",
        "",
    ],
)
def test_char_wb_ngrams_match_sklearn(text):
    assert char_wb_ngrams(text) == SKLEARN_ANALYZER(text)


def test_char_wb_ngrams_match_sklearn_on_parity_texts():
    vectors = json.loads(PARITY_PATH.read_text(encoding="utf-8"))
    for vector in vectors:
        assert char_wb_ngrams(vector["normalized"]) == SKLEARN_ANALYZER(vector["normalized"])


@pytest.fixture(scope="module")
def model():
    if not MODEL_PATH.exists():
        pytest.skip("model.json yok; önce python -m src.export_model")
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


def test_model_json_schema(model):
    assert model["classes"] == ["normal", "reklam", "dolandiricilik"]
    assert model["ngramRange"] == list(NGRAM_RANGE)
    assert model["sublinearTf"] is True and model["norm"] == "l2"
    assert len(model["intercepts"]) == 3 and all(isinstance(v, float) for v in model["intercepts"])
    assert 0 < model["thresholds"]["low"] < model["thresholds"]["high"] < 1
    assert 1000 <= len(model["features"]) <= 20000
    for ngram, row in list(model["features"].items())[:500]:
        assert 3 <= len(ngram) <= 5
        idf, *coefs = row
        assert idf >= 1 and len(coefs) == 3 and all(math.isfinite(c) for c in coefs)
    assert MODEL_PATH.stat().st_size < MAX_MODEL_BYTES


def test_parity_vectors_are_consistent(model):
    vectors = json.loads(PARITY_PATH.read_text(encoding="utf-8"))
    assert len(vectors) >= 150
    for vector in vectors:
        assert vector["normalized"] == normalize(vector["text"])
        probabilities = predict_from_export(model, vector["text"])
        assert sum(probabilities) == pytest.approx(1.0)
        assert all(abs(a - b) < 1e-6 for a, b in zip(probabilities, vector["probabilities"]))


def test_obvious_messages(model):
    scam = "Hesabınız bloke edilmiştir. Kaldırmak için hemen tıklayın: https://banka-dogrula.xyz/giris"
    safe = "Anne akşam yemeğe geliyoruz, ekmek alalım mı?"
    ad = "Tüm ürünlerde %50 indirim başladı! SMS almak istemiyorsanız RET yazıp 3444'e gönderin. Mersis: 0123456789000015"
    assert fraud_probability(model, scam) >= model["thresholds"]["high"]
    assert fraud_probability(model, safe) < model["thresholds"]["low"]
    probabilities = predict_from_export(model, ad)
    assert probabilities.index(max(probabilities)) == model["classes"].index("reklam")
    assert fraud_probability(model, ad) < model["thresholds"]["low"]
