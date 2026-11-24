import { createContext, useContext, ReactNode, useState, useMemo } from 'react';

import { ProxyState } from '@/types';

type ProxyStateContextType = {
  proxyState: ProxyState;
  setProxyState: (state: ProxyState) => void;
  isProxyRunning: boolean;
};

const ProxyStateContext = createContext<ProxyStateContextType | undefined>(undefined);

export function ProxyStateProvider({ children }: { children: ReactNode }) {
  const [proxyState, setProxyState] = useState<ProxyState>('off');
  const isProxyRunning = proxyState === 'on' || proxyState === 'loading';

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      proxyState,
      setProxyState,
      isProxyRunning,
    }),
    [proxyState, isProxyRunning],
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
    };
  }
  return context;
}
