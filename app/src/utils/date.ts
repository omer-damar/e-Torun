const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** `Date.getDay()` sırasıyla: 0 = Pazar. */
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/**
 * "18 Ekim Pazar" biçimi. `Intl` yerine sabit tablo kullanılır;
 * Hermes'teki yerel ayar desteğine bağımlı kalmamak için.
 */
export function formatTurkishDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${WEEKDAYS[date.getDay()]}`;
}
