import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';

import { VPNGetStatus } from 'wails/go/app/App';
import { EventsOn } from 'wails/runtime/runtime';

export type VPNState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export interface VPNStatus {
  state: VPNState;
  message: string;
}

export interface VPNConnectionInfo {
  serverHostName: string;
  serverIP: string;
  countryLong: string;
  countryShort: string;
  engine: string;
  status: VPNStatus;
  killSwitchOn: boolean;
  dnsProtectionOn: boolean;
}

const defaultInfo: VPNConnectionInfo = {
  serverHostName: '',
  serverIP: '',
  countryLong: '',
  countryShort: '',
  engine: 'openvpn',
  status: { state: 'disconnected', message: '' },
  killSwitchOn: false,
  dnsProtectionOn: false,
};

interface VPNStateContextType {
  vpnInfo: VPNConnectionInfo;
  vpnState: VPNState;
  isConnected: boolean;
  isTransitioning: boolean;
  refreshStatus: () => void;
}

const VPNStateContext = createContext<VPNStateContextType | undefined>(undefined);

export function VPNStateProvider({ children }: { children: ReactNode }) {
  const [vpnInfo, setVpnInfo] = useState<VPNConnectionInfo>(defaultInfo);

  const refreshStatus = useCallback(() => {
    VPNGetStatus().then((info: VPNConnectionInfo) => {
      if (info) setVpnInfo(info);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshStatus();
    const cancel = EventsOn('vpn:statusChanged', (info: VPNConnectionInfo) => {
      if (info) setVpnInfo(info);
    });
    return cancel;
  }, [refreshStatus]);

  const vpnState = vpnInfo.status?.state ?? 'disconnected';
  const isConnected = vpnState === 'connected';
  const isTransitioning = vpnState === 'connecting' || vpnState === 'disconnecting';

  const value = useMemo(() => ({
    vpnInfo,
    vpnState,
    isConnected,
    isTransitioning,
    refreshStatus,
  }), [vpnInfo, vpnState, isConnected, isTransitioning, refreshStatus]);

  return <VPNStateContext.Provider value={value}>{children}</VPNStateContext.Provider>;
}

export function useVPNState() {
  const context = useContext(VPNStateContext);
  if (!context) throw new Error('useVPNState must be used within VPNStateProvider');
  return context;
}
