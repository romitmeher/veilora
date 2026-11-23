import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';

import { VPNGetStatus } from 'wails/go/app/App';
import { vpn } from 'wails/go/models';
import { EventsOn } from 'wails/runtime/runtime';

export type VPNState =
  | 'disconnected'
  | 'preparing'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

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

function normalizeInfo(info: vpn.ConnectionInfo): VPNConnectionInfo {
  const state = info.status?.state;
  const knownState: VPNState =
    state === 'connected' ||
    state === 'preparing' ||
    state === 'connecting' ||
    state === 'reconnecting' ||
    state === 'disconnecting' ||
    state === 'disconnected' ||
    state === 'error'
      ? state
      : 'error';
  return { ...info, status: { state: knownState, message: info.status?.message ?? '' } };
}

export function VPNStateProvider({ children }: { children: ReactNode }) {
  const [vpnInfo, setVpnInfo] = useState<VPNConnectionInfo>(defaultInfo);

  const refreshStatus = useCallback(() => {
    VPNGetStatus()
      .then((info) => {
        if (info) setVpnInfo(normalizeInfo(info));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStatus();
    const cancel = EventsOn('vpn:statusChanged', (info: vpn.ConnectionInfo) => {
      if (info) setVpnInfo(normalizeInfo(info));
    });
    return cancel;
  }, [refreshStatus]);

  const vpnState = vpnInfo.status?.state ?? 'disconnected';
  const isConnected = vpnState === 'connected';
  const isTransitioning =
    vpnState === 'preparing' ||
    vpnState === 'connecting' ||
    vpnState === 'reconnecting' ||
    vpnState === 'disconnecting';

  const value = useMemo(
    () => ({
      vpnInfo,
      vpnState,
      isConnected,
      isTransitioning,
      refreshStatus,
    }),
    [vpnInfo, vpnState, isConnected, isTransitioning, refreshStatus],
  );

  return <VPNStateContext.Provider value={value}>{children}</VPNStateContext.Provider>;
}

export function useVPNState() {
  const context = useContext(VPNStateContext);
  if (!context) {
    return {
      vpnInfo: defaultInfo,
      vpnState: 'disconnected' as VPNState,
      isConnected: false,
      isTransitioning: false,
      refreshStatus: () => {},
    };
  }
  return context;
}
