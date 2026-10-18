import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { BigButton } from './BigButton';

type Props = {
  title: string;
  children: ReactNode;
  /** Ana ekranın kendisinde gizlenir; diğer her ekranda zorunlu. */
  showHomeButton?: boolean;
  /** Başlık satırının sağına yerleşen öğe (ör. Ayarlar butonu). */
  headerRight?: ReactNode;
};

export function goHome() {
  // Yığında ana ekran varsa ona kadar geri dön, yoksa ana ekranı yerine koy.
  if (router.canDismiss()) {
    router.dismissTo('/');
  } else {
    router.replace('/');
  }
}

/**
 * Her ekranın ortak çerçevesi: güvenli alan + büyük başlık + içerik + altta büyük "Ana Sayfa" butonu.
 * İçerik kaydırılabilir, böylece çok büyük yazıda taşma olmaz; ancak Ana Sayfa butonu her zaman görünür.
 */
export function ScreenContainer({ title, children, showHomeButton = true, headerRight }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {headerRight}
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {showHomeButton ? (
        <View style={styles.footer}>
          <BigButton
            title="Ana Sayfa"
            icon="🏠"
            variant="neutral"
            onPress={goHome}
            accessibilityHint="Ana ekrana döner"
            testID="home-button"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.md,
    gap: spacing.buttonGap,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutralBackground,
  },
});
