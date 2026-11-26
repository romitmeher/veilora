import { FocusStyleManager } from '@blueprintjs/core';
import { type CSSProperties, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import './App.css';

import { RestartApplication } from 'wails/go/app/App';
import { GetFirstLaunch } from 'wails/go/config/Config';
import { EventsOn } from 'wails/runtime/runtime';

import { ThemeType, useTheme } from './common/ThemeManager';
import { AppToaster } from './common/toaster';
import { AppHeader } from './components/AppHeader';
import {
  Navigation,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  type AppTab,
} from './components/Navigation';
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

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('veilora_sidebar_open');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = Number(window.localStorage.getItem('veilora_sidebar_width'));
      if (Number.isFinite(raw) && raw >= SIDEBAR_MIN_WIDTH && raw <= SIDEBAR_MAX_WIDTH) {
        return raw;
      }
    } catch {
      // ignore storage errors
    }
    return 204;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const handleSidebarOpenChange = useCallback((next: boolean) => {
    setSidebarOpen(next);
    try {
      window.localStorage.setItem('veilora_sidebar_open', String(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSidebarWidthChange = useCallback((next: number) => {
    setSidebarWidth(next);
    try {
      window.localStorage.setItem('veilora_sidebar_width', String(Math.round(next)));
    } catch {
      // ignore storage errors
    }
  }, []);

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
          return;
        }
      }

      // Fluid Functionalism bare `[` shortcut to toggle sidebar (skip when typing or modified)
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        handleSidebarOpenChange(!sidebarOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIntro, sidebarOpen, handleSidebarOpenChange]);

  const appClasses = [
    effectiveTheme === ThemeType.DARK ? 'bp6-dark' : '',
    isResizingSidebar ? 'is-resizing-sidebar' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id="app"
      className={appClasses}
      style={
        {
          '--sidebar-width': showIntro
            ? '0px'
            : sidebarOpen
              ? `${sidebarWidth}px`
              : `${SIDEBAR_COLLAPSED_WIDTH}px`,
        } as CSSProperties
      }
    >
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
          <Navigation
            active={activeTab}
            onChange={setActiveTab}
            open={sidebarOpen}
            onOpenChange={handleSidebarOpenChange}
            width={sidebarWidth}
            onWidthChange={handleSidebarWidthChange}
            onResizingChange={setIsResizingSidebar}
          />

          <main className="content" id="main-content">
            <div className="content__topbar">
              <button
                type="button"
                className="sidebar-trigger"
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                aria-expanded={sidebarOpen}
                aria-controls="app-sidebar"
                title={`${sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} ([)`}
                onClick={() => handleSidebarOpenChange(!sidebarOpen)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M9 3v18" />
                </svg>
              </button>
            </div>
            <header className="page-heading">
              <h1>{activeTab === 'home' ? t('ui.overview') : t(`app.tabs.${activeTab}`)}</h1>
              <p>{t(`ui.descriptions.${activeTab}`)}</p>
            </header>
            <div className="content__body">
              {activeTab === 'home' && <Overview onNavigate={setActiveTab} />}
              {activeTab === 'filterLists' && <FilterLists />}
              {activeTab === 'rules' && <Rules />}
              {activeTab === 'vpn' && <VPN />}
              {activeTab === 'settings' && <SettingsManager />}
            </div>
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
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
