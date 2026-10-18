import { router } from 'expo-router';

import { AppText, BigButton, ScreenContainer } from '@/components';
import { getGreeting, getNextDoseText, MOCK_HOME_DATA } from '@/features/home/homeSummary';
import { colors } from '@/theme';
import { formatTurkishDate } from '@/utils/date';

export default function HomeScreen() {
  const { userName, nextDose } = MOCK_HOME_DATA;

  return (
    <ScreenContainer
      title={getGreeting(userName)}
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

      <BigButton
        icon="💊"
        title="İlaçlarım"
        subtitle={getNextDoseText(nextDose)}
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
