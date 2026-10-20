"""Çevrilmiş / yerelleştirilmiş mesajların son kontrolü — PROJE_PLANI.md bölüm 9.6.

Çalıştırma: python -m src.translation_check   (data/translated/*.csv dosyalarının hepsini denetler)

Çeviri dosyası şeması (data/translated/batch_XXX.csv):
  queue_id   : kuyruk kimliği (data/raw/foreign/translation_queue.csv) — orijinal metin saklanmaz
  label      : normal | reklam | dolandiricilik | atla   ("atla": çeviriye / Türk bağlamına uygun değil)
  scam_type  : dolandırıcılık türü (label = dolandiricilik ise zorunlu)
  text_tr    : Türkçe, Türkiye'ye yerelleştirilmiş metin ("atla" ise boş)
  note       : kısa açıklama (isteğe bağlı)
"""

import re
import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

ML_DIR = Path(__file__).resolve().parent.parent
TRANSLATED_DIR = ML_DIR / "data" / "translated"

LABELS = {"normal", "reklam", "dolandiricilik", "atla"}
SCAM_TYPES = {
    "kargo",
    "banka_hesap",
    "edevlet_vergi",
    "icra_dava",
    "odul",
    "yatirim",
    "kredi",
    "is_ilani",
    "yakin_romantik",
    "bahis",
    "abonelik_fatura",
    "diger",
}

# Yerelleştirmeden kaçan izler.
FOREIGN_CURRENCY = re.compile(r"[£$€]|\b(?:usd|gbp|eur|dollars?|pounds?|cents?|pence)\b", re.IGNORECASE)
# Alan adı parçaları (".us", "chase-x.com") sayılmaz: gerçek dolandırıcılar yabancı uzantı kullanır.
FOREIGN_TERMS = re.compile(
    r"(?<![.\w/-])(?:uk|usa|us|postcode|zip ?code|txt|txting|reply stop|click here|usps|irs|hmrc|royal mail|ssn|"
    r"social security|walmart|costco|wells fargo|bank of america|chase|t-mobile|verizon|at&t|dmv|dvla)(?![\w.-])",
    re.IGNORECASE,
)
ENGLISH_WORDS = re.compile(
    r"\b(?:the|you|your|and|please|account|click|here|now|has|been|have|will|with|for|this|that|from|our|we|"
    r"could|not|be|update|package|delivered|is|are|to|of)\b",
    re.IGNORECASE,
)
# Büyük/küçük harf duyarlı: IGNORECASE ile 'İ' sıradan 'i'ye de eşleşirdi.
TURKISH_CHARS = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
TURKISH_WORDS = re.compile(
    # Karaktersiz yazılmış Türkçe SMS'ler de tanınsın diye ASCII biçimleri de var.
    r"\b(?:ve|bir|için|icin|ile|bu|hesap|hesabi|hesabınız|hesabiniz|hesabina|lütfen|lutfen|tıklayın|tiklayin|"
    r"sayın|sayin|değerli|degerli|kazandınız|kazandiniz|gönderiniz|gonderiniz|kargonuz|hemen|arayin|arayiniz|"
    r"kilitlendi|kartiniz|kartınız|banka|adresini|ziyaret|edin|olarak|icinde|uzere|sonra|gun|saat|mesaj|konu|"
    r"gonderen|teslim|odeme|ödeme|bilgi|tebrikler|ucretsiz|kazanin|basvurun|yanitlayin)\b",
    re.IGNORECASE,
)
# Rakam dizileri: 7+ haneli olanlar telefon sayılır ve TR biçiminde olmalı.
DIGIT_RUN = re.compile(r"\+?[0-9][0-9 ()-]{6,}[0-9]")
TR_PHONE = re.compile(r"^(?:\+?90|0)?\s*(?:5[0-9]{2}|850|8[0-9]{2}|900|444|2[0-9]{2}|3[0-9]{2}|4[0-9]{2})[ 0-9()-]*$")


@dataclass
class Issue:
    file: str
    queue_id: str
    problem: str


def check_row(row: dict) -> list[str]:
    problems: list[str] = []
    label = str(row.get("label", "")).strip()
    text = str(row.get("text_tr", "") if pd.notna(row.get("text_tr")) else "").strip()
    scam_type = str(row.get("scam_type", "") if pd.notna(row.get("scam_type")) else "").strip()

    if label not in LABELS:
        problems.append(f"geçersiz etiket: {label!r}")
        return problems
    if label == "atla":
        if text:
            problems.append("'atla' satırında metin olmamalı")
        return problems
    if len(text) < 15:
        problems.append("metin çok kısa")
    if label == "dolandiricilik" and scam_type not in SCAM_TYPES:
        problems.append(f"geçersiz dolandırıcılık türü: {scam_type!r}")
    if label != "dolandiricilik" and scam_type:
        problems.append("dolandırıcılık olmayan satırda tür var")

    if m := FOREIGN_CURRENCY.search(text):
        problems.append(f"yabancı para birimi: {m.group(0)!r}")
    if m := FOREIGN_TERMS.search(text):
        problems.append(f"yerelleştirilmemiş terim: {m.group(0)!r}")
    english = ENGLISH_WORDS.findall(text)
    if len(english) >= 3:
        problems.append(f"İngilizce kalıntı: {', '.join(sorted(set(w.lower() for w in english)))}")
    if not (TURKISH_CHARS.search(text) or TURKISH_WORDS.search(text)):
        problems.append("Türkçe olduğu anlaşılmıyor")
    for run in DIGIT_RUN.findall(text):
        digits = re.sub(r"[^0-9]", "", run)
        # IBAN, sipariş/kargo numarası gibi uzun rakamlar telefon değildir.
        if 10 <= len(digits) <= 12 and not TR_PHONE.match(run.strip()):
            problems.append(f"TR dışı telefon biçimi: {run.strip()!r}")
    return problems


def check_files(paths: list[Path]) -> tuple[pd.DataFrame, list[Issue]]:
    issues: list[Issue] = []
    frames = []
    for path in paths:
        df = pd.read_csv(path, encoding="utf-8", dtype=str, keep_default_na=False)
        missing = {"queue_id", "label", "scam_type", "text_tr"} - set(df.columns)
        if missing:
            issues.append(Issue(path.name, "-", f"eksik kolon: {sorted(missing)}"))
            continue
        for row in df.to_dict("records"):
            issues += [Issue(path.name, row["queue_id"], p) for p in check_row(row)]
        frames.append(df.assign(file=path.name))
    combined = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if len(combined):
        dup_ids = combined[combined.duplicated("queue_id", keep=False)]
        issues += [Issue(r.file, r.queue_id, "aynı kuyruk kimliği birden fazla kez") for r in dup_ids.itertuples()]
        texts = combined[combined["label"] != "atla"]
        dup_text = texts[texts.duplicated("text_tr", keep="first")]
        issues += [Issue(r.file, r.queue_id, "aynı Türkçe metin zaten var") for r in dup_text.itertuples()]
    return combined, issues


def main() -> int:
    paths = sorted(TRANSLATED_DIR.glob("batch_*.csv"))
    combined, issues = check_files(paths)
    print(f"{len(paths)} dosya, {len(combined)} satır")
    if len(combined):
        print(combined["label"].value_counts().to_string())
    for issue in issues:
        print(f"  ✗ {issue.file} {issue.queue_id}: {issue.problem}")
    print("Sorun yok." if not issues else f"{len(issues)} sorun.")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
