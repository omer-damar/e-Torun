"""Türkçe veri setlerindeki "spam" mesajlarını 3 sınıfa yeniden etiketler — PROJE_PLANI.md bölüm 9.6.

TurkishSMSCollection ve Uysal (2013) "spam"inin büyük çoğunluğu yasal ticari reklamdır (Mersis, RET/İYS
ret yöntemi). Bu betik her spam mesajı için:
  1. Yasal reklam işareti varsa                      → reklam (otomatik)
  2. Bahis/kumar işareti varsa                       → dolandiricilik/bahis adayı (elle incelenir)
  3. Dolandırıcılık işareti varsa (reklam işareti yok) → dolandiricilik adayı (elle incelenir)
  4. Hiçbiri yoksa                                   → reklam (otomatik; örneklemi elle kontrol edilir)
Elle verilen kararlar data/relabel/tr_spam_overrides.csv'den okunur ve otomatik etiketin üstüne yazılır.

Çıktılar:
  data/relabel/tr_spam_labels.csv     anahtar + etiket (metin YOK; repoya girer)
  data/processed/relabel_review.csv   inceleme listesi, metinli (repoya girmez)

Anahtar: normalize edilmiş metnin SHA-1'inin ilk 12 karakteri; ham veri yeniden indirildiğinde de aynıdır.

Çalıştırma: python -m scripts.relabel_tr_spam
"""

import hashlib
import re
import sys
from pathlib import Path

import pandas as pd

from src.load_data import PROCESSED_DIR, load_turkish_sms_collection, load_uysal
from src.normalize import normalize

ML_DIR = Path(__file__).resolve().parent.parent
RELABEL_DIR = ML_DIR / "data" / "relabel"
LABELS_PATH = RELABEL_DIR / "tr_spam_labels.csv"
OVERRIDES_PATH = RELABEL_DIR / "tr_spam_overrides.csv"
REVIEW_PATH = PROCESSED_DIR / "relabel_review.csv"

LABELS = {"reklam", "dolandiricilik", "normal", "atla"}

# Normalize metinde aranır ("num" = rakam, "urltoken" = link).
AD_MARKER = re.compile(
    r"(?:^| )(?:mersis|mn num|sms ret|ret yaz|red yaz|ret num|iys|iptal icin|iptali icin|sms iptal|"
    r"istemiyorsaniz|istemiyorsan|almak istemiyor|almamak icin|cikmak icin|cikis icin|cikis num|"
    r"listeden cik|ucretsiz sms gonder|ret mg|ret sms)"
)
GAMBLING = re.compile(r"(?:^| )(?:bahis|casino|kumar|iddaa|slot|freespin|free spin|rulet|jackpot|deneme bonus)")
# Ham metinde: normalize linkleri "urltoken" yaptığı için "jojobet2.com" gibi adresler orada görünmez.
GAMBLING_RAW = re.compile(
    r"[a-z]*bet[0-9]*\.(?:com|net|org)|para yat[ıi]rma bonus|hos ?geldin bonus|kay[ıi]p bonus|canl[ıi] ma[cç]",
    re.IGNORECASE,
)
FRAUD_CUES = {
    "bloke/askı": r"(?:^| )(?:bloke|askiya|kapatil|kapanacak|iptal edil|kisitlan)",
    "kişisel bilgi": r"(?:^| )(?:sifre|parola|kart bilgi|kart numara|tc kimlik|kimlik numara|cvv|guvenlik kodu)",
    "hukuki tehdit": r"(?:^| )(?:icra|dava|haciz|tebligat|savcilik|mahkeme|avukat|yasal islem)",
    "iban/para": r"(?:^| )(?:ibantoken|havale|eft yap|para gonder|odeme yap|yatirin)",
    "ödül": r"(?:^| )(?:kazandiniz|kazandin|tebrikler|sansli|cekilis|odul)",
    "kargo": r"(?:^| )(?:kargonuz|gonderiniz|teslim edilemedi|adres bilgi)",
    "acele": r"(?:^| )(?:acil|hemen|son gun|son uyari|num saat icinde|derhal)",
    "kazanç": r"(?:^| )(?:milyon|gunluk kazan|evden calis|ek gelir|yatirim firsat|garantili kazanc)",
}
# Tek başına zayıf ipuçları ("tebrikler", "hemen" reklamda da çok geçer): aday için güçlü bir ipucu
# ya da en az iki ipucu gerekir.
STRONG_CUES = {"bloke/askı", "kişisel bilgi", "hukuki tehdit", "iban/para", "kazanç"}


def key_of(normalized: str) -> str:
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]


def classify(normalized: str, raw: str = "") -> tuple[str, str, str]:
    """(otomatik etiket, yöntem, gerekçe)"""
    if AD_MARKER.search(normalized):
        return "reklam", "oto_reklam_isareti", "yasal reklam işareti"
    if GAMBLING.search(normalized) or GAMBLING_RAW.search(raw):
        return "dolandiricilik", "aday_bahis", "bahis/kumar"
    cues = [name for name, pattern in FRAUD_CUES.items() if re.search(pattern, normalized)]
    has_link_or_phone = "urltoken" in normalized or "teltoken" in normalized or " num " in f" {normalized} "
    if (set(cues) & STRONG_CUES) or (len(cues) >= 2 and has_link_or_phone):
        return "reklam", "aday_dolandiricilik", ", ".join(cues)
    return "reklam", "oto_reklam_varsayilan", ""


def load_spam() -> pd.DataFrame:
    df = pd.concat([load_turkish_sms_collection(), load_uysal()], ignore_index=True)
    df = df[df["label"] == 1].copy()
    df["normalized"] = df["text"].astype(str).map(normalize)
    df = df[df["normalized"] != ""].drop_duplicates("normalized")
    df["key"] = df["normalized"].map(key_of)
    return df.reset_index(drop=True)


def load_overrides() -> pd.DataFrame:
    if not OVERRIDES_PATH.exists():
        return pd.DataFrame(columns=["key", "label", "scam_type", "note"])
    df = pd.read_csv(OVERRIDES_PATH, dtype=str, keep_default_na=False)
    bad = df[~df["label"].isin(LABELS)]
    if len(bad):
        raise ValueError(f"tanımsız etiket: {bad[['key', 'label']].to_dict('records')}")
    return df


def main() -> int:
    spam = load_spam()
    auto = [classify(n, t) for n, t in zip(spam["normalized"], spam["text"])]
    spam["label"] = [a[0] for a in auto]
    spam["method"] = [a[1] for a in auto]
    spam["reason"] = [a[2] for a in auto]
    spam["scam_type"] = (spam["method"] == "aday_bahis").map({True: "bahis", False: ""})
    spam["note"] = ""

    overrides = load_overrides()
    unknown = set(overrides["key"]) - set(spam["key"])
    if unknown:
        print(f"Uyarı: veri setinde olmayan {len(unknown)} anahtar: {sorted(unknown)[:5]}")
    ov = overrides.set_index("key")
    hit = spam["key"].isin(ov.index)
    for col in ("label", "scam_type", "note"):
        spam.loc[hit, col] = spam.loc[hit, "key"].map(ov[col])
    spam.loc[hit, "method"] = "elle"

    RELABEL_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    spam[["key", "source", "label", "scam_type", "method", "note"]].sort_values(["source", "key"]).to_csv(
        LABELS_PATH, index=False, encoding="utf-8", lineterminator="\n"
    )
    spam[["key", "source", "method", "label", "reason", "text"]].to_csv(REVIEW_PATH, index=False, encoding="utf-8")

    print(f"{len(spam)} tekil spam mesajı")
    print(spam.groupby(["method", "label"]).size().to_string())
    pending = spam["method"].isin(["aday_dolandiricilik", "aday_bahis"]).sum()
    print(f"Elle incelenmemiş aday: {pending}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
