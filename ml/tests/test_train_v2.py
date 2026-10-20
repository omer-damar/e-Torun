import numpy as np
import pandas as pd
import pytest

from src import train_v2 as t
from src.dataset_v2 import CLASS_ID

N, R, F = CLASS_ID["normal"], CLASS_ID["reklam"], CLASS_ID["dolandiricilik"]


def test_threshold_flags_at_most_allowed_share_of_negatives():
    scores = np.linspace(0, 1, 200)
    threshold = t.lowest_threshold_with_fpr(scores, 0.01)
    assert (scores >= threshold).sum() <= 2
    # Bir sonraki negatif de alarm verirse oran aşılırdı; eşik gereksiz yüksek değil.
    assert (scores >= np.sort(scores)[-3]).sum() == 3


def test_choose_thresholds_ignores_fraud_scores_and_keeps_gap():
    y = np.array([N] * 100 + [R] * 100 + [F] * 5)
    p = np.concatenate([np.linspace(0, 0.3, 200), np.full(5, 0.99)])
    th = t.choose_thresholds(y, p)
    assert th["high"] >= th["low"] + 0.1
    assert 0.2 <= th["low"] <= 0.8


def test_fraud_alarm_metrics_separates_normal_and_ad_false_alarms():
    y = np.array([N, N, R, R, F, F])
    p = np.array([0.9, 0.1, 0.9, 0.9, 0.9, 0.1])
    m = t.fraud_alarm_metrics(y, p, 0.5)
    assert m["fraud_caught"] == "1/2"
    assert m["false_alarm_normal"] == 0.5
    assert m["false_alarm_reklam"] == 1.0
    assert m["false_alarm_normal_reklam"] == 0.75


def test_select_prefers_fewer_hard_negative_alarms_within_tolerance():
    table = pd.DataFrame(
        [
            {"config": "a", "C": 1.0, "macro_f1": 0.910, "hard_negative_as_fraud": 0.30},
            {"config": "b", "C": 1.0, "macro_f1": 0.907, "hard_negative_as_fraud": 0.05},
            {"config": "c", "C": 1.0, "macro_f1": 0.800, "hard_negative_as_fraud": 0.00},
        ]
    )
    assert t.select(table)["config"] == "b"


def test_select_falls_back_to_best_f1_when_no_one_is_close():
    table = pd.DataFrame(
        [
            {"config": "a", "C": 1.0, "macro_f1": 0.95, "hard_negative_as_fraud": 0.30},
            {"config": "b", "C": 1.0, "macro_f1": 0.90, "hard_negative_as_fraud": 0.00},
        ]
    )
    assert t.select(table)["config"] == "a"


def test_with_config_drops_unlisted_sources_and_sets_weights():
    df = pd.DataFrame({"origin": ["gercek", "ceviri", "sentetik"], "weight": [1.0, 1.0, 1.0]})
    out = t.with_config(df, {"gercek": 1.0, "sentetik": 0.25})
    assert list(out["origin"]) == ["gercek", "sentetik"]
    assert list(out["weight"]) == [1.0, 0.25]


def test_held_out_hard_negatives_are_only_synthetic_normals():
    df = pd.DataFrame(
        {
            "text": [f"mesaj {i}" for i in range(400)],
            "origin": ["sentetik"] * 200 + ["gercek"] * 200,
            "label": ["normal"] * 400,
            "source": ["sentetik:syn"] * 200 + ["turkish_sms_collection"] * 200,
        }
    )
    held = t.is_held_out_hard_negative(df)
    assert held[200:].sum() == 0
    assert 0.1 < held[:200].mean() < 0.3
    assert held.equals(t.is_held_out_hard_negative(df))  # her çalıştırmada aynı


@pytest.mark.parametrize("name", list(t.CONFIGS))
def test_every_config_trains_on_real_data(name):
    assert t.CONFIGS[name].get("gercek") == 1.0
