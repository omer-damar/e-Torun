/** D6 — "Yakınıma sor": şüpheli mesajı yakına danışmak için hazır SMS metni. */
import { spokenText } from '@/utils/a11y';

/** Çok uzun mesajlar SMS'te parçalanmasın; yakın için ilk kısım yeterli. */
export const MAX_QUOTED_LENGTH = 500;

export function buildAskRelativeSms(params: { contactName: string; userName: string; message: string }): string {
  const greeting = params.contactName.trim() ? `Merhaba ${params.contactName.trim()}` : 'Merhaba';
  const me = params.userName.trim() ? `, ben ${params.userName.trim()}.` : '.';
  const chars = Array.from(params.message.trim());
  const quoted = chars.length > MAX_QUOTED_LENGTH ? `${chars.slice(0, MAX_QUOTED_LENGTH).join('')}…` : chars.join('');
  return `${greeting}${me} Bana şu mesaj geldi, dolandırıcılık olabilir mi? Bir bakar mısın?\n\n"${quoted}"`;
}

/** Sesli okuma için: emoji ve süs karakterleri okunmasın. */
export function speechText(parts: string[]): string {
  return spokenText(parts.join(' '));
}
