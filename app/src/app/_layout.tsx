import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppDataProvider } from '@/storage/AppDataProvider';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <AppDataProvider>
      <StatusBar style="dark" />
      {/* Başlıkları ScreenContainer çiziyor; sistem başlığı ve küçük geri oku kullanılmıyor. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // Kaydırarak geri dönme zorunlu değil; her ekranda büyük butonlar var.
          gestureEnabled: true,
        }}
      >
        {/* Kurulumdan kaydırarak geri dönülüp yarım kalmasın. */}
        <Stack.Screen name="kurulum" options={{ gestureEnabled: false }} />
      </Stack>
    </AppDataProvider>
  );
}
