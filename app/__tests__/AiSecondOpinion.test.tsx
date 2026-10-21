import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AiSecondOpinion } from '@/components/AiSecondOpinion';
import type { AiResult } from '@/features/messages/aiOpinion';

import { auditTree } from '../test-utils/a11yAudit';

// Erişilebilirlik denetimi en kötü durumda (sistem yazı ölçeği 1) ölçer.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

/** Cevabı testin istediği anda veren sahte istek. */
function deferredAsk() {
  let resolve!: (r: AiResult) => void;
  const ask = jest.fn(() => new Promise<AiResult>((r) => (resolve = r)));
  return { ask, answer: (r: AiResult) => act(async () => resolve(r)) };
}

beforeEach(() => announced.mockClear());

describe('Yapay zekâya da sor', () => {
  it('basılmadan hiçbir şey gönderilmez; buton gönderileceğini açıkça söyler', async () => {
    const { ask } = deferredAsk();
    await render(<AiSecondOpinion message="Örnek mesaj metni" localLevel="red" ask={ask} />);
    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Yapay zekâya da sor\. Mesaj internete gönderilir/ })).toBeTruthy();
  });

  it('görüşler çelişirse telefondaki uyarı geçerli kalır ve bu söylenir', async () => {
    const { ask, answer } = deferredAsk();
    await render(<AiSecondOpinion message="Örnek mesaj metni" localLevel="red" ask={ask} />);
    await fireEvent.press(screen.getByTestId('ask-ai'));
    expect(screen.getByText(/Yapay zekâya soruluyor/)).toBeTruthy();
    expect(announced).toHaveBeenCalledWith('Yapay zekâya soruluyor.');

    await answer({ status: 'ok', verdict: { level: 'green', reasons: ['Kişisel bir mesaj gibi.'], advice: 'Sorun görünmüyor.' } });
    expect(screen.getByTestId('ai-green')).toBeTruthy();
    expect(screen.getByText('Kişisel bir mesaj gibi.', { exact: false })).toBeTruthy();
    expect(screen.getByText(/Telefondaki uyarı geçerli/)).toBeTruthy();
    expect(announced).toHaveBeenLastCalledWith(expect.stringContaining('Yapay zekânın görüşü: Belirgin risk yok'));
  });

  it('yapay zekâ daha temkinliyse ayrıca uyarır; kart erişilebilirlik kurallarına uyar', async () => {
    const { ask, answer } = deferredAsk();
    await render(<AiSecondOpinion message="Örnek mesaj metni" localLevel="green" ask={ask} />);
    expect(auditTree(screen.toJSON() as never).violations.filter((v) => !v.includes('başlık'))).toEqual([]);
    await fireEvent.press(screen.getByTestId('ask-ai'));
    await answer({ status: 'ok', verdict: { level: 'red', reasons: ['Sahte bağlantı.'], advice: 'Tıklamayın.' } });
    expect(screen.getByText(/Yapay zekâ bu mesajı şüpheli buldu/)).toBeTruthy();
    expect(auditTree(screen.toJSON() as never).violations).toEqual([]);
  });

  it('ulaşılamazsa kalıcı uyarı ve Tekrar dene', async () => {
    const { ask, answer } = deferredAsk();
    await render(<AiSecondOpinion message="Örnek mesaj metni" localLevel="yellow" ask={ask} />);
    await fireEvent.press(screen.getByTestId('ask-ai'));
    await answer({ status: 'unavailable' });
    expect(screen.getByText(/Yapay zekâya şu an ulaşılamadı/)).toBeTruthy();
    expect(announced).toHaveBeenCalledWith(expect.stringContaining('Yapay zekâya şu an ulaşılamadı'));

    await fireEvent.press(screen.getByTestId('ask-ai-retry'));
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
