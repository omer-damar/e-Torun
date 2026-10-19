import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet } from 'react-native';

/** Karşılama görselinin gösterim süresi; dokununca beklemeden geçilir. */
export const INTRO_DURATION_MS = 2500;
/** Görsel yüklenmezse en geç bu sürede kapanır (kullanıcı hiçbir zaman takılı kalmasın). */
export const INTRO_MAX_MS = 5000;
/** Görselin kenar mavisi: farklı ekran oranlarında kalan boşluk fark edilmesin. */
export const INTRO_BACKGROUND = '#0F4C8A';

const FADE_MS = 300;

/** Görseldeki yazılar ekran okuyucuya ayrıca verilir (resmin içindeki yazıyı VoiceOver göremez). */
export const INTRO_ACCESSIBILITY_LABEL =
  'e-Torun. Dijital torununuz, hep yanınızda. İnternetsiz çalışır, verileriniz güvendedir. Manisa CBÜ Sosyal Sorumluluk Projesi.';

// Uygulama her açıldığında bir kez; ekranlar arası gezinmede tekrar gösterilmez.
let shownThisLaunch = false;

/** Testler için. */
export function resetIntroForTests() {
  shownThisLaunch = false;
}

/**
 * Açılışta ~2,5 sn görünen tam ekran karşılama görseli (Expo Go'da da çalışır; yerel açılış
 * ekranı tam ekran resmi farklı iPhone boylarında düzgün göstermiyor). Görsel kırpılmadan
 * sığdırılır ("contain"), kalan boşluk görselin kendi mavisiyle dolar.
 */
export function IntroOverlay() {
  const [visible, setVisible] = useState(!shownThisLaunch);
  const opacity = useRef(new Animated.Value(1)).current;
  const finishing = useRef(false);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    shownThisLaunch = true;
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setVisible(false));
  }, [opacity]);

  const startTimer = useCallback(() => {
    // Görsel çizildi: yerel açılış ekranını kaldır, gösterim süresini başlat.
    SplashScreen.hideAsync().catch(() => {});
    setTimeout(finish, INTRO_DURATION_MS);
  }, [finish]);

  useEffect(() => {
    if (!visible) return;
    const fallback = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      finish();
    }, INTRO_MAX_MS);
    return () => clearTimeout(fallback);
  }, [visible, finish]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} testID="intro">
      <StatusBar style="light" />
      <Pressable
        style={styles.fill}
        onPress={finish}
        accessible
        accessibilityRole="button"
        accessibilityLabel={INTRO_ACCESSIBILITY_LABEL}
        accessibilityHint="Uygulamaya geçmek için dokunun"
      >
        <Image
          source={require('../../assets/images/intro.jpg')}
          style={styles.fill}
          resizeMode="contain"
          onLoadEnd={startTimer}
          testID="intro-image"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: INTRO_BACKGROUND,
    zIndex: 100,
  },
  fill: {
    flex: 1,
    width: '100%',
  },
});
