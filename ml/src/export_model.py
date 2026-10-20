"""Eğitilen v2 modelini (3 sınıf) uygulamaya aktarır — bölüm 9.4 / 9.6.

Çalıştırma: python -m src.export_model   (önce python -m src.train_v2)
Çıktılar:
  app/src/detector/model.json      (elle düzenlenmez)
  ml/exports/parity_vectors.json   (TS parity testi: { text, normalized, probabilities })

model.json (sürüm 2.x):
  classes      ["normal", "reklam", "dolandiricilik"]
  intercepts   sınıf başına sabit
  thresholds   dolandırıcılık olasılığı için { high: KIRMIZI, low: SARI }
  features     n-gram → [idf, sınıf 0 katsayısı, sınıf 1 katsayısı, sınıf 2 katsayısı]

Parity vektörleri yalnızca repoda zaten bulunan metinlerden (scam_tr.csv, normalize
test örnekleri) üretilir; veri setlerindeki kişisel SMS'ler repoya girmez.
"""

import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from src.features import NGRAM_RANGE
from src.load_data import DATA_DIR, fill_placeholders
from src.normalize import normalize

ML_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = ML_DIR.parent
BUNDLE_PATH = ML_DIR / "artifacts" / "model_v2.joblib"
MODEL_PATH = REPO_DIR / "app" / "src" / "detector" / "model.json"
PARITY_PATH = ML_DIR / "exports" / "parity_vectors.json"
MODEL_VERSION = "2.0.0"
MAX_MODEL_BYTES = 1_200_000
DECIMALS = 6
PARITY_COUNT = 200
PARITY_TOLERANCE = 1e-4


def char_wb_ngrams(normalized: str, ngram_range=NGRAM_RANGE) -> list[str]:
    """sklearn `_char_wb_ngrams` ile aynı: her kelime " w " yapılır; kelime n'den kısaysa bir kez sayılır."""
    min_n, max_n = ngram_range
    ngrams = []
    for word in normalized.split():
        w = f" {word} "
        w_len = len(w)
        for n in range(min_n, max_n + 1):
            offset = 0
            ngrams.append(w[offset : offset + n])
            while offset + n < w_len:
                offset += 1
                ngrams.append(w[offset : offset + n])
            if offset == 0:
                break
    return ngrams


def predict_from_export(model: dict, text: str) -> list[float]:
    """model.json üzerinden sınıf olasılıkları — TS tarafının referans uygulaması.

    TF = 1 + ln(sayı), × idf, L2 normalizasyon (yalnızca modelde olan n-gramlar),
    z_k = intercept_k + Σ x·coef_k, softmax.
    """
    features = model["features"]
    counts = Counter(g for g in char_wb_ngrams(normalize(text), model["ngramRange"]) if g in features)
    weights = {g: (1 + math.log(c)) * features[g][0] for g, c in counts.items()}
    norm = math.sqrt(sum(v * v for v in weights.values()))
    z = list(model["intercepts"])
    if norm > 0:
        for g, v in weights.items():
            for k in range(len(z)):
                z[k] += v / norm * features[g][k + 1]
    top = max(z)
    exp = [math.exp(v - top) for v in z]
    total = sum(exp)
    return [v / total for v in exp]


def fraud_probability(model: dict, text: str) -> float:
    return predict_from_export(model, text)[model["classes"].index("dolandiricilik")]


def build_model_json(bundle: dict) -> dict:
    pipeline = bundle["pipeline"]
    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]
    if list(clf.classes_) != list(range(len(bundle["classes"]))):
        raise ValueError(f"beklenmeyen sınıf sırası: {clf.classes_}")
    features = {
        ngram: [round(float(tfidf.idf_[idx]), DECIMALS)] + [round(float(c), DECIMALS) for c in clf.coef_[:, idx]]
        for ngram, idx in sorted(tfidf.vocabulary_.items())
    }
    return {
        "version": MODEL_VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": f"LogisticRegression multinomial C={bundle['c']} ({bundle['config']})",
        "classes": list(bundle["classes"]),
        "ngramRange": list(NGRAM_RANGE),
        "sublinearTf": True,
        "norm": "l2",
        "intercepts": [round(float(v), DECIMALS) for v in clf.intercept_],
        "thresholds": {"high": bundle["thresholds"]["high"], "low": bundle["thresholds"]["low"]},
        "features": features,
    }


def parity_texts() -> list[str]:
    scam = pd.read_csv(DATA_DIR / "scam_tr.csv", encoding="utf-8")["text"].map(fill_placeholders).tolist()
    cases = json.loads((ML_DIR / "tests" / "normalize_cases.json").read_text(encoding="utf-8"))
    texts = list(dict.fromkeys(scam + [c["input"] for c in cases]))
    return texts[:PARITY_COUNT]


def main() -> None:
    bundle = joblib.load(BUNDLE_PATH)
    model = build_model_json(bundle)

    payload = json.dumps(model, ensure_ascii=False, separators=(",", ":"))
    size = len(payload.encode("utf-8"))
    if size > MAX_MODEL_BYTES:
        raise SystemExit(f"model.json {size} bayt > {MAX_MODEL_BYTES}; features.py'de max_features'ı düşür.")
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.write_text(payload, encoding="utf-8")

    texts = parity_texts()
    sklearn_proba = bundle["pipeline"].predict_proba([normalize(t) for t in texts])
    vectors = []
    max_diff = 0.0
    for text, p_sklearn in zip(texts, sklearn_proba):
        p_export = predict_from_export(model, text)
        max_diff = max(max_diff, *(abs(a - b) for a, b in zip(p_export, p_sklearn)))
        vectors.append({"text": text, "normalized": normalize(text), "probabilities": [round(p, 8) for p in p_export]})
    if max_diff > PARITY_TOLERANCE:
        raise SystemExit(f"Dışa aktarılan model sklearn'den sapıyor: {max_diff:.2e}")

    PARITY_PATH.parent.mkdir(parents=True, exist_ok=True)
    PARITY_PATH.write_text(json.dumps(vectors, ensure_ascii=False, indent=1), encoding="utf-8")
    print(
        f"model.json {MODEL_VERSION}: {len(model['features'])} n-gram, {size / 1024:.0f} KB · "
        f"parity: {len(vectors)} vektör, sklearn'e en büyük fark {max_diff:.2e}"
    )


if __name__ == "__main__":
    main()
