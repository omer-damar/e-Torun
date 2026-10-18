import { Redirect, router } from 'expo-router';
import { Linking } from 'react-native';

import { AppText, BigButton, Notice, ScreenContainer } from '@/components';
import { getGreeting, getNextDoseText } from '@/features/home/homeSummary';
import { useNotificationPermission } from '@/features/notifications/permission';
import { useAppData } from '@/storage/AppDataProvider';
import { colors } from '@/theme';
import { formatTurkishDate } from '@/utils/date';

export default function HomeScreen() {
  const { ready, settings } = useAppData();
  const permission = useNotificationPermission();

  // Depo okunana kadar boş: açılış ekranı görünür, yanlışlıkla kuruluma atlanmaz.
  if (!ready) return null;
  if (!settings.onboardingDone) return <Redirect href="/kurulum" />;

  return (
    <ScreenContainer
      title={getGreeting(settings.userName)}
      showHomeButton={false}
      headerRight={
        <BigButton
          icon="⚙️"
          title="Ayarlar"
          variant="neutral"
          onPress={() => router.push('/ayarlar')}
          accessibilityHint="Ayarlar ekranını açar"
          testID="settings-button"
        />
      }
    >
      <AppText variant="bodyBold" color={colors.textSecondary}>
        {formatTurkishDate(new Date())}
      </AppText>

      {permission === 'denied' ? (
        <Notice title="Bildirimler kapalı" message="İlaç saatlerinde size haber veremiyoruz.">
          <BigButton
            title="Ayarları aç"
            variant="neutral"
            onPress={() => Linking.openSettings()}
            accessibilityHint="Telefonun ayarlarında bu uygulamanın bildirim iznini açabilirsiniz"
          />
        </Notice>
      ) : null}

      <BigButton
        icon="💊"
        title="İlaçlarım"
        // İlaç modülü Aşama 4'te gelene kadar kayıtlı ilaç yok.
        subtitle={getNextDoseText(null)}
        onPress={() => router.push('/ilaclar')}
        accessibilityHint="Bugünkü ilaçlarınızı gösterir"
      />
      <BigButton
        icon="📞"
        title="Acil Yardım"
        subtitle="Yakınınızı veya 112'yi arayın"
        variant="danger"
        onPress={() => router.push('/acil')}
        accessibilityHint="Acil arama ekranını açar"
      />
      <BigButton
        icon="✉️"
        title="Mesajı Kontrol Et"
        subtitle="Şüpheli mesajı kontrol edin"
        onPress={() => router.push('/mesaj')}
        accessibilityHint="Mesaj kontrol ekranını açar"
      />
    </ScreenContainer>
  );
}
