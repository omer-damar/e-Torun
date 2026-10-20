"""v2: 3 sınıflı model, ablasyon ve eşik seçimi — PROJE_PLANI.md bölüm 9.6.

Çalıştırma: python -m src.train_v2   (önce python -m src.dataset_v2)
Çıktılar:
  reports/metrics_v2.json, reports/ablation_v2.csv, reports/confusion_matrix_v2.png, reports/top_ngrams_v2.json
  reports/misclassified_v2.csv (repoya girmez)
  artifacts/model_v2.joblib (export tarafından okunur, repoya girmez)

Seçim kuralı (test setine bakılmadan):
1. Veri yapılandırması ve C, TÜM gerçek mesajlarla şablon gruplamalı çapraz doğrulamayla karşılaştırılır.
   Tek 767 satırlık testte yalnızca ~12 dolandırıcılık mesajı vardır; bir mesaj sonucu F1'de ~0,04 oynatır.
2. Makro F1'i en iyinin MACRO_F1_TOLERANCE kadar yakınındaki adaylar arasından, eğitime hiç girmeyen
   sentetik zor negatiflerde (kurumsal meşru mesajlar) en az "dolandırıcılık" diyen seçilir.
   Bu ölçüt sentetik veri içerdiği için raporda ayrıca belirtilir.
3. Eşikler, seçilen modelin doğrulama setindeki yanlış alarm oranına göre konur. Test yalnızca raporlanır.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    average_precision_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline

from src.dataset_v2 import CLASS_ID, CLASSES, V2_DIR
from src.features import make_vectorizer
from src.load_data import RANDOM_STATE, REPORTS_DIR
from src.normalize import normalize

ML_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = ML_DIR / "artifacts"
V1_MODEL = ARTIFACTS_DIR / "model.joblib"

FRAUD = CLASS_ID["dolandiricilik"]
C_VALUES = (1.0, 3.0, 10.0)
# Ablasyon: kaynak → eğitimdeki örnek ağırlığı. Listede olmayan kaynak eğitime girmez (bölüm 9.6).
CONFIGS = {
    "1_tr": {"gercek": 1.0},
    "2_tr_ceviri": {"gercek": 1.0, "ceviri": 0.5},
    "3_tr_ceviri_sentetik": {"gercek": 1.0, "ceviri": 0.5, "sentetik": 0.5},
    "4_tr_sentetik": {"gercek": 1.0, "sentetik": 1.0},
}
MACRO_F1_TOLERANCE = 0.005
# Yaşlı kullanıcıyı gereksiz korkutmamak için: normal + reklam mesajlarının en fazla bu kadarı uyarı alsın.
MAX_FPR_HIGH = 0.01  # KIRMIZI
MAX_FPR_LOW = 0.03  # SARI veya KIRMIZI
# Sentetik zor negatiflerin bu oranı hiçbir yapılandırmada eğitime girmez; "yanlış alarm" kontrolü için ayrılır.
HARD_NEGATIVE_SHARE = 0.2
CV_FOLDS = 5


def load_splits() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    def read(name: str) -> pd.DataFrame:
        df = pd.read_csv(V2_DIR / f"{name}.csv", encoding="utf-8", keep_default_na=False)
        return df.assign(normalized=df["text"].map(normalize))

    return read("train"), read("val"), read("test")


def is_held_out_hard_negative(df: pd.DataFrame, share: float = HARD_NEGATIVE_SHARE) -> pd.Series:
    """Sentetik normal mesajların sabit (metin özetine dayalı) bir alt kümesi."""
    bucket = df["text"].map(lambda t: int(hashlib.sha1(t.encode("utf-8")).hexdigest()[:8], 16) % 100)
    return (df["origin"] == "sentetik") & (df["label"] == "normal") & df["source"].str.startswith("sentetik:syn") & (
        bucket < share * 100
    )


def with_config(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """Yapılandırmadaki kaynakları seçer ve örnek ağırlıklarını yapılandırmaya göre ayarlar."""
    out = df[df["origin"].isin(config)].copy()
    out["weight"] = out["origin"].map(config)
    return out


def make_pipeline(c: float) -> Pipeline:
    return Pipeline(
        [
            ("tfidf", make_vectorizer()),
            ("clf", LogisticRegression(C=c, class_weight="balanced", max_iter=3000)),
        ]
    )


def fit(train: pd.DataFrame, c: float) -> Pipeline:
    pipeline = make_pipeline(c)
    pipeline.fit(train["normalized"], train["label_id"], clf__sample_weight=train["weight"].to_numpy())
    return pipeline


def lowest_threshold_with_fpr(scores_negative: np.ndarray, max_fpr: float) -> float:
    """Negatiflerin (normal + reklam) en fazla `max_fpr` kadarını işaretleyen en düşük eşik."""
    if len(scores_negative) == 0:
        return 0.5
    allowed = int(np.floor(max_fpr * len(scores_negative)))
    ranked = np.sort(scores_negative)[::-1]
    # `allowed` adet negatif eşiğin üstünde kalabilir; bir sonraki skorun hemen üstü eşik olur.
    return float(np.nextafter(ranked[allowed], 1.0)) if allowed < len(ranked) else float(ranked[-1])


def choose_thresholds(y_val: np.ndarray, p_fraud_val: np.ndarray) -> dict:
    negative = p_fraud_val[y_val != FRAUD]
    high = lowest_threshold_with_fpr(negative, MAX_FPR_HIGH)
    low = lowest_threshold_with_fpr(negative, MAX_FPR_LOW)
    low = float(np.clip(low, 0.20, 0.80))
    high = float(np.clip(max(high, low + 0.10), 0.40, 0.95))
    return {
        "low": round(low, 4),
        "high": round(high, 4),
        "rule": f"normal+reklam yanlış alarm: kırmızı ≤ {MAX_FPR_HIGH:.0%}, sarı ≤ {MAX_FPR_LOW:.0%} (doğrulama)",
    }


def fraud_alarm_metrics(y: np.ndarray, p_fraud: np.ndarray, threshold: float) -> dict:
    flagged = p_fraud >= threshold
    fraud = y == FRAUD
    rate = lambda mask: round(float(flagged[mask].mean()), 4) if mask.any() else None
    return {
        "threshold": round(float(threshold), 4),
        "fraud_recall": rate(fraud),
        "fraud_caught": f"{int(flagged[fraud].sum())}/{int(fraud.sum())}",
        "false_alarm_normal": rate(y == CLASS_ID["normal"]),
        "false_alarm_reklam": rate(y == CLASS_ID["reklam"]),
        "false_alarm_normal_reklam": rate(~fraud),
    }


def class_report(y: np.ndarray, proba: np.ndarray) -> dict:
    pred = proba.argmax(axis=1)
    p, r, f, n = precision_recall_fscore_support(y, pred, labels=range(len(CLASSES)), zero_division=0)
    per_class = {
        name: {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4), "f1": round(float(f[i]), 4), "n": int(n[i])}
        for i, name in enumerate(CLASSES)
    }
    return {
        "macro_f1": round(float(f.mean()), 4),
        "per_class": per_class,
        "confusion": confusion_matrix(y, pred, labels=range(len(CLASSES))).tolist(),
    }


def evaluate_split(pipeline: Pipeline, df: pd.DataFrame, thresholds: dict) -> dict:
    y = df["label_id"].to_numpy()
    proba = pipeline.predict_proba(df["normalized"])
    p_fraud = proba[:, FRAUD]
    return {
        "rows": len(df),
        **class_report(y, proba),
        "kirmizi": fraud_alarm_metrics(y, p_fraud, thresholds["high"]),
        "sari_veya_kirmizi": fraud_alarm_metrics(y, p_fraud, thresholds["low"]),
    }


def hard_negative_metrics(pipeline: Pipeline, df: pd.DataFrame, thresholds: dict) -> dict:
    proba = pipeline.predict_proba(df["normalized"])
    p_fraud = proba[:, FRAUD]
    return {
        "rows": len(df),
        "kirmizi": round(float((p_fraud >= thresholds["high"]).mean()), 4),
        "sari_veya_kirmizi": round(float((p_fraud >= thresholds["low"]).mean()), 4),
        "argmax_normal": round(float((proba.argmax(axis=1) == CLASS_ID["normal"]).mean()), 4),
    }


def v1_baseline(test: pd.DataFrame, hard_negatives: pd.DataFrame) -> dict | None:
    """v1 (ikili) modelin aynı test setindeki davranışı: reklamı ne kadar 'şüpheli' sayıyordu?"""
    if not V1_MODEL.exists():
        return None
    bundle = joblib.load(V1_MODEL)
    pipeline, thresholds = bundle["pipeline"], bundle["thresholds"]
    y = test["label_id"].to_numpy()
    p = pipeline.predict_proba(test["normalized"])[:, 1]
    p_hard = pipeline.predict_proba(hard_negatives["normalized"])[:, 1]
    return {
        "thresholds": {"low": thresholds["low"], "high": thresholds["high"]},
        "test_kirmizi": fraud_alarm_metrics(y, p, thresholds["high"]),
        "test_sari_veya_kirmizi": fraud_alarm_metrics(y, p, thresholds["low"]),
        "hard_negative_kirmizi": round(float((p_hard >= thresholds["high"]).mean()), 4),
        "hard_negative_sari_veya_kirmizi": round(float((p_hard >= thresholds["low"]).mean()), 4),
    }


def cv_ablation(
    train_all: pd.DataFrame, val: pd.DataFrame, test: pd.DataFrame, hard_negatives: pd.DataFrame
) -> pd.DataFrame:
    """Tüm gerçek mesajlarla şablon gruplamalı çapraz doğrulama: her gerçek mesaj bir kez katlamanın test
    payında olur, gerçek dışı satırlar her zaman eğitimde kalır. Her yapılandırma × C için bir satır."""
    real = pd.concat([train_all[train_all["origin"] == "gercek"], val, test], ignore_index=True)
    other = train_all[train_all["origin"] != "gercek"]
    folds = StratifiedGroupKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    split_idx = list(folds.split(real, real["label_id"], groups=real["group"]))
    y = real["label_id"].to_numpy()
    fraud = y == FRAUD
    rows = []
    for name, config in CONFIGS.items():
        for c in C_VALUES:
            oof = np.zeros((len(real), len(CLASSES)))
            hard_fraud = []
            for train_idx, test_idx in split_idx:
                fold_train = with_config(pd.concat([real.iloc[train_idx], other]), config)
                model = fit(fold_train, c)
                oof[test_idx] = model.predict_proba(real.iloc[test_idx]["normalized"])
                hard_fraud.append((model.predict_proba(hard_negatives["normalized"]).argmax(axis=1) == FRAUD).mean())
            report = class_report(y, oof)
            rows.append(
                {
                    "config": name,
                    "C": c,
                    "macro_f1": report["macro_f1"],
                    **{f"f1_{k}": v["f1"] for k, v in report["per_class"].items()},
                    "fraud_recall": report["per_class"]["dolandiricilik"]["recall"],
                    "fraud_precision": report["per_class"]["dolandiricilik"]["precision"],
                    "fraud_average_precision": round(float(average_precision_score(fraud, oof[:, FRAUD])), 4),
                    "hard_negative_as_fraud": round(float(np.mean(hard_fraud)), 4),
                }
            )
            print(f"  {name:<22} C={c:<4} makro F1 {rows[-1]['macro_f1']:.4f}  "
                  f"zor negatif→dolandırıcılık {rows[-1]['hard_negative_as_fraud']:.3f}", flush=True)
    table = pd.DataFrame(rows)
    table.attrs["real_rows"], table.attrs["real_fraud_rows"] = len(real), int(fraud.sum())
    return table


def select(table: pd.DataFrame) -> pd.Series:
    """Makro F1'i en iyiye yakın adaylardan zor negatiflerde en az yanlış alarm verenler; eşitlikte yüksek F1."""
    near_best = table[table["macro_f1"] >= table["macro_f1"].max() - MACRO_F1_TOLERANCE]
    return near_best.sort_values(["hard_negative_as_fraud", "macro_f1"], ascending=[True, False]).iloc[0]


def top_ngrams(pipeline: Pipeline, k: int = 20) -> dict:
    names = pipeline.named_steps["tfidf"].get_feature_names_out()
    coef = pipeline.named_steps["clf"].coef_
    out = {}
    for i, name in enumerate(CLASSES):
        order = np.argsort(coef[i])[::-1][:k]
        out[name] = [{"ngram": names[j], "coef": round(float(coef[i, j]), 4)} for j in order]
    return out


def save_confusion(conf: list, path: Path, title: str) -> None:
    fig, ax = plt.subplots(figsize=(5, 4))
    ConfusionMatrixDisplay(np.array(conf), display_labels=CLASSES).plot(ax=ax, colorbar=False)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main() -> None:
    train_all, val, test = load_splits()
    held_out = is_held_out_hard_negative(train_all)
    hard_negatives, train_all = train_all[held_out], train_all[~held_out]
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Çapraz doğrulama (tüm gerçek mesajlar, şablon gruplamalı):")
    table = cv_ablation(train_all, val, test, hard_negatives)
    table.to_csv(REPORTS_DIR / "ablation_v2.csv", index=False)
    chosen = select(table)
    config_name, c = chosen["config"], float(chosen["C"])
    print(f"Seçilen: {config_name}, C={c}")

    pipeline = fit(with_config(train_all, CONFIGS[config_name]), c)
    thresholds = choose_thresholds(val["label_id"].to_numpy(), pipeline.predict_proba(val["normalized"])[:, FRAUD])
    test_metrics = evaluate_split(pipeline, test, thresholds)

    metrics = {
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "classes": CLASSES,
        "selection_rule": (
            f"CV makro F1'i en iyinin {MACRO_F1_TOLERANCE} yakınındaki adaylardan, eğitime girmeyen sentetik zor "
            "negatiflerde en az 'dolandırıcılık' diyen"
        ),
        "selected_config": config_name,
        "selected_weights": CONFIGS[config_name],
        "selected_c": c,
        "n_features": len(pipeline.named_steps["tfidf"].vocabulary_),
        "thresholds": thresholds,
        "cross_validation": {
            "real_rows": table.attrs["real_rows"],
            "real_fraud_rows": table.attrs["real_fraud_rows"],
            "folds": CV_FOLDS,
            "table": table.to_dict("records"),
        },
        "validation": evaluate_split(pipeline, val, thresholds),
        "test": test_metrics,
        "hard_negative_check": {
            **hard_negative_metrics(pipeline, hard_negatives, thresholds),
            "note": "eğitime girmeyen sentetik normal mesajlar (yapay zekâ ile yazılmış)",
        },
        "test_fraud_rows_by_source": test.loc[test["label"] == "dolandiricilik", "source"].value_counts().to_dict(),
        "v1_baseline": v1_baseline(test, hard_negatives),
    }
    (REPORTS_DIR / "metrics_v2.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    (REPORTS_DIR / "top_ngrams_v2.json").write_text(json.dumps(top_ngrams(pipeline), ensure_ascii=False, indent=2), encoding="utf-8")
    save_confusion(test_metrics["confusion"], REPORTS_DIR / "confusion_matrix_v2.png", f"v2 test ({config_name})")

    proba = pipeline.predict_proba(test["normalized"])
    pred = proba.argmax(axis=1)
    wrong = test.assign(predicted=[CLASSES[i] for i in pred], p_fraud=proba[:, FRAUD].round(4))[pred != test["label_id"]]
    wrong[["text", "label", "predicted", "p_fraud", "source"]].to_csv(
        REPORTS_DIR / "misclassified_v2.csv", index=False, encoding="utf-8"
    )
    joblib.dump(
        {"pipeline": pipeline, "thresholds": thresholds, "classes": CLASSES, "config": config_name, "c": c},
        ARTIFACTS_DIR / "model_v2.joblib",
    )
    summary = {k: metrics[k] for k in ("selected_config", "selected_c", "thresholds", "test", "hard_negative_check", "v1_baseline")}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
