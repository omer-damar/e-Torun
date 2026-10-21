"""Altın test, model düzeyi: kullanıcının gerçek gelen kutusunda v1 (ikili) ve v2 (üç sınıflı) modeller.

Uygulamanın asıl kararı (model + kurallar) `app/__tests__/goldInbox.test.ts` ile ölçülür; burada yalnızca
modellerin kendisi karşılaştırılır. Dosya biçimi `data/inbox_ornek.txt`'de anlatılır, okuma kuralları
`app/test-utils/goldInbox.ts` ile aynıdır. Set yalnızca ölçümdür, eğitimde kullanılmaz.

Çalıştırma: python -m src.gold_inbox
Repoya yalnızca toplu sayılar girer: reports/gold_inbox_model.json.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
INBOX = ML_DIR / "data" / "raw" / "inbox" / "mesajlar.txt"
ARTIFACTS_DIR = ML_DIR / "artifacts"
REPORT = ML_DIR / "reports" / "gold_inbox_model.json"

LABELS = ("normal", "reklam", "dolandiricilik", "emin_degilim")
_TURKISH = str.maketrans("ığşçöüâîû", "igscouaiu")


@dataclass(frozen=True)
class GoldItem:
    index: int
    label: str
    text: str
    tuned: bool


def parse_label(line: str) -> tuple[str, bool] | None:
    """'Dolandırıcılık ayarlandi' → ('dolandiricilik', True); tanınmazsa None."""
    value = re.sub(r"\s+", " ", line.replace("I", "ı").replace("İ", "i").lower().translate(_TURKISH).strip())
    tuned = value.endswith(" ayarlandi")
    if tuned:
        value = value[: -len(" ayarlandi")]
    value = value.replace(" ", "_")
    return (value, tuned) if value in LABELS else None


def parse_inbox(content: str) -> tuple[list[GoldItem], list[str], int]:
    """(mesajlar, hatalar, atlanan tekrar sayısı)."""
    items: list[GoldItem] = []
    errors: list[str] = []
    seen: set[str] = set()
    duplicates = 0
    blocks = re.split(r"^---[ \t]*$", content.replace("\r\n", "\n").replace("\r", "\n"), flags=re.M)
    for i, block in enumerate(blocks, start=1):
        lines = block.split("\n")
        start = 0
        while start < len(lines) and (not lines[start].strip() or lines[start].lstrip().startswith("#")):
            start += 1
        if start == len(lines):
            continue
        parsed = parse_label(lines[start])
        text = "\n".join(lines[start + 1 :]).strip()
        if parsed is None:
            errors.append(f'{i}. blok: etiket tanınmadı: "{lines[start].strip()}"')
            continue
        if not text:
            errors.append(f"{i}. blok: mesaj metni yok")
            continue
        if text in seen:
            duplicates += 1
            continue
        seen.add(text)
        items.append(GoldItem(len(items) + 1, parsed[0], text, parsed[1]))
    return items, errors, duplicates


def _rate(part: int, total: int) -> float | None:
    return round(part / total, 3) if total else None


def model_rates(p_fraud, thresholds: dict) -> dict:
    """Bir mesaj grubunda dolandırıcılık olasılığının eşikleri geçme oranı."""
    n = len(p_fraud)
    return {
        "kirmizi": _rate(int((p_fraud >= thresholds["high"]).sum()), n),
        "sari_veya_kirmizi": _rate(int((p_fraud >= thresholds["low"]).sum()), n),
    }


def main() -> None:
    import joblib
    import numpy as np

    from src.normalize import normalize

    if not INBOX.exists():
        sys.exit(f"Dosya yok: {INBOX} (biçim için data/inbox_ornek.txt)")
    items, errors, duplicates = parse_inbox(INBOX.read_text(encoding="utf-8"))
    if errors:
        sys.exit("Dosyada hata var:\n" + "\n".join(errors))

    v1 = joblib.load(ARTIFACTS_DIR / "model.joblib")
    v2 = joblib.load(ARTIFACTS_DIR / "model_v2.joblib")
    fraud_col = v2["classes"].index("dolandiricilik")

    measured = [it for it in items if not it.tuned and it.label != "emin_degilim"]
    groups: dict[str, dict] = {}
    for label in ("normal", "reklam", "dolandiricilik"):
        texts = [normalize(it.text) for it in measured if it.label == label]
        if not texts:
            groups[label] = {"n": 0}
            continue
        p1 = v1["pipeline"].predict_proba(texts)[:, 1]
        proba2 = v2["pipeline"].predict_proba(texts)
        argmax = np.bincount(proba2.argmax(axis=1), minlength=len(v2["classes"]))
        groups[label] = {
            "n": len(texts),
            "v1": model_rates(p1, v1["thresholds"]),
            "v2": model_rates(proba2[:, fraud_col], v2["thresholds"]),
            "v2_en_olasi_sinif": {c: int(k) for c, k in zip(v2["classes"], argmax)},
        }

    report = {
        "olusturuldu": date.today().isoformat(),
        "kaynak": "data/raw/inbox/mesajlar.txt (repoya girmez)",
        "aciklama": "Yalnızca model; kurallar ve karar katmanı dahil değil (bkz. gold_inbox_app.json).",
        "esikler": {"v1": {k: v1["thresholds"][k] for k in ("low", "high")}, "v2": {k: v2["thresholds"][k] for k in ("low", "high")}},
        "mesaj_sayisi": len(items),
        "olculen": len(measured),
        "ayarlanmis": sum(it.tuned for it in items),
        "emin_degilim": sum(it.label == "emin_degilim" and not it.tuned for it in items),
        "tekrar_atlanan": duplicates,
        "gruplar": groups,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
