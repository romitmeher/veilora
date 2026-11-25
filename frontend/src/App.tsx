import { FocusStyleManager } from '@blueprintjs/core';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import './App.css';

import { RestartApplication } from 'wails/go/app/App';
import { GetFirstLaunch } from 'wails/go/config/Config';
import { EventsOn } from 'wails/runtime/runtime';

import { ThemeType, useTheme } from './common/ThemeManager';
import { AppToaster } from './common/toaster';
import { AppHeader } from './components/AppHeader';
import { Navigation, type AppTab } from './components/Navigation';
import { useProxyState } from './context/ProxyStateContext';
import { useVPNState } from './context/VPNStateContext';
import { FilterLists } from './FilterLists';
import { Intro } from './Intro';
import { Overview } from './Overview';
import { useProxyHotkey } from './ProxyHotkey';
import { Rules } from './Rules';
import { SettingsManager } from './SettingsManager';
import { VPN } from './VPN';

function App() {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    FocusStyleManager.onlyShowFocusOnTabs();
  }, []);

  useEffect(() => {
    const cancel = EventsOn('app:update', (action: { kind: string }) => {
      if (action.kind === 'updateAvailable') {
        AppToaster.show({
          message: t('app.update.updateAvailable'),
          intent: 'primary',
          timeout: 0,
          action: {
            text: t('app.update.restart'),
            onClick: () => {
              try {
                RestartApplication();
              } catch (error) {
                AppToaster.show({
                  message: t('app.update.restartFailed', { error }),
                  intent: 'danger',
                });
              }
            },
          },
        });
      }
    });

    return cancel;
  }, [t]);

  const { proxyState } = useProxyState();
  const { vpnInfo, isConnected, isTransitioning } = useVPNState();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    GetFirstLaunch().then(setShowIntro);
  }, []);

  useProxyHotkey(showIntro);

  useEffect(() => {
    if (showIntro) return;
    const tabs: AppTab[] = ['home', 'vpn', 'filterLists', 'rules', 'settings'];
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < tabs.length) {
          e.preventDefault();
          setActiveTab(tabs[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIntro]);

  return (
    <div id="app" className={effectiveTheme === ThemeType.DARK ? 'bp6-dark' : ''}>
      <AppHeader />

      {showIntro ? (
        <div className="onboarding">
          <Intro
            onClose={() => {
              setShowIntro(false);
            }}
          />
        </div>
      ) : (
        <>
          <Navigation active={activeTab} onChange={setActiveTab} />

          <main className="content" id="main-content">
            <header className="page-heading">
              <h1>{activeTab === 'home' ? t('ui.overview') : t(`app.tabs.${activeTab}`)}</h1>
              <p>{t(`ui.descriptions.${activeTab}`)}</p>
            </header>
            {activeTab === 'home' && <Overview onNavigate={setActiveTab} />}
            {activeTab === 'filterLists' && <FilterLists />}
            {activeTab === 'rules' && <Rules />}
            {activeTab === 'vpn' && <VPN />}
            {activeTab === 'settings' && <SettingsManager />}
          </main>
          <footer className="status-footer">
            <div className="status-footer__left">
              <span className="status-footer__item">
                <span className={`status-footer__dot ${proxyState === 'on' ? 'is-active' : ''}`} />
                <span>Ad Shield: {proxyState === 'on' ? 'Active' : 'Paused'}</span>
              </span>
              <span className="status-footer__item">
                <span
                  className={`status-footer__dot ${isConnected ? 'is-active' : ''}`}
                  style={{ backgroundColor: isTransitioning ? 'var(--warning)' : undefined }}
                />
                <span>
                  VPN: {isConnected ? vpnInfo.countryLong || 'Connected' : isTransitioning ? 'Connecting…' : 'Disconnected'}
                </span>
              </span>
            </div>
            <div className="status-footer__right">
              <span>Ctrl+1..5 tabs</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
