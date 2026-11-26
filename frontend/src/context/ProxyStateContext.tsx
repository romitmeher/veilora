import { createContext, useContext, ReactNode, useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { BrowserLink } from '@/common/BrowserLink';
import { AppToaster } from '@/common/toaster';
import { ProxyState } from '@/types';
import { EventsOn } from 'wails/runtime/runtime';

const PROXY_CHANNEL = 'proxy:action';
const LINUX_PROXY_GUIDE_URL = 'https://github.com/irbis-sh/zen-desktop/blob/master/docs/external/linux-proxy-conf.md';
const MAX_LOGS = 200;

export interface RequestLogRule {
  filterName: string;
  rawRule: string;
}

export interface RequestLogProcess {
  id: number;
  name: string;
  diskPath: string;
}

export enum FilterActionKind {
  Block = 'block',
  Redirect = 'redirect',
  Modify = 'modify',
}

export interface FilterAction {
  id: string;
  kind: FilterActionKind;
  method: string;
  url: string;
  to: string;
  referer: string;
  rules: RequestLogRule[];
  process: RequestLogProcess;
  createdAt: Date;
}

function nextLogId(): string {
  return Math.random().toString(36).slice(2, 9);
}

type ProxyStateContextType = {
  proxyState: ProxyState;
  setProxyState: (state: ProxyState) => void;
  isProxyRunning: boolean;
  logs: FilterAction[];
  isLogsPaused: boolean;
  setIsLogsPaused: (paused: boolean) => void;
  clearLogs: () => void;
  sessionBlocks: number;
};

const ProxyStateContext = createContext<ProxyStateContextType | undefined>(undefined);

export function ProxyStateProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [proxyState, setProxyState] = useState<ProxyState>('off');
  const [logs, setLogs] = useState<FilterAction[]>([]);
  const [isLogsPaused, setIsLogsPaused] = useState(false);
  const [sessionBlocks, setSessionBlocks] = useState(0);

  const isProxyRunning = proxyState === 'on' || proxyState === 'loading';

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    const cancel = EventsOn(PROXY_CHANNEL, (action: { kind?: string; error?: string }) => {
      switch (action?.kind) {
        case 'starting':
        case 'stopping':
          setProxyState('loading');
          break;
        case 'started':
          setProxyState('on');
          break;
        case 'stopped':
          setProxyState('off');
          break;
        case 'startError':
          AppToaster.show({
            message: t('startStopButton.startError', { error: action.error }),
            intent: 'danger',
          });
          setProxyState('on');
          break;
        case 'stopError':
          AppToaster.show({
            message: t('startStopButton.stopError', { error: action.error }),
            intent: 'danger',
          });
          setProxyState('off');
          break;
        case 'unsupportedDE':
          AppToaster.show({
            message: <BrowserLink href={LINUX_PROXY_GUIDE_URL}>{t('startStopButton.unsupportedDEGuide')}</BrowserLink>,
            intent: 'warning',
          });
          break;
        default:
          break;
      }
    });
    return cancel;
  }, [t]);

  useEffect(() => {
    const cancel = EventsOn('filter:action', (action: Omit<FilterAction, 'id' | 'createdAt'>) => {
      if (action?.kind === FilterActionKind.Block) {
        setSessionBlocks((prev) => prev + 1);
      }
      if (isLogsPaused) {
        return;
      }
      setLogs((prev) =>
        [
          {
            ...action,
            id: nextLogId(),
            createdAt: new Date(),
          },
          ...prev,
        ].slice(0, MAX_LOGS),
      );
    });
    return cancel;
  }, [isLogsPaused]);

  const contextValue = useMemo(
    () => ({
      proxyState,
      setProxyState,
      isProxyRunning,
      logs,
      isLogsPaused,
      setIsLogsPaused,
      clearLogs,
      sessionBlocks,
    }),
    [proxyState, isProxyRunning, logs, isLogsPaused, clearLogs, sessionBlocks],
  );

  return <ProxyStateContext.Provider value={contextValue}>{children}</ProxyStateContext.Provider>;
}

export function useProxyState() {
  const context = useContext(ProxyStateContext);
  if (context === undefined) {
    return {
      proxyState: 'off' as ProxyState,
      setProxyState: () => {},
      isProxyRunning: false,
      logs: [] as FilterAction[],
      isLogsPaused: false,
      setIsLogsPaused: () => {},
      clearLogs: () => {},
      sessionBlocks: 0,
    };
  }
  return context;
}
