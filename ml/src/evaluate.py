"""Metrikler, eşik seçimi ve rapor grafikleri — bölüm 9.3."""

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

# Yaşlı kullanıcıyı gereksiz korkutmamak için hedefler (bölüm 9.3).
MAX_FPR_LOW = 0.03  # SARI: güvenli mesajların en fazla %3'ü uyarı alsın
MAX_FPR_HIGH = 0.005  # KIRMIZI: güvenli mesajların en fazla %0.5'i "DİKKAT!" görsün
DEFAULT_THRESHOLDS = {"high": 0.80, "low": 0.40}


def metrics_at(y_true, proba, threshold: float) -> dict:
    y_pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "threshold": round(float(threshold), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "false_positive_rate": round(float(fp / (fp + tn)) if fp + tn else 0.0, 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def _lowest_threshold_with_fpr(y_true, proba, max_fpr: float) -> float:
    """FPR'ı `max_fpr` altında tutan en düşük eşik (en yüksek yakalama oranı)."""
    fpr, _tpr, thresholds = roc_curve(y_true, proba)
    ok = thresholds[(fpr <= max_fpr) & np.isfinite(thresholds)]
    return float(ok.min()) if len(ok) else 1.0


def choose_thresholds(y_val, proba_val) -> dict:
    """Doğrulama setinden SARI (low) ve KIRMIZI (high) eşiklerini seçer.

    low: güvenli mesajlarda en fazla %3 yanlış alarm verecek en düşük eşik,
    high: en fazla %0.5 yanlış alarm. Sonuç [0.30, 0.95] aralığına kırpılır ve
    high, low'dan en az 0.15 yukarıda tutulur (iki seviyenin anlamı karışmasın).
    """
    low = _lowest_threshold_with_fpr(y_val, proba_val, MAX_FPR_LOW)
    high = _lowest_threshold_with_fpr(y_val, proba_val, MAX_FPR_HIGH)
    low = float(np.clip(low, 0.30, 0.80))
    high = float(np.clip(max(high, low + 0.15), 0.50, 0.95))
    return {
        "low": round(low, 4),
        "high": round(high, 4),
        "rule": f"low: val FPR ≤ {MAX_FPR_LOW:.1%}, high: val FPR ≤ {MAX_FPR_HIGH:.1%}",
    }


def roc_auc(y_true, scores) -> float:
    return round(float(roc_auc_score(y_true, scores)), 4)


def save_confusion_matrix(y_true, proba, threshold: float, path) -> None:
    y_pred = (proba >= threshold).astype(int)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    ConfusionMatrixDisplay.from_predictions(
        y_true,
        y_pred,
        display_labels=["Güvenli", "Şüpheli"],
        cmap="Blues",
        colorbar=False,
        ax=ax,
    )
    ax.set_xlabel("Model tahmini")
    ax.set_ylabel("Gerçek etiket")
    ax.set_title(f"Karışıklık matrisi (test, eşik {threshold:.2f})")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def save_pr_curve(y_true, proba, thresholds: dict, path) -> None:
    precision, recall, thr = precision_recall_curve(y_true, proba)
    fig, ax = plt.subplots(figsize=(5.5, 4.5))
    ax.plot(recall, precision, color="#0B4F9C", linewidth=2, label="Lojistik regresyon")
    for name, color, marker in (("low", "#5C4300", "o"), ("high", "#B00020", "s")):
        t = thresholds[name]
        idx = int(np.searchsorted(thr, t))
        idx = min(idx, len(thr) - 1)
        label = "Sarı eşik" if name == "low" else "Kırmızı eşik"
        ax.scatter(recall[idx], precision[idx], color=color, marker=marker, s=60, zorder=3, label=f"{label} ({t:.2f})")
    ax.set_xlabel("Yakalama oranı (recall)")
    ax.set_ylabel("Kesinlik (precision)")
    ax.set_title("Kesinlik–yakalama eğrisi (test)")
    ax.set_xlim(0, 1.02)
    ax.set_ylim(0, 1.02)
    ax.grid(alpha=0.3)
    ax.legend(loc="lower left")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
