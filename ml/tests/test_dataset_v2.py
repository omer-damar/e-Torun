import pandas as pd
import pytest

from src import dataset_v2 as ds
from src.normalize import normalize


def rows(items):
    """items: (text, label, origin)"""
    df = pd.DataFrame(items, columns=["text", "label", "origin"])
    df["source"] = df["origin"]
    df["scam_type"] = ""
    return df


def test_deduplicate_keeps_real_copy_and_drops_conflicts():
    df = rows(
        [
            ("Kargonuz teslim edilemedi link", "dolandiricilik", "sentetik"),
            ("Kargonuz teslim edilemedi link", "dolandiricilik", "gercek"),
            ("Aynı metin iki etiket", "normal", "gercek"),
            ("Aynı metin iki etiket", "reklam", "gercek"),
        ]
    )
    out, stats = ds.deduplicate(df)
    assert list(out["origin"]) == ["gercek"]
    assert stats["conflicting_label_groups"] == 1
    assert stats["duplicates_removed"] == 1


def test_template_groups_merge_near_copies_only():
    texts = [
        "Bugun 14:00-17:00 arasi Spor kategorisinde ekstra %10 indirim! Cikmak icin HBSMS yaz 3172",
        "Bugun 10:00-12:00 arasi Spor kategorisinde ekstra %15 indirim! Cikmak icin HBSMS yaz 3172",
        "Anne aksam yemege gelemiyorum, babama da soyler misin",
    ]
    groups = ds.template_groups(pd.Series([normalize(t) for t in texts]))
    assert groups[0] == groups[1]
    assert groups[2] != groups[0]


WORDS = (
    "elma kalem deniz bulut kitap orman kahve masa sehir tren yol kedi kopek dag nehir ruzgar gunes ay "
    "yildiz kapi pencere bahce cicek agac tas kum su ates toprak demir altin gumus cam kagit"
).split()


def make_split_input(n_per_class=60):
    rng = __import__("random").Random(1)
    items = []
    for label in ds.CLASSES:
        for _ in range(n_per_class):
            items.append((" ".join(rng.sample(WORDS, 6)), label, "gercek"))
    items += [("ceviri dolandiricilik ornegi tiklayin", "dolandiricilik", "ceviri")]
    items += [("sentetik normal ornek mesaj", "normal", "sentetik")]
    df = rows(items)
    df["normalized"] = df["text"].map(normalize)
    return df


def test_split_keeps_non_real_in_train_and_groups_apart():
    train, val, test = ds.split(make_split_input())
    assert set(val["origin"]) == {"gercek"}
    assert set(test["origin"]) == {"gercek"}
    assert {"ceviri", "sentetik"} <= set(train["origin"])
    real_train_groups = set(train.loc[train["origin"] == "gercek", "group"])
    assert not real_train_groups & set(val["group"])
    assert not real_train_groups & set(test["group"])
    assert not set(val["group"]) & set(test["group"])
    for part in (val, test):
        assert set(part["label"]) == set(ds.CLASSES)


def test_split_drops_non_real_rows_identical_to_held_out_text():
    df = make_split_input()
    _, val, _ = ds.split(df)
    leaked = val["text"].iloc[0]
    df = pd.concat([df, rows([(leaked, val["label"].iloc[0], "sentetik")]).assign(normalized=normalize(leaked))])
    train, _, _ = ds.split(df)
    assert leaked not in set(train.loc[train["origin"] == "sentetik", "text"])


def test_finalize_adds_ids_and_weights():
    df = rows([("a b c", "reklam", "ceviri")]).assign(group=-1)
    out = ds.finalize(df)
    assert out.loc[0, "label_id"] == ds.CLASS_ID["reklam"]
    assert out.loc[0, "weight"] == pytest.approx(ds.ORIGIN_WEIGHT["ceviri"])
    assert list(out.columns) == ds.COLUMNS


def test_csv_batches_skip_atla(tmp_path):
    path = tmp_path / "batch_001.csv"
    path.write_text(
        "queue_id,label,scam_type,text_tr,note\n"
        "smishtank:1,dolandiricilik,kargo,Kargonuz bekliyor,\n"
        "smishtank:2,atla,,,müstehcen\n",
        encoding="utf-8",
    )
    out = ds.load_csv_batches([path], "ceviri", "ceviri")
    assert list(out["label"]) == ["dolandiricilik"]
    assert out.loc[0, "source"] == "ceviri:smishtank"
