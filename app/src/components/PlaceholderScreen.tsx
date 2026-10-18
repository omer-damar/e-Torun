import { AppText } from './AppText';
import { ScreenContainer } from './ScreenContainer';

/** Henüz yapılmamış modüller için geçici ekran. */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <ScreenContainer title={title}>
      <AppText>Bu bölüm yakında eklenecek.</AppText>
    </ScreenContainer>
  );
}
