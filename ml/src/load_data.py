"""Ham veri setlerini birleştirir, tekilleştirir ve eğitim/doğrulama/test olarak böler.

Bölüm 9.1. Çalıştırma: `python -m src.load_data`
Çıktı: data/processed/{train,val,test}.csv + reports/data_summary.json

Etiket: 0 = güvenli, 1 = şüpheli (spam + dolandırıcılık birleşik).
"""

import json
import re
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from src.normalize import normalize

ML_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ML_DIR / "data" / "raw"
DATA_DIR = ML_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = ML_DIR / "reports"

RANDOM_STATE = 42
COLUMNS = ["text", "label", "source", "synthetic"]


def load_turkish_sms_collection(path: Path = RAW_DIR / "TurkishSMSCollection.csv") -> pd.DataFrame:
    """Karasoy & Ballı (2021). Biçim: `Message;Group;GroupText`, Group 1 = Spam, 2 = Normal.

    Mesajların ~100'ü kendi içinde ';' içeriyor (ör. ';)'), birkaçı da birden çok satıra
    yayılıyor; standart CSV okuyucu bunları atlıyor. Bu yüzden satırlar `;1;Spam` /
    `;2;Normal` sonu görülene kadar birleştirilir ve kayıt sondan iki ';' ile bölünür.
    """
    record_end = re.compile(r";[ \t]*[12][ \t]*;[ \t]*[A-Za-z]+[ \t]*$")
    records, buffer = [], []
    for line in path.read_text(encoding="utf-8-sig").splitlines()[1:]:
        buffer.append(line)
        if record_end.search(line):
            records.append("\n".join(buffer))
            buffer = []
    if any(part.strip() for part in buffer):
        raise ValueError(f"TurkishSMSCollection: tamamlanmamış kayıt: {buffer!r}")

    rows = []
    for record in records:
        message, group, _group_text = record.rsplit(";", 2)
        message = message.strip()
        if len(message) >= 2 and message.startswith('"') and message.endswith('"'):
            message = message[1:-1].replace('""', '"')
        rows.append({"text": message, "label": 1 if group.strip() == "1" else 0})
    df = pd.DataFrame(rows)
    df["source"] = "turkish_sms_collection"
    df["synthetic"] = False
    return df[COLUMNS]


def load_uysal(
    paths: tuple[Path, ...] = (RAW_DIR / "uysal_train.parquet", RAW_DIR / "uysal_validation.parquet"),
) -> pd.DataFrame:
    """Uysal vd. (2013), Hugging Face akuysal/turkishSMS-ds. label: spam / legitimate."""
    df = pd.concat([pd.read_parquet(p) for p in paths], ignore_index=True)
    df = pd.DataFrame({"text": df["text"], "label": (df["label"] == "spam").astype(int)})
    df["source"] = "uysal_2013"
    df["synthetic"] = False
    return df[COLUMNS]


def load_scam_tr(path: Path = DATA_DIR / "scam_tr.csv") -> pd.DataFrame:
    """Elle toplanan, anonimleştirilmiş dolandırıcılık SMS'leri.

    Kolonlar: text, label, source, collected_at, (isteğe bağlı) synthetic.
    Sentetik örnekler yalnızca eğitim setine girer.
    """
    if not path.exists():
        return pd.DataFrame(columns=COLUMNS)
    df = pd.read_csv(path, encoding="utf-8")
    if "synthetic" not in df.columns:
        df["synthetic"] = False
    df["synthetic"] = df["synthetic"].fillna(False).astype(bool)
    df["label"] = df["label"].astype(int)
    df["source"] = "scam_tr:" + df["source"].astype(str)
    df["text"] = df["text"].map(fill_placeholders)
    return df[COLUMNS]


# Anonimleştirme yer tutucuları, gerçek mesajdaki biçime yakın sahte değerlerle doldurulur;
# böylece normalize sonrası aynı token'ları (urltoken, teltoken, num) üretirler.
PLACEHOLDERS = {
    "[LİNK]": "https://ornek-baglanti.com/a1",
    "[TEL]": "0555 000 00 00",
    "[TUTAR]": "1.500",
    "[İSİM]": "",
}


def fill_placeholders(text: str) -> str:
    for placeholder, value in PLACEHOLDERS.items():
        text = text.replace(placeholder, value)
    return text


def deduplicate(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Normalize edilmiş metne göre tekilleştirir.

    Aynı mesajın hem eğitimde hem testte olmasını önler. Aynı normalize metin farklı
    etiketlerle geliyorsa (ör. biri spam biri normal) o grup tamamen atılır.
    """
    df = df.copy()
    df["normalized"] = df["text"].astype(str).map(normalize)
    empty = df["normalized"] == ""
    df = df[~empty]

    label_counts = df.groupby("normalized")["label"].nunique()
    conflicting = set(label_counts[label_counts > 1].index)
    df_conflict_free = df[~df["normalized"].isin(conflicting)]

    # Bir mesajın gerçek kopyası varsa gerçek olanı tut (sentetik değil).
    deduped = df_conflict_free.sort_values("synthetic").drop_duplicates("normalized", keep="first")
    stats = {
        "empty_after_normalize": int(empty.sum()),
        "conflicting_label_groups": len(conflicting),
        "rows_dropped_for_conflict": int(len(df) - len(df_conflict_free)),
        "duplicates_removed": int(len(df_conflict_free) - len(deduped)),
    }
    return deduped.reset_index(drop=True), stats


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """%70 / %15 / %15, etikete göre stratified. Sentetik satırlar her zaman eğitimde."""
    synthetic = df[df["synthetic"]]
    real = df[~df["synthetic"]]
    train, rest = train_test_split(real, test_size=0.30, stratify=real["label"], random_state=RANDOM_STATE)
    val, test = train_test_split(rest, test_size=0.50, stratify=rest["label"], random_state=RANDOM_STATE)
    train = pd.concat([train, synthetic]).sample(frac=1, random_state=RANDOM_STATE)
    return train.reset_index(drop=True), val.reset_index(drop=True), test.reset_index(drop=True)


def load_all() -> pd.DataFrame:
    parts = [part for part in (load_turkish_sms_collection(), load_uysal(), load_scam_tr()) if len(part)]
    df = pd.concat(parts, ignore_index=True)
    df["synthetic"] = df["synthetic"].astype(bool)
    df["label"] = df["label"].astype(int)
    return df


def source_group(source: str) -> str:
    """Rapor için kaynak özeti: scam_tr'nin gerçek mesajları URL yerine tek grup olarak sayılır."""
    if source.startswith("scam_tr:http"):
        return "scam_tr:gercek"
    if source.startswith("scam_tr:sentetik_guvenli"):
        return "scam_tr:sentetik_guvenli"
    if source.startswith("scam_tr:sentetik"):
        return "scam_tr:sentetik"
    return source


def _class_counts(df: pd.DataFrame) -> dict:
    return {"guvenli": int((df["label"] == 0).sum()), "supheli": int((df["label"] == 1).sum())}


def main() -> None:
    raw = load_all()
    deduped, dedup_stats = deduplicate(raw)
    train, val, test = split(deduped)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    for name, part in (("train", train), ("val", val), ("test", test)):
        part.to_csv(PROCESSED_DIR / f"{name}.csv", index=False, encoding="utf-8")

    summary = {
        "raw_rows_by_source": raw["source"].map(source_group).value_counts().to_dict(),
        "raw_class_counts": _class_counts(raw),
        "deduplication": dedup_stats,
        "after_dedup": len(deduped),
        "after_dedup_by_source": deduped["source"].map(source_group).value_counts().to_dict(),
        "test_rows_by_source": test["source"].map(source_group).value_counts().to_dict(),
        "synthetic_rows": int(deduped["synthetic"].sum()),
        "splits": {
            "train": {"rows": len(train), **_class_counts(train)},
            "val": {"rows": len(val), **_class_counts(val)},
            "test": {"rows": len(test), **_class_counts(test)},
        },
    }
    (REPORTS_DIR / "data_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
