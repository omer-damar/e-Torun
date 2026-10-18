import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, AppTextInput, BigButton, ConfirmDialog, Notice, ScreenContainer } from '@/components';
import { addUnits, describeDaysLeft, formatUnits, getRefillStatus, parseUnits } from '@/features/medications/stock';
import { useAppData } from '@/storage/AppDataProvider';
import { borderWidth, colors, radius, spacing } from '@/theme';

/** B6 — İlaç stoğu: "Yeni kutu aldım", sayıyı düzelt, takibi başlat / kapat. */
export default function MedicationStockScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, settings, setStock } = useAppData();
  const med = medications.find((m) => m.id === id);

  const [boxUnits, setBoxUnits] = useState('');
  const [exactUnits, setExactUnits] = useState('');
  const [perDose, setPerDose] = useState('1');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  if (!med) {
    return (
      <ScreenContainer title="İlaç stoğu">
        <AppText>İlaç bulunamadı.</AppText>
      </ScreenContainer>
    );
  }

  const now = new Date();
  const status = getRefillStatus(med, settings.refillWarningDays);

  const addBox = async () => {
    const units = parseUnits(boxUnits);
    if (!med.stock || units === null || units <= 0) {
      setError('Kutudaki sayıyı rakamla yazın. Örnek: 28');
      return;
    }
    const stock = addUnits(med.stock, units, new Date());
    await setStock(med.id, stock);
    setBoxUnits('');
    setError(null);
    setMessage(`${formatUnits(units)} eklendi. Şimdi elinizde ${formatUnits(stock.remainingUnits)} var.`);
  };

  const fixCount = async () => {
    const units = parseUnits(exactUnits);
    if (units === null) {
      setError('Elinizdeki sayıyı rakamla yazın. Örnek: 12');
      return;
    }
    if (med.stock) {
      await setStock(med.id, { ...med.stock, remainingUnits: units, updatedAt: new Date().toISOString() });
    } else {
      const unitsPerDose = parseUnits(perDose);
      if (unitsPerDose === null || unitsPerDose <= 0) {
        setError('Her seferinde kaç tane aldığınızı yazın. Örnek: 1');
        return;
      }
      await setStock(med.id, { unitsPerDose, remainingUnits: units, updatedAt: new Date().toISOString() });
    }
    setExactUnits('');
    setError(null);
    setMessage(`Kaydedildi. Elinizde ${formatUnits(units)} var.`);
  };

  return (
    <ScreenContainer title={`${med.name} stoğu`}>
      {med.stock ? (
        <View style={styles.box}>
          <AppText variant="button">Elinizde: {formatUnits(med.stock.remainingUnits)}</AppText>
          <AppText>Her seferinde {formatUnits(med.stock.unitsPerDose)} alıyorsunuz.</AppText>
          <AppText variant="bodyBold">{describeDaysLeft(med, now)}</AppText>
        </View>
      ) : (
        <AppText>Bu ilaç için stok takibi yapılmıyor. Başlatırsanız ilacınız bitmeden size haber veririz.</AppText>
      )}

      {status === 'soon' || status === 'critical' || status === 'empty' ? (
        <Notice title="Reçete için randevu alın">
          <BigButton
            icon="📞"
            title="Randevu al"
            onPress={() => router.push({ pathname: '/ilaclar/randevu', params: { id: med.id } })}
          />
        </Notice>
      ) : null}

      {message ? <AppText color={colors.success}>✅ {message}</AppText> : null}
      {error ? <Notice title={error} /> : null}

      {med.stock ? (
        <>
          <AppText variant="button" accessibilityRole="header">
            📦 Yeni kutu aldım
          </AppText>
          <AppTextInput
            label="Yeni kutuda kaç tane var?"
            value={boxUnits}
            onChangeText={setBoxUnits}
            keyboardType="decimal-pad"
            placeholder="Örn. 28"
            maxLength={6}
          />
          <BigButton icon="➕" title="Ekle" onPress={addBox} testID="stock-add" />
        </>
      ) : null}

      <AppText variant="button" accessibilityRole="header">
        {med.stock ? '✏️ Sayıyı düzelt' : '📦 Stok takibini başlat'}
      </AppText>
      <AppTextInput
        label="Elinizde şu an kaç tane var?"
        value={exactUnits}
        onChangeText={setExactUnits}
        keyboardType="decimal-pad"
        placeholder="Örn. 12"
        maxLength={6}
      />
      {!med.stock ? (
        <AppTextInput
          label="Her seferinde kaç tane alıyorsunuz?"
          hint="Yarım tablet için 0,5 yazın."
          value={perDose}
          onChangeText={setPerDose}
          keyboardType="decimal-pad"
          maxLength={4}
        />
      ) : null}
      <BigButton icon="💾" title={med.stock ? 'Düzelt' : 'Başlat'} variant={med.stock ? 'neutral' : 'primary'} onPress={fixCount} />

      {med.stock ? (
        <>
          <BigButton
            icon="📞"
            title="Randevu al"
            subtitle="ALO 182, MHRS veya yakınınıza mesaj"
            variant="neutral"
            onPress={() => router.push({ pathname: '/ilaclar/randevu', params: { id: med.id } })}
          />
          <BigButton icon="⏹️" title="Stok takibini kapat" variant="neutral" onPress={() => setConfirmStop(true)} />
          <ConfirmDialog
            visible={confirmStop}
            title="Stok takibi kapatılsın mı?"
            message="İlacınız bitmeden uyarı almazsınız. Hatırlatmalar devam eder."
            confirmLabel="Evet, kapat"
            cancelLabel="Hayır"
            onCancel={() => setConfirmStop(false)}
            onConfirm={async () => {
              setConfirmStop(false);
              await setStock(med.id, undefined);
              setMessage('Stok takibi kapatıldı.');
            }}
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
});
