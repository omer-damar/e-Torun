"""SMS metni normalizasyonu — docs/PROJE_PLANI.md bölüm 9.2.

app/src/detector/normalize.ts ile BİREBİR aynı çıktıyı vermek zorunda.
Birini değiştirirsen diğerini de değiştir ve parity testini çalıştır.

Python'da `\\d`, `\\s`, `\\w` ve `\\b` Unicode, JS'te ASCII davranır; bu yüzden
burada yalnızca açık karakter sınıfları (`[0-9]`, `[a-z]`, `[ \\t\\n\\r]`) kullanılır.
"""

import re
import unicodedata

# 2. adım: lower()'dan ÖNCE. Python'da 'İ'.lower() iki karakter ('i' + birleşik nokta) üretir.
_DOTTED_I = str.maketrans({"İ": "i", "I": "i", "ı": "i"})

# 4. adım: aksan katlama.
_ACCENT_FOLD = str.maketrans(
    {"ç": "c", "ğ": "g", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u"}
)

_NOT_SPACE = r"[^ \t\n\r]"

# 5. adım: sıra önemli (önce tam URL, sonra www, en son çıplak alan adı).
_URL_PATTERNS = [
    re.compile(r"https?://" + _NOT_SPACE + "+"),
    re.compile(r"www\." + _NOT_SPACE + "+"),
    # Çok seviyeli alan adları da (sahte-banka.com.tr) tek parça yakalanır.
    # Plandaki listeye kısa link uzantıları (bit.ly, t.co, cutt.ly...) eklendi.
    # Alan adından sonra harf/rakam gelmemeli: "ali.trabzon" bir alan adı değil.
    re.compile(
        r"[a-z0-9-]+(?:\.[a-z0-9-]+)*"
        r"\.(?:com|net|org|xyz|top|info|tr|link|site|online|shop|click|live|app"
        r"|ly|co|io|me|gl|cc|biz|vip|pro|club|store)"
        r"(?![a-z0-9-])(?:/" + _NOT_SPACE + "*)?"
    ),
]

# 6. adım: TR IBAN (boşluklu veya bitişik).
_IBAN = re.compile(r"tr[0-9]{2}(?: ?[0-9]{4}){5} ?[0-9]{2}(?![0-9])")

# 7. adım: TR cep telefonu (0555 123 45 67, +905551234567, 5551234567 ...).
_PHONE = re.compile(r"(?:\+?90|0)? ?5[0-9]{2} ?[0-9]{3} ?[0-9]{2} ?[0-9]{2}(?![0-9])")

_DIGITS = re.compile(r"[0-9]+")
_NON_ALNUM = re.compile(r"[^a-z0-9]")
_SPACES = re.compile(r" +")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", text)  # 1
    text = text.translate(_DOTTED_I)  # 2
    text = text.lower()  # 3
    text = text.translate(_ACCENT_FOLD)  # 4
    for pattern in _URL_PATTERNS:  # 5
        text = pattern.sub(" urltoken ", text)
    text = _IBAN.sub(" ibantoken ", text)  # 6
    text = _PHONE.sub(" teltoken ", text)  # 7
    text = _DIGITS.sub(" num ", text)  # 8
    text = _NON_ALNUM.sub(" ", text)  # 9
    return _SPACES.sub(" ", text).strip(" ")  # 10
