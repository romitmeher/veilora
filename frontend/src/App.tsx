import { Button, FocusStyleManager, Icon } from '@blueprintjs/core';
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
import { StartStopButton } from './components/StartStopButton';
import { StatusText } from './components/StatusText';
import { useProxyState } from './context/ProxyStateContext';
import { useVPNState } from './context/VPNStateContext';
import { FilterLists } from './FilterLists';
import { Intro } from './Intro';
import { useProxyHotkey } from './ProxyHotkey';
import { RequestLog } from './RequestLog';
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
  const { vpnState, isConnected, vpnInfo } = useVPNState();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    GetFirstLaunch().then(setShowIntro);
  }, []);

  useProxyHotkey(showIntro);

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
            <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
              <section className="service-list" aria-label={t('ui.overview')}>
                <div className="service-row">
                  <span className="service-icon">
                    <Icon icon="shield" size={19} />
                  </span>
                  <div className="service-description">
                    <h2>{t('ui.adBlocking')}</h2>
                    <p>{t('ui.filterDescription')}</p>
                  </div>
                  <span className={`service-state ${proxyState === 'on' ? 'is-active' : ''}`} role="status">
                    <span className="status-dot" />
                    <StatusText>{t(`ui.shortProxy.${proxyState}`)}</StatusText>
                  </span>
                  <Button
                    variant="minimal"
                    icon="settings"
                    aria-label={t('ui.reviewFilters')}
                    title={t('ui.reviewFilters')}
                    onClick={() => setActiveTab('filterLists')}
                  />
                </div>
                <div className="service-row">
                  <span className="service-icon">
                    <Icon icon="globe-network" size={19} />
                  </span>
                  <div className="service-description">
                    <h2>{t('app.tabs.vpn')}</h2>
                    <p>{isConnected ? vpnInfo.countryLong || t('ui.unknown') : t('ui.vpnDescription')}</p>
                  </div>
                  <span className={`service-state ${isConnected ? 'is-active' : ''}`} role="status">
                    <span className="status-dot" />
                    <StatusText>{t(`ui.vpn.${vpnState}`)}</StatusText>
                  </span>
                  <Button
                    variant="minimal"
                    icon="arrow-right"
                    aria-label={t('ui.manageVPN')}
                    title={t('ui.manageVPN')}
                    onClick={() => setActiveTab('vpn')}
                  />
                </div>
              </section>
              <div className="activity-heading">
                <h2>{t('ui.activity')}</h2>
                <span>{t('ui.session')}</span>
              </div>
              {proxyState === 'off' ? (
                <div className="activity-empty">
                  <Icon icon="inbox" size={22} />
                  <h3>{t('ui.waiting')}</h3>
                  <p>{t('app.proxy.description')}</p>
                  <Button variant="outlined" icon="filter" onClick={() => setActiveTab('filterLists')}>
                    {t('ui.reviewFilters')}
                  </Button>
                </div>
              ) : (
                <RequestLog />
              )}
            </div>
            {activeTab === 'filterLists' && <FilterLists />}
            {activeTab === 'rules' && <Rules />}
            {activeTab === 'vpn' && <VPN />}
            {activeTab === 'settings' && <SettingsManager />}
          </main>
          <footer className="protection-footer">
            <div className="protection-footer__status">
              <span className={`status-dot ${proxyState === 'on' ? 'is-active' : ''}`} />
              <div>
                <StatusText>{t(`ui.proxy.${proxyState}`)}</StatusText>
              </div>
            </div>
            <StartStopButton />
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
