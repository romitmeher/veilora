import { Icon } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';

import { ThemeType, useTheme } from '@/common/ThemeManager';

const THEME_OPTIONS = [
  { type: ThemeType.SYSTEM, icon: 'desktop' as const, key: 'settings.theme.system' },
  { type: ThemeType.LIGHT, icon: 'flash' as const, key: 'settings.theme.light' },
  { type: ThemeType.DARK, icon: 'moon' as const, key: 'settings.theme.dark' },
];

export function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-segmented" role="radiogroup" aria-label="Color theme">
      {THEME_OPTIONS.map((opt) => {
        const active = theme === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            role="radio"
            aria-checked={active}
            className={`theme-segmented__btn ${active ? 'is-active' : ''}`}
            onClick={() => setTheme(opt.type)}
          >
            <Icon icon={opt.icon} size={13} />
            <span>{t(opt.key)}</span>
          </button>
        );
      })}
    </div>
  );
}
