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
import {
  draftFromMedication,
  draftToMedication,
  EMPTY_DRAFT,
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
  MAX_DOSE_LENGTH,
  MAX_NAME_LENGTH,
  MED_COLORS,
  medColor,
  WEEKDAY_NAMES,
} from '@/features/medications/model';
import { countTriggers, describeDays, MAX_TRIGGERS, wouldExceedTriggerLimit } from '@/features/medications/schedule';
import { useAppData } from '@/storage/AppDataProvider';
import { colors, spacing } from '@/theme';

const STEP_TITLES: Record<WizardStep, string> = {
  name: 'İlacın adı',
  dose: 'Ne kadar alıyorsunuz?',
  times: 'Hangi saatlerde?',
  days: 'Hangi günlerde?',
  color: 'İlacın rengi',
  summary: 'Kontrol edin',
};

/** B1 — İlaç ekle (`/ilaclar/duzenle`) veya düzenle (`?id=`), adım adım. */
export default function MedicationEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, saveMedication, deleteMedication } = useAppData();
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
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    if (stepIndex === 0) close();
    else setStepIndex((i) => i - 1);
  };

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
          {error ? <Notice title={error} /> : null}
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
          {error ? <Notice title={error} /> : null}
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
          {overLimit ? (
            <Notice
              title="Hatırlatma sınırı aşılıyor"
              message={`Telefon en fazla ${MAX_TRIGGERS} hatırlatma tutabiliyor (şu an ${countTriggers(medications)}). Saat veya gün sayısını azaltın.`}
            />
          ) : null}
          {error ? <Notice title={error} /> : null}
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
      <AppText color={colors.textSecondary} accessibilityLabel={`${stepIndex + 1}. adım, toplam ${WIZARD_STEPS.length}`}>
        {existing ? 'İlacı düzenle' : 'İlaç ekle'} · Adım {stepIndex + 1} / {WIZARD_STEPS.length}
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
