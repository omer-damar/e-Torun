/**
 * Ekran erişilebilirlik denetimi — docs/PROJE_PLANI.md bölüm 10. Testlerde render edilen ekranın
 * ağacını dolaşır ve kurallara uymayan öğeleri listeler (boş liste = sorun yok).
 *
 * Kurallar:
 * - Metin en az 20pt (yalnızca emoji/simge içeren metinler hariç).
 * - Metin ile arkasındaki zemin arasında en az 7:1 kontrast.
 * - Basılabilir her öğede "buton" rolü ve okunabilir bir ad (etiket ya da içindeki yazı).
 * - Basılabilir öğe en az 64pt yüksekliğinde (açık yükseklik verilmişse).
 * - Ekranda en az bir başlık (`accessibilityRole="header"`).
 */
import { StyleSheet } from 'react-native';

import { contrastRatio } from '../src/theme/contrast';

type JsonNode = { type: string; props: Record<string, unknown>; children: (JsonNode | string)[] | null };

export const MIN_FONT_SIZE = 20;
export const MIN_CONTRAST = 7;
export const MIN_TOUCH = 64;
const DEFAULT_BACKGROUND = '#FFFFFF';
/** Harf ya da rakam yoksa (emoji, ok, madde işareti) yazı boyutu/kontrast kuralı uygulanmaz. */
const HAS_WORD = /[\p{L}\p{N}]/u;

export type TextInfo = { text: string; fontSize?: number; color?: string; background: string };

export type AuditReport = {
  violations: string[];
  texts: TextInfo[];
  headers: number;
};

function textOf(node: JsonNode | string): string {
  if (typeof node === 'string') return node;
  return (node.children ?? []).map(textOf).join('');
}

function isPressable(props: Record<string, unknown>): boolean {
  return typeof props.onClick === 'function' || typeof props.onResponderRelease === 'function';
}

function short(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 50 ? `${t.slice(0, 50)}…` : t;
}

export function auditTree(tree: JsonNode | JsonNode[] | null): AuditReport {
  const report: AuditReport = { violations: [], texts: [], headers: 0 };

  const visit = (node: JsonNode | string, background: string, hidden: boolean) => {
    if (typeof node === 'string') return;
    const props = node.props ?? {};
    const style = (StyleSheet.flatten(props.style as never) ?? {}) as Record<string, unknown>;
    const ownBackground = typeof style.backgroundColor === 'string' ? style.backgroundColor : undefined;
    const bg = ownBackground && ownBackground !== 'transparent' ? ownBackground : background;
    const isHidden =
      hidden || props.accessibilityElementsHidden === true || props.importantForAccessibility === 'no-hide-descendants';

    if (props.accessibilityRole === 'header') report.headers += 1;

    if (node.type === 'Text') {
      const text = textOf(node);
      if (text.trim() && HAS_WORD.test(text)) {
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : undefined;
        const color = typeof style.color === 'string' ? style.color : undefined;
        report.texts.push({ text, fontSize, color, background: bg });
        if (fontSize === undefined || fontSize < MIN_FONT_SIZE) {
          report.violations.push(`yazı ${fontSize ?? '?'}pt < ${MIN_FONT_SIZE}: "${short(text)}"`);
        }
        const ratio = color ? contrastRatio(color, bg) : null;
        if (ratio !== null && ratio < MIN_CONTRAST) {
          report.violations.push(`kontrast ${ratio.toFixed(1)}:1 (${color} / ${bg}): "${short(text)}"`);
        }
      }
      return; // İç içe Text'ler üst metnin parçası.
    }

    if (node.type === 'TextInput') {
      const label = typeof props.accessibilityLabel === 'string' ? props.accessibilityLabel.trim() : '';
      if (!label) report.violations.push('yazı kutusunun etiketi yok');
      if (typeof style.fontSize !== 'number' || style.fontSize < MIN_FONT_SIZE) {
        report.violations.push(`yazı kutusu ${String(style.fontSize ?? '?')}pt < ${MIN_FONT_SIZE}: "${label}"`);
      }
    }

    if (isPressable(props) && !isHidden) {
      const name = (typeof props.accessibilityLabel === 'string' && props.accessibilityLabel.trim()) || textOf(node).trim();
      const role = props.accessibilityRole;
      if (!role) report.violations.push(`basılabilir öğede rol yok: "${short(name)}"`);
      if (!name) report.violations.push('basılabilir öğenin okunabilir adı yok');
      const height = (style.minHeight ?? style.height) as number | undefined;
      if (typeof height === 'number' && height < MIN_TOUCH) {
        report.violations.push(`dokunma alanı ${height}pt < ${MIN_TOUCH}: "${short(name)}"`);
      }
      if (height === undefined && role !== 'radio' && role !== 'checkbox') {
        report.violations.push(`dokunma alanında en az yükseklik tanımlı değil: "${short(name)}"`);
      }
    }

    for (const child of node.children ?? []) visit(child, bg, isHidden);
  };

  const roots = Array.isArray(tree) ? tree : tree ? [tree] : [];
  for (const root of roots) visit(root, DEFAULT_BACKGROUND, false);
  if (report.headers === 0) report.violations.push('ekranda başlık (accessibilityRole="header") yok');
  return report;
}
