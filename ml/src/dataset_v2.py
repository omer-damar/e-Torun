"""v2 veri seti: 3 sınıf (normal, reklam, dolandiricilik) — PROJE_PLANI.md bölüm 9.6.

Çalıştırma: python -m src.dataset_v2
Çıktı: data/processed/v2/{train,val,test}.csv + reports/data_summary_v2.json

Kurallar:
- Doğrulama ve test setleri YALNIZCA gerçek Türkçe mesajlardan oluşur. Çeviri ve sentetik satırlar
  yalnızca eğitime girer, daha düşük örnek ağırlığıyla.
- Şablon gruplaması: birbirine çok benzeyen gerçek mesajlar (aynı kampanyanın farklı tarihli sürümleri gibi)
  aynı gruba konur; bir grup ya tamamen eğitimde ya tamamen doğrulama/testte olur.
- TurkishSMSCollection ve Uysal "spam"i data/relabel/tr_spam_labels.csv ile yeniden etiketlenir.

v1 hattı (src/load_data.py, src/train.py) olduğu gibi kalır; v2 eğitimi bu dosyanın çıktısını kullanır.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import StratifiedGroupKFold

from scripts.relabel_tr_spam import LABELS_PATH, key_of
from src.load_data import (
    DATA_DIR,
    PROCESSED_DIR,
    RANDOM_STATE,
    REPORTS_DIR,
    fill_placeholders,
    load_turkish_sms_collection,
    load_uysal,
)
from src.normalize import normalize

V2_DIR = PROCESSED_DIR / "v2"
TRANSLATED_DIR = DATA_DIR / "translated"
SYNTHETIC_DIR = DATA_DIR / "synthetic"

CLASSES = ["normal", "reklam", "dolandiricilik"]
CLASS_ID = {name: i for i, name in enumerate(CLASSES)}
COLUMNS = ["text", "label", "label_id", "scam_type", "source", "origin", "weight", "group"]

# Gerçek dışı verinin eğitimdeki ağırlığı (doğrulama setinde ablasyonla gözden geçirilir).
ORIGIN_WEIGHT = {"gercek": 1.0, "ceviri": 0.5, "sentetik": 0.5}

# Bu benzerliğin (karakter n-gram kosinüs) üstündeki gerçek mesajlar aynı şablon grubuna girer.
TEMPLATE_SIMILARITY = 0.8
# StratifiedGroupKFold katları: 1 kat test, 1 kat doğrulama, kalanlar eğitim (~%70 / %15 / %15).
N_FOLDS = 7


def _frame(text, label, source, origin, scam_type="") -> pd.DataFrame:
    df = pd.DataFrame({"text": text, "label": label, "source": source, "origin": origin, "scam_type": scam_type})
    return df.reset_index(drop=True)


def load_real_turkish(labels_path: Path = LABELS_PATH) -> pd.DataFrame:
    """TurkishSMSCollection + Uysal; spam satırları yeniden etiketlenir, 'atla' satırları çıkarılır."""
    df = pd.concat([load_turkish_sms_collection(), load_uysal()], ignore_index=True)
    df["key"] = df["text"].astype(str).map(lambda t: key_of(normalize(t)))
    relabel = pd.read_csv(labels_path, dtype=str, keep_default_na=False).drop_duplicates("key").set_index("key")

    spam = df["label"] == 1
    missing = set(df.loc[spam, "key"]) - set(relabel.index)
    if missing:
        raise ValueError(f"{len(missing)} spam mesajının yeni etiketi yok; önce python -m scripts.relabel_tr_spam")
    label = np.where(spam, df["key"].map(relabel["label"]), "normal")
    scam_type = np.where(spam, df["key"].map(relabel["scam_type"]), "")
    out = _frame(df["text"], label, df["source"], "gercek", scam_type)
    return out[out["label"] != "atla"]


def load_scam_tr(path: Path = DATA_DIR / "scam_tr.csv") -> pd.DataFrame:
    """Gerçek (kaynak linkli) dolandırıcılık örnekleri + eski sentetik örnekler."""
    df = pd.read_csv(path, encoding="utf-8")
    synthetic = df["synthetic"].fillna(False).astype(bool)
    label = np.where(df["label"].astype(int) == 1, "dolandiricilik", "normal")
    source = "scam_tr:" + np.where(synthetic, df["source"].astype(str), "gercek")
    origin = np.where(synthetic, "sentetik", "gercek")
    return _frame(df["text"].map(fill_placeholders), label, source, origin)


def load_csv_batches(paths: list[Path], origin: str, source_prefix: str) -> pd.DataFrame:
    """data/translated/batch_*.csv ve data/synthetic/normal_*.csv ('atla' satırları çıkarılır)."""
    if not paths:
        return pd.DataFrame(columns=["text", "label", "source", "origin", "scam_type"])
    df = pd.concat([pd.read_csv(p, dtype=str, keep_default_na=False) for p in paths], ignore_index=True)
    df = df[df["label"] != "atla"]
    source = source_prefix + ":" + df["queue_id"].str.split(":").str[0]
    return _frame(df["text_tr"], df["label"], source, origin, df["scam_type"])


def load_all() -> pd.DataFrame:
    parts = [
        load_real_turkish(),
        load_scam_tr(),
        load_csv_batches(sorted(TRANSLATED_DIR.glob("batch_*.csv")), "ceviri", "ceviri"),
        load_csv_batches(sorted(SYNTHETIC_DIR.glob("normal_*.csv")), "sentetik", "sentetik"),
    ]
    df = pd.concat(parts, ignore_index=True)
    unknown = set(df["label"]) - set(CLASSES)
    if unknown:
        raise ValueError(f"tanımsız etiket: {unknown}")
    return df


def deduplicate(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Normalize metne göre tekilleştirir. Aynı metin farklı etiketle geliyorsa grup atılır;
    kopyalardan gerçek olan tutulur."""
    df = df.copy()
    df["normalized"] = df["text"].astype(str).map(normalize)
    empty = df["normalized"] == ""
    df = df[~empty]
    conflicting = df.groupby("normalized")["label"].nunique()
    conflicting = set(conflicting[conflicting > 1].index)
    clean = df[~df["normalized"].isin(conflicting)]
    rank = clean["origin"].map({"gercek": 0, "ceviri": 1, "sentetik": 2})
    deduped = clean.assign(_rank=rank).sort_values("_rank", kind="stable").drop_duplicates("normalized")
    stats = {
        "empty_after_normalize": int(empty.sum()),
        "conflicting_label_groups": len(conflicting),
        "rows_dropped_for_conflict": int(len(df) - len(clean)),
        "duplicates_removed": int(len(clean) - len(deduped)),
    }
    return deduped.drop(columns="_rank").reset_index(drop=True), stats


def template_groups(normalized: pd.Series, threshold: float = TEMPLATE_SIMILARITY) -> np.ndarray:
    """Benzerliği eşiğin üstündeki mesajları birleştirir (union-find); her satıra grup numarası verir."""
    n = len(normalized)
    parent = np.arange(n)

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    if n:
        vectors = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit_transform(normalized)
        for start in range(0, n, 1000):
            block = (vectors[start : start + 1000] @ vectors.T).tocoo()
            for i, j, s in zip(block.row + start, block.col, block.data):
                if i < j and s >= threshold:
                    parent[find(i)] = find(j)
    return np.array([find(i) for i in range(n)])


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Gerçek satırlar şablon gruplarına göre, sınıf oranı korunarak bölünür; gerçek dışı satırlar eğitime."""
    real = df[df["origin"] == "gercek"].reset_index(drop=True)
    other = df[df["origin"] != "gercek"]
    real["group"] = template_groups(real["normalized"])

    folds = StratifiedGroupKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    fold_of = np.empty(len(real), dtype=int)
    for k, (_, idx) in enumerate(folds.split(real, real["label"], groups=real["group"])):
        fold_of[idx] = k
    test, val, train_real = real[fold_of == 0], real[fold_of == 1], real[fold_of >= 2]

    # Gerçek dışı bir satır doğrulama/test metniyle birebir aynıysa eğitimden çıkarılır (sızıntı).
    held_out = set(val["normalized"]) | set(test["normalized"])
    other = other[~other["normalized"].isin(held_out)].assign(group=-1)
    train = pd.concat([train_real, other]).sample(frac=1, random_state=RANDOM_STATE)
    return train.reset_index(drop=True), val.reset_index(drop=True), test.reset_index(drop=True)


def finalize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["label_id"] = df["label"].map(CLASS_ID)
    df["weight"] = df["origin"].map(ORIGIN_WEIGHT)
    df["scam_type"] = df["scam_type"].fillna("")
    return df[COLUMNS]


def _counts(df: pd.DataFrame) -> dict:
    return {
        "rows": len(df),
        "by_label": df["label"].value_counts().reindex(CLASSES, fill_value=0).to_dict(),
        "by_origin": df["origin"].value_counts().to_dict(),
    }


def main() -> None:
    raw = load_all()
    deduped, dedup_stats = deduplicate(raw)
    train, val, test = split(deduped)

    V2_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    for name, part in (("train", train), ("val", val), ("test", test)):
        finalize(part).to_csv(V2_DIR / f"{name}.csv", index=False, encoding="utf-8")

    real_groups = pd.concat([train[train["origin"] == "gercek"], val, test])["group"]
    summary = {
        "classes": CLASSES,
        "origin_weight": ORIGIN_WEIGHT,
        "raw": _counts(raw),
        "deduplication": dedup_stats,
        "template_groups": {
            "real_rows": int(len(real_groups)),
            "groups": int(real_groups.nunique()),
            "largest_group": int(real_groups.value_counts().max()),
            "similarity_threshold": TEMPLATE_SIMILARITY,
        },
        "splits": {"train": _counts(train), "val": _counts(val), "test": _counts(test)},
        "test_fraud_by_source": test.loc[test["label"] == "dolandiricilik", "source"].value_counts().to_dict(),
    }
    (REPORTS_DIR / "data_summary_v2.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
