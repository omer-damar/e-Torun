"""Yabancı veri setlerinden çeviri kuyruğunu hazırlar — PROJE_PLANI.md bölüm 9.6.

Çalıştırma: python -m scripts.prepare_translation_queue
Girdi : data/raw/foreign/{smishtank,mendeley_smishing,uci_sms_spam}/  (repoya girmez)
Çıktı : data/raw/foreign/translation_queue.csv                          (repoya girmez)

Kuyrukta yalnızca çevrilecek mesajlar var: SmishTank (hepsi), Mendeley smishing + spam,
UCI'de olup Mendeley'de olmayan spam. Normal (ham) mesajlar çevrilmez (Türkçe normal
mesajımız yeterli; İngilizce sohbet argosu çeviriye uygun değil). Metin tekrarları atılır.

Kimlik (queue_id) kararlıdır: kaynak + kaynaktaki satır numarası. Çeviri dosyaları
(data/translated/) orijinal metni değil yalnızca bu kimliği saklar (gizlilik: orijinalde
gerçek numara ve canlı oltalama linkleri var).
"""

import re
from pathlib import Path

import pandas as pd

ML_DIR = Path(__file__).resolve().parent.parent
FOREIGN = ML_DIR / "data" / "raw" / "foreign"
OUT = FOREIGN / "translation_queue.csv"

# SmishTank "Message Categories" → bizim dolandırıcılık türlerimiz (bölüm 9.6).
SMISHTANK_TYPE = {
    "Account Alert": "banka_hesap",
    "Delivery": "kargo",
    "Prize/Contest": "odul",
    "Finance/Crypto": "yatirim",
    "Lawsuits/Settlements": "icra_dava",
    "Loans/Credit": "kredi",
    "Job Advertisement": "is_ilani",
    "Wrong Number/Romance Scam": "yakin_romantik",
    "Advertisement": "reklam_supheli",
    "Other": "diger",
}


def _key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(text).lower()).strip()


def load_smishtank() -> pd.DataFrame:
    df = pd.read_csv(FOREIGN / "smishtank" / "analysisdataset.csv", encoding_errors="replace")
    text = df["MainText"].where(df["MainText"].notna() & (df["MainText"].astype(str).str.strip() != ""), df["Fulltext"])
    return pd.DataFrame(
        {
            "queue_id": "smishtank:" + df["messageid"].astype(str),
            "source": "smishtank",
            "license": "CC BY-NC-SA 4.0",
            "src_label": "smishing",
            "src_category": df["Message Categories"].fillna("Other"),
            "hint_type": df["Message Categories"].map(SMISHTANK_TYPE).fillna("diger"),
            "brand": df["Brand"].fillna(""),
            "text": text.astype(str).str.strip(),
        }
    )


def load_mendeley() -> pd.DataFrame:
    df = pd.read_csv(FOREIGN / "mendeley_smishing" / "Dataset_5971.csv", encoding_errors="replace")
    df["label"] = df["LABEL"].str.strip().str.lower()
    df = df[df["label"].isin(["smishing", "spam"])]
    return pd.DataFrame(
        {
            "queue_id": "mendeley:" + df.index.astype(str),
            "source": "mendeley",
            "license": "CC BY 4.0",
            "src_label": df["label"],
            "src_category": "",
            "hint_type": "",
            "brand": "",
            "text": df["TEXT"].astype(str).str.strip(),
        }
    )


def load_uci_extra(mendeley_keys: set[str]) -> pd.DataFrame:
    df = pd.read_csv(
        FOREIGN / "uci_sms_spam" / "SMSSpamCollection", sep="\t", header=None, names=["label", "text"], quoting=3
    )
    df = df[(df["label"] == "spam") & ~df["text"].map(_key).isin(mendeley_keys)]
    return pd.DataFrame(
        {
            "queue_id": "uci:" + df.index.astype(str),
            "source": "uci",
            "license": "CC BY 4.0",
            "src_label": "spam",
            "src_category": "",
            "hint_type": "",
            "brand": "",
            "text": df["text"].astype(str).str.strip(),
        }
    )


def build_queue() -> pd.DataFrame:
    smishtank = load_smishtank()
    mendeley = load_mendeley()
    all_mendeley = pd.read_csv(FOREIGN / "mendeley_smishing" / "Dataset_5971.csv", encoding_errors="replace")
    uci = load_uci_extra(set(all_mendeley["TEXT"].map(_key)))
    queue = pd.concat([smishtank, mendeley, uci], ignore_index=True)
    queue = queue[queue["text"].str.len() >= 15]
    queue["key"] = queue["text"].map(_key)
    queue = queue.drop_duplicates("key").drop(columns="key").reset_index(drop=True)
    return queue


def main() -> None:
    queue = build_queue()
    queue.to_csv(OUT, index=False, encoding="utf-8")
    print(f"{OUT.name}: {len(queue)} mesaj")
    print(queue.groupby(["source", "src_label"]).size().to_string())


if __name__ == "__main__":
    main()
