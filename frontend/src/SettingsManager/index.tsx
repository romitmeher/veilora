import { Button, Icon } from '@blueprintjs/core';
import { useEffect, useState, useMemo } from 'react';

import veiloraLogo from '@/assets/veilora.png';
import { BrowserLink } from '@/common/BrowserLink';
import { useProxyState } from '@/context/ProxyStateContext';
import { IsNoSelfUpdate } from 'wails/go/app/App';
import { GetVersion } from 'wails/go/config/Config';
import { BrowserOpenURL } from 'wails/runtime';

import { AppRoutingSettings } from './AppRoutingSettings';
import { AssetPortInput } from './AssetPortInput';
import { AutostartSwitch } from './AutostartSwitch';
import { AutoupdateSwitch } from './AutoupdateSwitch';
import { ExportDebugDataButton } from './ExportDebugDataButton';
import { ExportLogsButton } from './ExportLogsButton';
import { IgnoredHostsInput } from './IgnoredHostsInput';
import { LocaleSelector } from './LocaleSelector';
import { PortInput } from './PortInput';
import { ThemeSelector } from './ThemeSelector';
import { UninstallCADialog } from './UninstallCADialog';

import './index.css';

const GITHUB_URL = 'https://github.com/romitmeher/veilora';
const CHANGELOG_URL = `${GITHUB_URL}/blob/main/CHANGELOG.md`;

type SettingsCategory = 'general' | 'appearance' | 'network' | 'advanced' | 'about';

export function SettingsManager() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [state, setState] = useState({
    version: '',
    showUpdateRadio: false,
  });
  const { proxyState } = useProxyState();

  useEffect(() => {
    (async () => {
      try {
        const [version, noSelfUpdate] = await Promise.all([GetVersion(), IsNoSelfUpdate()]);
        setState({
          showUpdateRadio: !noSelfUpdate,
          version: version ?? 'v1.0.0',
        });
      } catch {
        setState({ showUpdateRadio: false, version: 'v1.0.0' });
      }
    })();
  }, []);

  const categories = useMemo(() => [
    { id: 'general' as const, label: 'General' },
    { id: 'appearance' as const, label: 'Appearance' },
    { id: 'network' as const, label: 'Network & Routing' },
    { id: 'advanced' as const, label: 'Advanced' },
    { id: 'about' as const, label: 'About' },
  ], []);

  return (
    <div className="settings-view">
      {/* 1. Category Switcher */}
      <div className="settings-tabs" role="tablist">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`settings-tab-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 2. Categorized Content */}
      {activeCategory === 'general' && (
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Language</span>
              <span className="settings-row__desc">Select display language for Veilora interface</span>
            </div>
            <div className="settings-row__control">
              <LocaleSelector showLabel={false} showHelper={false} />
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Start at Login</span>
              <span className="settings-row__desc">Automatically launch Veilora when you start Windows</span>
            </div>
            <div className="settings-row__control">
              <AutostartSwitch />
            </div>
          </div>

          {state.showUpdateRadio && (
            <div className="settings-row">
              <div className="settings-row__label">
                <span className="settings-row__title">Automatic Updates</span>
                <span className="settings-row__desc">Check for security updates and engine fixes</span>
              </div>
              <div className="settings-row__control">
                <AutoupdateSwitch />
              </div>
            </div>
          )}
        </div>
      )}

      {activeCategory === 'appearance' && (
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Color Theme</span>
              <span className="settings-row__desc">
                Choose between neutral dark graphite or clean light theme, or follow system appearance
              </span>
            </div>
            <div className="settings-row__control">
              <ThemeSelector />
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'network' && (
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Local Proxy Port</span>
              <span className="settings-row__desc">Port used by local ad-blocking proxy engine</span>
            </div>
            <div className="settings-row__control">
              <PortInput />
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Asset Server Port</span>
              <span className="settings-row__desc">Port used for local cosmetic element hiding scripts</span>
            </div>
            <div className="settings-row__control">
              <AssetPortInput />
            </div>
          </div>

          <div className="settings-row" style={{ alignItems: 'flex-start' }}>
            <div className="settings-row__label">
              <span className="settings-row__title">Ignored Hosts</span>
              <span className="settings-row__desc">Bypass local proxy filtering for specific domain names</span>
            </div>
            <div className="settings-row__control" style={{ width: '100%', maxWidth: '320px' }}>
              <IgnoredHostsInput />
            </div>
          </div>

          <div className="settings-row" style={{ alignItems: 'flex-start' }}>
            <div className="settings-row__label">
              <span className="settings-row__title">App Routing</span>
              <span className="settings-row__desc">Route only selected applications or exclude specific apps</span>
            </div>
            <div className="settings-row__control" style={{ width: '100%', maxWidth: '320px' }}>
              <AppRoutingSettings />
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'advanced' && (
        <div className="settings-card settings-card--danger">
          <div className="settings-card__danger-header">
            <Icon icon="warning-sign" size={14} />
            <span>Root Certificate Management</span>
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span className="settings-row__title">Uninstall HTTPS Inspection Certificate</span>
              <span className="settings-row__desc">
                Removes Veilora Root CA from Windows certificate store. HTTPS ad filtering will stop working until re-installed.
              </span>
            </div>
            <div className="settings-row__control">
              <UninstallCADialog proxyState={proxyState} />
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'about' && (
        <div className="settings-card">
          <div className="settings-about">
            <div className="settings-about__header">
              <img src={veiloraLogo} alt="Veilora Logo" className="settings-about__logo" />
              <div className="settings-about__title">
                <h3>Veilora</h3>
                <p>Native Desktop Privacy Guard & VPN Operating System</p>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '18px' }}>
              <div>Version {state.version}</div>
              <div>
                <BrowserLink href={CHANGELOG_URL}>View Release Notes & Changelog</BrowserLink>
              </div>
              <div style={{ marginTop: '4px' }}>Forked from Zen · © 2026 Veilora Contributors</div>
            </div>

            <div className="settings-about__actions">
              <Button
                variant="outlined"
                icon="git-branch"
                onClick={() => BrowserOpenURL(GITHUB_URL)}
              >
                GitHub Repository
              </Button>
              <ExportLogsButton />
              <ExportDebugDataButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
