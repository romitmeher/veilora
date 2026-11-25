import { Button, ButtonGroup } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';

import { ThemeType, useTheme } from '@/common/ThemeManager';

export function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <ButtonGroup className="theme-segmented">
      <Button
        icon="desktop"
        intent={theme === ThemeType.SYSTEM ? 'primary' : 'none'}
        active={theme === ThemeType.SYSTEM}
        onClick={() => setTheme(ThemeType.SYSTEM)}
      >
        {t('settings.theme.system')}
      </Button>
      <Button
        icon="flash"
        intent={theme === ThemeType.LIGHT ? 'primary' : 'none'}
        active={theme === ThemeType.LIGHT}
        onClick={() => setTheme(ThemeType.LIGHT)}
      >
        {t('settings.theme.light')}
      </Button>
      <Button
        icon="moon"
        intent={theme === ThemeType.DARK ? 'primary' : 'none'}
        active={theme === ThemeType.DARK}
        onClick={() => setTheme(ThemeType.DARK)}
      >
        {t('settings.theme.dark')}
      </Button>
    </ButtonGroup>
  );
}
