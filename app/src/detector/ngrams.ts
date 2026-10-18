/**
 * sklearn `TfidfVectorizer(analyzer='char_wb')` n-gram üretiminin birebir kopyası
 * (sklearn/feature_extraction/text.py `_char_wb_ngrams`). Bölüm 9.5.
 *
 * Her kelime " w " olarak sarılır ve n = min..max için kaydırılarak n-gram alınır.
 * Kelime n'den kısaysa o kelime için yalnızca bir kez (bütünü) sayılır ve daha büyük
 * n'lere geçilmez (`if offset == 0: break`).
 */
export function charWbNgrams(normalized: string, minN: number, maxN: number): string[] {
  const ngrams: string[] = [];
  for (const word of normalized.split(' ')) {
    if (!word) continue;
    // Uzunluk kod noktasıyla sayılır (emoji/surrogate); normalize sonrası zaten yalnızca [a-z0-9].
    const chars = Array.from(` ${word} `);
    const length = chars.length;
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      ngrams.push(chars.slice(offset, offset + n).join(''));
      while (offset + n < length) {
        offset += 1;
        ngrams.push(chars.slice(offset, offset + n).join(''));
      }
      if (offset === 0) break;
    }
  }
  return ngrams;
}
