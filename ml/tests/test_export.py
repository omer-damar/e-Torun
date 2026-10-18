import json
import math
from pathlib import Path

import pytest
from sklearn.feature_extraction.text import TfidfVectorizer

from src.export_model import MODEL_PATH, PARITY_PATH, char_wb_ngrams, predict_from_export
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
    assert model["ngramRange"] == list(NGRAM_RANGE)
    assert model["sublinearTf"] is True and model["norm"] == "l2"
    assert isinstance(model["intercept"], float)
    assert 0 < model["thresholds"]["low"] < model["thresholds"]["high"] < 1
    assert 1000 <= len(model["features"]) <= 20000
    for ngram, (idf, coef) in list(model["features"].items())[:500]:
        assert 3 <= len(ngram) <= 5
        assert idf >= 1 and math.isfinite(coef)
    assert MODEL_PATH.stat().st_size < 1_500_000


def test_parity_vectors_are_consistent(model):
    vectors = json.loads(PARITY_PATH.read_text(encoding="utf-8"))
    assert len(vectors) >= 150
    for vector in vectors:
        assert vector["normalized"] == normalize(vector["text"])
        assert abs(predict_from_export(model, vector["text"]) - vector["probability"]) < 1e-6


def test_obvious_messages(model):
    scam = "Hesabınız bloke edilmiştir. Kaldırmak için hemen tıklayın: https://banka-dogrula.xyz/giris"
    safe = "Anne akşam yemeğe geliyoruz, ekmek alalım mı?"
    assert predict_from_export(model, scam) >= model["thresholds"]["high"]
    assert predict_from_export(model, safe) < model["thresholds"]["low"]
