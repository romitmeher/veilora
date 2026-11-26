import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo, useRef } from 'react';

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

export type PendingVPNAction = 'connecting' | 'disconnecting' | null;
export type VPNEngine = 'openvpn' | 'softether';

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
  engine: VPNEngine;
  setEngine: (engine: VPNEngine) => void;
  isConnected: boolean;
  isTransitioning: boolean;
  pendingAction: PendingVPNAction;
  setPendingAction: (action: PendingVPNAction) => void;
  connectedSeconds: number;
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
  const [engine, setEngine] = useState<VPNEngine>('openvpn');
  const [pendingAction, setPendingAction] = useState<PendingVPNAction>(null);
  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const connectedSinceRef = useRef<number | null>(null);

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
      if (info) {
        setVpnInfo(normalizeInfo(info));
        setPendingAction(null);
      }
    });
    return cancel;
  }, [refreshStatus]);

  const rawVpnState = vpnInfo.status?.state ?? 'disconnected';
  const vpnState: VPNState =
    pendingAction && (rawVpnState === 'disconnected' || rawVpnState === 'connected' || rawVpnState === 'error')
      ? pendingAction
      : rawVpnState;
  const isConnected = rawVpnState === 'connected' && pendingAction !== 'disconnecting';
  const isTransitioning =
    pendingAction !== null ||
    rawVpnState === 'preparing' ||
    rawVpnState === 'connecting' ||
    rawVpnState === 'reconnecting' ||
    rawVpnState === 'disconnecting';

  useEffect(() => {
    if (rawVpnState !== 'connected') {
      connectedSinceRef.current = null;
      setConnectedSeconds(0);
      return;
    }

    if (connectedSinceRef.current === null) {
      connectedSinceRef.current = Date.now();
    }

    const updateElapsed = () => {
      if (connectedSinceRef.current !== null) {
        setConnectedSeconds(Math.floor((Date.now() - connectedSinceRef.current) / 1000));
      }
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [rawVpnState]);

  const value = useMemo(
    () => ({
      vpnInfo,
      vpnState,
      engine,
      setEngine,
      isConnected,
      isTransitioning,
      pendingAction,
      setPendingAction,
      connectedSeconds,
      refreshStatus,
    }),
    [vpnInfo, vpnState, engine, isConnected, isTransitioning, pendingAction, connectedSeconds, refreshStatus],
  );

  return <VPNStateContext.Provider value={value}>{children}</VPNStateContext.Provider>;
}

export function useVPNState() {
  const context = useContext(VPNStateContext);
  if (!context) {
    return {
      vpnInfo: defaultInfo,
      vpnState: 'disconnected' as VPNState,
      engine: 'openvpn' as VPNEngine,
      setEngine: () => {},
      isConnected: false,
      isTransitioning: false,
      pendingAction: null as PendingVPNAction,
      setPendingAction: () => {},
      connectedSeconds: 0,
      refreshStatus: () => {},
    };
  }
  return context;
}
