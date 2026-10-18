import { Redirect, router } from 'expo-router';
import { Linking } from 'react-native';

import { AppText, BigButton, Notice, ScreenContainer } from '@/components';
import { getGreeting, getNextDoseText } from '@/features/home/homeSummary';
import { getNextDose } from '@/features/medications/schedule';
import { useNow } from '@/features/medications/useNow';
import { useNotificationPermission } from '@/features/notifications/permission';
import { useAppData } from '@/storage/AppDataProvider';
import { colors } from '@/theme';
import { formatTurkishDate } from '@/utils/date';

export default function HomeScreen() {
  const { ready, settings, medications, doseLog } = useAppData();
  const permission = useNotificationPermission();
  const now = useNow();

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
        {formatTurkishDate(now)}
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
        subtitle={medications.length === 0 ? 'İlaç ekleyin' : getNextDoseText(getNextDose(medications, doseLog, now))}
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
