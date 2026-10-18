"""TF-IDF öznitelik ayarları — bölüm 9.3.

Bu ayarlar app/src/detector/{ngrams,tfidf}.ts tarafında birebir yeniden uygulanır;
değiştirirsen TS tarafını ve parity testini de güncelle.
"""

from sklearn.feature_extraction.text import TfidfVectorizer

NGRAM_RANGE = (3, 5)


def make_vectorizer() -> TfidfVectorizer:
    # Metin önceden normalize edilmiş olarak verilir (yalnızca [a-z0-9 ]), bu yüzden
    # lowercase=False; char_wb: her kelime " w " olarak sarılır, n-gramlar kelime içinde kalır.
    return TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=NGRAM_RANGE,
        min_df=2,
        max_features=20000,
        sublinear_tf=True,
        lowercase=False,
    )
