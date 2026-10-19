import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import {
  INTRO_ACCESSIBILITY_LABEL,
  INTRO_DURATION_MS,
  INTRO_MAX_MS,
  IntroOverlay,
  resetIntroForTests,
} from '@/components/IntroOverlay';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(async () => {}), preventAutoHideAsync: jest.fn(async () => {}) }));

beforeEach(() => {
  resetIntroForTests();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => jest.useRealTimers());

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('Karşılama ekranı', () => {
  it('görsel yüklenince yerel açılış ekranını kaldırır ve 2,5 sn sonra kapanır', async () => {
    await render(<IntroOverlay />);
    const intro = screen.getByTestId('intro');
    expect(screen.getByLabelText(INTRO_ACCESSIBILITY_LABEL)).toBeTruthy();

    await fireEvent(screen.getByTestId('intro-image'), 'loadEnd');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(intro).toBeTruthy();

    await advance(INTRO_DURATION_MS + 400); // gösterim + solma
    expect(screen.queryByTestId('intro')).toBeNull();
  });

  it('dokununca beklemeden geçer', async () => {
    await render(<IntroOverlay />);
    await fireEvent.press(screen.getByLabelText(INTRO_ACCESSIBILITY_LABEL));
    await advance(400);
    expect(screen.queryByTestId('intro')).toBeNull();
  });

  it('görsel yüklenmese de en geç 5 sn sonra kapanır', async () => {
    await render(<IntroOverlay />);
    await advance(INTRO_MAX_MS + 400);
    expect(screen.queryByTestId('intro')).toBeNull();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('aynı açılışta ikinci kez gösterilmez', async () => {
    const first = await render(<IntroOverlay />);
    await fireEvent.press(screen.getByLabelText(INTRO_ACCESSIBILITY_LABEL));
    await advance(400);
    await first.unmount();

    await render(<IntroOverlay />);
    expect(screen.queryByTestId('intro')).toBeNull();
  });
});
