import { createContext, useContext } from 'react';

import type { FontScale } from './typography';

/** Ayarlardaki "Büyük / Çok büyük" tercihi. Sağlayıcı yoksa (ör. testler) "Büyük". */
export const FontScaleContext = createContext<FontScale>('buyuk');

export function useFontScale(): FontScale {
  return useContext(FontScaleContext);
}
