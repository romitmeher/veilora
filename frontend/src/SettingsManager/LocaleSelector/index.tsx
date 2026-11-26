import { FormGroup } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';

import { FluidSelect } from '@/components/FluidSelect';
import { changeLocale, getCurrentLocale, LOCALE_LABELS, type LocaleItem } from '@/i18n';

interface LocaleSelectorProps {
  showLabel?: boolean;
  showHelper?: boolean;
}

export function LocaleSelector({ showLabel = true, showHelper = true }: LocaleSelectorProps = {}) {
  const { t } = useTranslation();
  const current = getCurrentLocale();

  const selectComponent = (
    <FluidSelect
      aria-label={t('settings.language.label')}
      value={current}
      onChange={(val) => changeLocale(val as LocaleItem['value'])}
      options={LOCALE_LABELS.map((item) => ({
        value: item.value,
        label: item.label,
      }))}
    />
  );

  if (!showLabel && !showHelper) {
    return selectComponent;
  }

  return (
    <FormGroup
      label={showLabel ? t('settings.language.label') : undefined}
      helperText={showHelper ? t('settings.language.helper') : undefined}
    >
      {selectComponent}
    </FormGroup>
  );
}
