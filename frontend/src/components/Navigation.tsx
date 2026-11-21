import { Icon, type IconName } from '@blueprintjs/core';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type AppTab = 'home' | 'vpn' | 'filterLists' | 'rules' | 'settings';

const items: { id: AppTab; icon: IconName }[] = [
  { id: 'home', icon: 'applications' },
  { id: 'vpn', icon: 'globe-network' },
  { id: 'filterLists', icon: 'filter' },
  { id: 'rules', icon: 'code' },
  { id: 'settings', icon: 'cog' },
];

export function Navigation({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = items.findIndex((item) => item.id === active);

  return (
    <nav className="sidebar" aria-label={t('ui.navigation')}>
      <div
        className="navigation-track"
        style={{ '--nav-index': hovered ?? selected } as CSSProperties}
        onMouseLeave={() => setHovered(null)}
      >
        <span className="navigation-highlight" aria-hidden="true" />
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="navigation-item"
            aria-current={active === item.id ? 'page' : undefined}
            onMouseEnter={() => setHovered(index)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(item.id)}
          >
            <Icon icon={item.icon} size={15} />
            <span>{item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-device">
        <Icon icon="desktop" size={14} />
        <span>{t('ui.thisDevice')}</span>
      </div>
    </nav>
  );
}
