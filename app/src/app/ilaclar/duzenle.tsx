import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  AppTextInput,
  BigButton,
  ConfirmDialog,
  Notice,
  OptionButton,
  ScreenContainer,
} from '@/components';
import { TimePickerBig } from '@/components/TimePickerBig';
import { useAnnounce } from '@/utils/a11y';
import { contactTitle } from '@/features/emergency/contacts';
import {
  adjacentStep,
  draftFromMedication,
  draftToMedication,
  EMPTY_DRAFT,
  isStepVisible,
  newMedicationId,
  suggestNextTime,
  toggleDay,
  validateStep,
  WIZARD_STEPS,
  type MedicationDraft,
  type WizardStep,
} from '@/features/medications/draft';
import {
  ALL_WEEKDAYS,
  COMMON_DEPARTMENTS,
  MAX_DOSE_LENGTH,
  MAX_NAME_LENGTH,
  MED_COLORS,
  medColor,
  WEEKDAY_NAMES,
} from '@/features/medications/model';
import { countTriggers, describeDays, MAX_TRIGGERS, wouldExceedTriggerLimit } from '@/features/medications/schedule';
import { describeDaysLeft, formatUnits } from '@/features/medications/stock';
import { useAppData } from '@/storage/AppDataProvider';
import { colors, spacing } from '@/theme';

const STEP_TITLES: Record<WizardStep, string> = {
  name: 'İlacın adı',
  dose: 'Ne kadar alıyorsunuz?',
  times: 'Hangi saatlerde?',
  days: 'Hangi günlerde?',
  color: 'İlacın rengi',
  stock: 'Elinizde ne kadar var?',
  refill: 'Reçete bilgisi',
  summary: 'Kontrol edin',
};

/** B1 — İlaç ekle (`/ilaclar/duzenle`) veya düzenle (`?id=`), adım adım. */
export default function MedicationEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, contacts, saveMedication, deleteMedication } = useAppData();
  const existing = id ? medications.find((m) => m.id === id) : undefined;

  const [draft, setDraft] = useState<MedicationDraft>(() => (existing ? draftFromMedication(existing) : EMPTY_DRAFT));
  // Düzenlemede doğrudan özetten başlanır; her satırın "Değiştir" düğmesi ilgili adıma götürür.
  const [stepIndex, setStepIndex] = useState(existing ? WIZARD_STEPS.length - 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const step = WIZARD_STEPS[stepIndex];
  const update = (patch: Partial<MedicationDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };
  const goTo = (target: WizardStep) => {
    setError(null);
    setStepIndex(WIZARD_STEPS.indexOf(target));
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/ilaclar/liste'));

  const candidate = useMemo(
    () => draftToMedication(draft, existing?.id ?? 'yeni', existing),
    [draft, existing],
  );
  const overLimit = wouldExceedTriggerLimit(medications, candidate);

  const next = () => {
    const problem = validateStep(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStepIndex((i) => adjacentStep(i, 1, draft));
  };
  const back = () => {
    setError(null);
    if (stepIndex === 0) close();
    else setStepIndex((i) => adjacentStep(i, -1, draft));
  };
  const visibleSteps = WIZARD_STEPS.filter((s) => isStepVisible(s, draft));
  // Adım değişince VoiceOver'a yeni adımın adı söylenir (ekran aynı kaldığı için kendiliğinden okunmaz).
  useAnnounce(`${STEP_TITLES[step]}. ${visibleSteps.indexOf(step) + 1}. adım, toplam ${visibleSteps.length}`, true);
  const updateRefill = (patch: Partial<MedicationDraft['refill']>) => update({ refill: { ...draft.refill, ...patch } });

  const save = async () => {
    for (const s of WIZARD_STEPS) {
      const problem = validateStep(s, draft);
      if (problem) {
        goTo(s);
        setError(problem);
        return;
      }
    }
    setSaving(true);
    const result = await saveMedication(draftToMedication(draft, existing?.id ?? newMedicationId(), existing));
    setSaving(false);
    if (result.ok) close();
    else setError('Telefon en fazla 60 hatırlatma tutabiliyor. Bazı ilaçların saat veya gün sayısını azaltın.');
  };

  let body: React.ReactNode = null;
  switch (step) {
    case 'name':
      body = (
        <AppTextInput
          label="İlacın adı"
          hint="Kutunun üzerindeki adı ya da kendi bildiğiniz adı yazın."
          value={draft.name}
          onChangeText={(name) => update({ name })}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Örn. Tansiyon ilacı"
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={next}
          error={error ?? undefined}
        />
      );
      break;
    case 'dose':
      body = (
        <AppTextInput
          label="Doz (isteğe bağlı)"
          hint="Her seferinde ne kadar alıyorsunuz?"
          value={draft.dose}
          onChangeText={(dose) => update({ dose })}
          maxLength={MAX_DOSE_LENGTH}
          placeholder="Örn. 1 tablet"
          returnKeyType="next"
          onSubmitEditing={next}
          error={error ?? undefined}
        />
      );
      break;
    case 'times': {
      const suggestion = suggestNextTime(draft.times);
      body = (
        <>
          {draft.times.map((time, index) => (
            <View key={index} style={styles.timeCard}>
              {draft.times.length > 1 ? <AppText variant="bodyBold">{index + 1}. saat</AppText> : null}
              <TimePickerBig
                value={time}
                label={draft.times.length > 1 ? `${index + 1}. saat` : undefined}
                onChange={(value) => update({ times: draft.times.map((t, i) => (i === index ? value : t)) })}
              />
              {draft.times.length > 1 ? (
                <BigButton
                  icon="✖️"
                  title="Bu saati kaldır"
                  variant="neutral"
                  onPress={() => update({ times: draft.times.filter((_, i) => i !== index) })}
                  accessibilityLabel={`${index + 1}. saati (${time}) kaldır`}
                />
              ) : null}
            </View>
          ))}
          {suggestion ? (
            <BigButton
              icon="➕"
              title="Başka saat ekle"
              variant="neutral"
              onPress={() => update({ times: [...draft.times, suggestion] })}
            />
          ) : null}
          {error ? <Notice title={error} announce /> : null}
        </>
      );
      break;
    }
    case 'days':
      body = (
        <>
          <OptionButton label="Her gün" selected={draft.days === 'everyday'} onPress={() => update({ days: 'everyday' })} />
          <OptionButton
            label="Belirli günler"
            selected={draft.days !== 'everyday'}
            onPress={() => update({ days: draft.days === 'everyday' ? [] : draft.days })}
          />
          {draft.days !== 'everyday' ? (
            <>
              <AppText variant="bodyBold">Günleri seçin:</AppText>
              {ALL_WEEKDAYS.map((day) => (
                <OptionButton
                  key={day}
                  role="checkbox"
                  label={WEEKDAY_NAMES[day]}
                  selected={(draft.days as number[]).includes(day)}
                  onPress={() => update({ days: toggleDay(draft.days, day) })}
                />
              ))}
            </>
          ) : null}
          {error ? <Notice title={error} announce /> : null}
        </>
      );
      break;
    case 'color':
      body = (
        <>
          <AppText>Kutudaki ilacı tanımanıza yardımcı olur.</AppText>
          {MED_COLORS.map((c) => (
            <OptionButton
              key={c.id}
              label={c.label}
              swatch={c.hex}
              selected={draft.color === c.id}
              onPress={() => update({ color: c.id })}
            />
          ))}
        </>
      );
      break;
    case 'stock':
      body = (
        <>
          <AppText>İlacınız bitmeden size haber verelim mi? Bunun için elinizde kaç tane kaldığını bilmemiz gerekiyor.</AppText>
          <OptionButton
            label="Evet, takip edilsin"
            description="Her ALDIM'da sayı azalır, bitmeye yakın uyarırız."
            selected={draft.trackStock}
            onPress={() => update({ trackStock: true })}
          />
          <OptionButton label="Hayır, gerek yok" selected={!draft.trackStock} onPress={() => update({ trackStock: false })} />
          {draft.trackStock ? (
            <>
              <AppTextInput
                label="Elinizde kaç tane var?"
                hint="Açık kutular dahil, tablet ya da kapsül sayısı."
                value={draft.stockUnits}
                onChangeText={(stockUnits) => update({ stockUnits })}
                keyboardType="decimal-pad"
                placeholder="Örn. 30"
                maxLength={6}
              />
              <AppTextInput
                label="Her seferinde kaç tane alıyorsunuz?"
                hint="Yarım tablet için 0,5 yazın."
                value={draft.unitsPerDose}
                onChangeText={(unitsPerDose) => update({ unitsPerDose })}
                keyboardType="decimal-pad"
                placeholder="1"
                maxLength={4}
              />
            </>
          ) : null}
          {error ? <Notice title={error} announce /> : null}
        </>
      );
      break;
    case 'refill':
      body = (
        <>
          <AppText>
            İlacınız bitmeye yakın, reçete için randevu almanıza yardımcı oluruz. Bu bilgiler isteğe bağlıdır.
          </AppText>
          <AppText variant="bodyBold">Hangi bölüm yazıyor?</AppText>
          {COMMON_DEPARTMENTS.map((department) => (
            <OptionButton
              key={department}
              label={department}
              selected={draft.refill.department === department}
              onPress={() => updateRefill({ department: draft.refill.department === department ? '' : department })}
            />
          ))}
          <AppTextInput
            label="Bölüm (listede yoksa)"
            value={(COMMON_DEPARTMENTS as readonly string[]).includes(draft.refill.department) ? '' : draft.refill.department}
            onChangeText={(department) => updateRefill({ department })}
            placeholder="Örn. Romatoloji"
            maxLength={40}
          />
          <AppTextInput
            label="Doktorun adı"
            value={draft.refill.doctor}
            onChangeText={(doctor) => updateRefill({ doctor })}
            placeholder="Örn. Mehmet Yılmaz"
            autoCapitalize="words"
            maxLength={40}
          />
          <AppTextInput
            label="Hastane"
            value={draft.refill.hospital}
            onChangeText={(hospital) => updateRefill({ hospital })}
            placeholder="Örn. Şehir Hastanesi"
            autoCapitalize="words"
            maxLength={60}
          />
          <AppText variant="bodyBold">Randevuyu kimden isteyelim?</AppText>
          {contacts.length === 0 ? (
            <AppText color={colors.textSecondary}>Henüz yakın eklenmedi. Ayarlar'dan ekleyebilirsiniz.</AppText>
          ) : (
            <>
              {contacts.map((c) => (
                <OptionButton
                  key={c.id}
                  label={contactTitle(c)}
                  selected={draft.refill.contactId === c.id}
                  onPress={() => updateRefill({ contactId: c.id })}
                />
              ))}
              <OptionButton
                label="Şimdi seçmeyeyim"
                selected={!contacts.some((c) => c.id === draft.refill.contactId)}
                onPress={() => updateRefill({ contactId: '' })}
              />
            </>
          )}
        </>
      );
      break;
    case 'summary':
      body = (
        <>
          <SummaryRow label="İlaç" value={draft.name.trim() || '—'} onChange={() => goTo('name')} />
          <SummaryRow label="Doz" value={draft.dose.trim() || 'Belirtilmedi'} onChange={() => goTo('dose')} />
          <SummaryRow label="Saatler" value={[...draft.times].sort().join(', ')} onChange={() => goTo('times')} />
          <SummaryRow
            label="Günler"
            value={draft.days !== 'everyday' && draft.days.length === 0 ? 'Seçilmedi' : describeDays(draft.days, WEEKDAY_NAMES)}
            onChange={() => goTo('days')}
          />
          <SummaryRow label="Renk" value={medColor(draft.color).label} onChange={() => goTo('color')} />
          <SummaryRow
            label="Stok takibi"
            value={
              candidate.stock
                ? `${formatUnits(candidate.stock.remainingUnits)} var, her seferinde ${formatUnits(candidate.stock.unitsPerDose)}. ${describeDaysLeft(candidate, new Date()) ?? ''}`
                : 'Yapılmıyor'
            }
            onChange={() => goTo('stock')}
          />
          {draft.trackStock ? (
            <SummaryRow
              label="Reçete bilgisi"
              value={
                [
                  candidate.refill?.department,
                  candidate.refill?.doctor && `Dr. ${candidate.refill.doctor.replace(/^dr\.?\s*/i, '')}`,
                  candidate.refill?.hospital,
                  contacts.find((c) => c.id === candidate.refill?.contactId)?.name &&
                    `Randevu: ${contacts.find((c) => c.id === candidate.refill?.contactId)!.name}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Girilmedi'
              }
              onChange={() => goTo('refill')}
            />
          ) : null}
          {overLimit ? (
            <Notice
              title="Hatırlatma sınırı aşılıyor"
              message={`Telefon en fazla ${MAX_TRIGGERS} hatırlatma tutabiliyor (şu an ${countTriggers(medications)}). Saat veya gün sayısını azaltın.`}
            />
          ) : null}
          {error ? <Notice title={error} announce /> : null}
          {existing ? (
            <BigButton
              icon="🗑️"
              title="Bu ilacı sil"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
              accessibilityHint="Onay sorulur. Hatırlatmaları da silinir."
            />
          ) : null}
        </>
      );
      break;
  }

  const footer = (
    <View style={styles.footer}>
      {step === 'summary' ? (
        <BigButton
          icon="💾"
          title={saving ? 'Kaydediliyor…' : 'Kaydet'}
          onPress={save}
          disabled={saving || overLimit}
          testID="med-save"
        />
      ) : (
        <BigButton icon="▶️" title="İleri" onPress={next} testID="med-next" />
      )}
      <BigButton
        icon={stepIndex === 0 ? '✖️' : '⬅️'}
        title={stepIndex === 0 ? 'Vazgeç' : 'Geri'}
        variant="neutral"
        onPress={back}
        accessibilityHint={stepIndex === 0 ? 'Kaydetmeden çıkar' : 'Önceki adıma döner'}
      />
    </View>
  );

  return (
    <ScreenContainer title={STEP_TITLES[step]} footer={footer}>
      <AppText color={colors.textSecondary} accessibilityLabel={`${visibleSteps.indexOf(step) + 1}. adım, toplam ${visibleSteps.length}`}>
        {existing ? 'İlacı düzenle' : 'İlaç ekle'} · Adım {visibleSteps.indexOf(step) + 1} / {visibleSteps.length}
      </AppText>
      {body}
      {existing ? (
        <ConfirmDialog
          visible={confirmDelete}
          title="İlaç silinsin mi?"
          message={`${existing.name} ve hatırlatmaları silinecek.`}
          confirmLabel="Evet, sil"
          cancelLabel="Hayır"
          confirmVariant="danger"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            await deleteMedication(existing.id);
            close();
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

function SummaryRow({ label, value, onChange }: { label: string; value: string; onChange: () => void }) {
  return (
    <View style={styles.summaryRow}>
      <AppText color={colors.textSecondary}>{label}</AppText>
      <AppText variant="button">{value}</AppText>
      <BigButton
        icon="✏️"
        title="Değiştir"
        variant="neutral"
        onPress={onChange}
        accessibilityLabel={`${label} bilgisini değiştir`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.buttonGap,
  },
  timeCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
  },
  summaryRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralBackground,
  },
});
