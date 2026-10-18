import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { configureNotificationHandler } from '@/features/medications/notifications';
import { NotificationResponder } from '@/features/medications/NotificationResponder';
import { AppDataProvider } from '@/storage/AppDataProvider';
import { colors } from '@/theme';

// Uygulama açıkken gelen ilaç bildirimi de afiş + sesle gösterilsin.
configureNotificationHandler();

export default function RootLayout() {
  return (
    <AppDataProvider>
      <StatusBar style="dark" />
      <NotificationResponder />
      {/* Başlıkları ScreenContainer çiziyor; sistem başlığı ve küçük geri oku kullanılmıyor. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // Kaydırarak geri dönme zorunlu değil; her ekranda büyük butonlar var.
          gestureEnabled: true,
        }}
      >
        {/* Kurulumdan ve ilaç sihirbazından kaydırarak çıkılıp yarım kalmasın. */}
        <Stack.Screen name="kurulum" options={{ gestureEnabled: false }} />
        <Stack.Screen name="ilaclar/duzenle" options={{ gestureEnabled: false }} />
      </Stack>
    </AppDataProvider>
  );
}
