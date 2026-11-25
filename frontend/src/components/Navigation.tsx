import { Icon, type IconName } from '@blueprintjs/core';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProxyState } from '@/context/ProxyStateContext';
import { useVPNState } from '@/context/VPNStateContext';

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
  const { proxyState } = useProxyState();
  const { isConnected, isTransitioning } = useVPNState();

  const [hovered, setHovered] = useState<number | null>(null);
  const selected = items.findIndex((item) => item.id === active);

  const isProxyActive = proxyState === 'on';

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
            title={`${item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)} (Ctrl+${index + 1})`}
            onMouseEnter={() => setHovered(index)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(item.id)}
          >
            <Icon icon={item.icon} size={15} />
            <span className="navigation-item__label">
              {item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)}
            </span>
          </button>
        ))}
      </div>

      <div className="sidebar-status">
        <div className="sidebar-status__item">
          <span>Ad Shield</span>
          <span className={`sidebar-status__dot ${isProxyActive ? 'is-active' : ''}`} />
        </div>
        <div className="sidebar-status__item">
          <span>VPN Tunnel</span>
          <span
            className={`sidebar-status__dot ${isConnected ? 'is-active' : ''}`}
            style={{
              backgroundColor: isTransitioning ? 'var(--warning)' : undefined,
            }}
          />
        </div>
      </div>
    </nav>
  );
}
