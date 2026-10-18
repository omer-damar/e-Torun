"""Model karşılaştırma, seçim, eşik ve test raporu — bölüm 9.3.

Çalıştırma: python -m src.train   (önce python -m src.load_data)
Çıktılar:
  reports/metrics.json, reports/cv_comparison.csv, reports/confusion_matrix.png,
  reports/pr_curve.png, reports/misclassified.csv, reports/top_ngrams.json
  artifacts/model.joblib  (export_model.py tarafından okunur, repoya girmez)
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from src import evaluate
from src.features import make_vectorizer
from src.load_data import PROCESSED_DIR, RANDOM_STATE, REPORTS_DIR, source_group

ML_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = ML_DIR / "artifacts"

CANDIDATES = {
    "MultinomialNB": lambda: MultinomialNB(),
    "LogReg C=0.1": lambda: LogisticRegression(C=0.1, class_weight="balanced", max_iter=2000),
    "LogReg C=1": lambda: LogisticRegression(C=1, class_weight="balanced", max_iter=2000),
    "LogReg C=10": lambda: LogisticRegression(C=10, class_weight="balanced", max_iter=2000),
    "LinearSVC": lambda: LinearSVC(class_weight="balanced"),
}


def load_splits() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    read = lambda name: pd.read_csv(PROCESSED_DIR / f"{name}.csv", encoding="utf-8", keep_default_na=False)
    return read("train"), read("val"), read("test")


def compare_models(train: pd.DataFrame) -> pd.DataFrame:
    """5 katlı stratified CV, F1 ve ROC-AUC. Vektörleştirici her katta yeniden öğrenilir (sızıntı yok)."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    rows = []
    for name, make_model in CANDIDATES.items():
        pipeline = Pipeline([("tfidf", make_vectorizer()), ("clf", make_model())])
        scores = cross_validate(
            pipeline, train["normalized"], train["label"], cv=cv, scoring=["f1", "roc_auc", "precision", "recall"]
        )
        rows.append(
            {
                "model": name,
                "f1_mean": scores["test_f1"].mean(),
                "f1_std": scores["test_f1"].std(),
                "roc_auc_mean": scores["test_roc_auc"].mean(),
                "precision_mean": scores["test_precision"].mean(),
                "recall_mean": scores["test_recall"].mean(),
            }
        )
        print(f"  {name:<14} F1 {rows[-1]['f1_mean']:.4f} ± {rows[-1]['f1_std']:.4f}  AUC {rows[-1]['roc_auc_mean']:.4f}")
    return pd.DataFrame(rows).round(4)


def top_ngrams(pipeline: Pipeline, k: int = 20) -> dict:
    names = pipeline.named_steps["tfidf"].get_feature_names_out()
    coef = pipeline.named_steps["clf"].coef_[0]
    order = np.argsort(coef)
    as_list = lambda idx: [{"ngram": names[i], "coef": round(float(coef[i]), 4)} for i in idx]
    return {"supheli_yonunde": as_list(order[::-1][:k]), "guvenli_yonunde": as_list(order[:k])}


def main() -> None:
    train, val, test = load_splits()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Model karşılaştırma (5 katlı CV, eğitim seti):")
    cv_table = compare_models(train)
    cv_table.to_csv(REPORTS_DIR / "cv_comparison.csv", index=False)

    # Seçim: lojistik regresyon (olasılık verir, TS'te kolay çalışır). C, CV F1'e göre seçilir.
    logreg_rows = cv_table[cv_table["model"].str.startswith("LogReg")]
    best_name = logreg_rows.sort_values(["f1_mean", "roc_auc_mean"], ascending=False).iloc[0]["model"]
    print(f"Seçilen: {best_name}")

    pipeline = Pipeline([("tfidf", make_vectorizer()), ("clf", CANDIDATES[best_name]())])
    pipeline.fit(train["normalized"], train["label"])

    proba_val = pipeline.predict_proba(val["normalized"])[:, 1]
    thresholds = evaluate.choose_thresholds(val["label"], proba_val)
    print(f"Eşikler (doğrulama seti): sarı ≥ {thresholds['low']}, kırmızı ≥ {thresholds['high']}")

    proba_test = pipeline.predict_proba(test["normalized"])[:, 1]
    y_test = test["label"].to_numpy()
    real_scams = test["source"].map(source_group) == "scam_tr:gercek"

    metrics = {
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "selected_model": best_name,
        "n_features": len(pipeline.named_steps["tfidf"].vocabulary_),
        "thresholds": thresholds,
        "validation": {
            "rows": len(val),
            "roc_auc": evaluate.roc_auc(val["label"], proba_val),
            "at_0_5": evaluate.metrics_at(val["label"], proba_val, 0.5),
        },
        "test": {
            "rows": len(test),
            "roc_auc": evaluate.roc_auc(y_test, proba_test),
            "at_0_5": evaluate.metrics_at(y_test, proba_test, 0.5),
            "at_low_threshold_sari_veya_kirmizi": evaluate.metrics_at(y_test, proba_test, thresholds["low"]),
            "at_high_threshold_kirmizi": evaluate.metrics_at(y_test, proba_test, thresholds["high"]),
            "real_scam_messages": {
                "rows": int(real_scams.sum()),
                "flagged_low": int((proba_test[real_scams] >= thresholds["low"]).sum()),
                "flagged_high": int((proba_test[real_scams] >= thresholds["high"]).sum()),
            },
        },
        "targets": {"f1": 0.95, "max_false_positive_rate": 0.03},
    }
    (REPORTS_DIR / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    evaluate.save_confusion_matrix(y_test, proba_test, thresholds["low"], REPORTS_DIR / "confusion_matrix.png")
    evaluate.save_pr_curve(y_test, proba_test, thresholds, REPORTS_DIR / "pr_curve.png")

    y_pred = (proba_test >= thresholds["low"]).astype(int)
    wrong = test.assign(probability=proba_test.round(4))[y_pred != y_test]
    wrong = wrong.reindex(wrong["probability"].sub(0.5).abs().sort_values(ascending=False).index).head(10)
    wrong[["text", "label", "probability", "source"]].to_csv(
        REPORTS_DIR / "misclassified.csv", index=False, encoding="utf-8"
    )
    (REPORTS_DIR / "top_ngrams.json").write_text(
        json.dumps(top_ngrams(pipeline), ensure_ascii=False, indent=2), encoding="utf-8"
    )

    joblib.dump({"pipeline": pipeline, "thresholds": thresholds, "model_name": best_name}, ARTIFACTS_DIR / "model.joblib")
    print(json.dumps(metrics["test"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
