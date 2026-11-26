import { Button, InputGroup, ProgressBar, Icon, Collapse } from '@blueprintjs/core';
import { useState, useEffect, useCallback, useRef } from 'react';

import { AppToaster } from '@/common/toaster';
import { FluidCopyButton } from '@/components/FluidCopyButton';
import { FluidSwitch } from '@/components/FluidSwitch';
import { OfficialFlag } from '@/components/OfficialFlag';
import { SessionTimer } from '@/components/SessionTimer';
import { StatusText } from '@/components/StatusText';
import { useVPNState } from '@/context/VPNStateContext';
import {
  VPNConnectBest,
  VPNConnectToServer,
  VPNDisconnect,
  VPNAvailableEngines,
  VPNEngineAvailability,
  VPNProvisionSoftEther,
  VPNGetDNSResolver,
  VPNSetDNSResolver,
  VPNGetCountries,
  VPNGetServers,
  VPNRefreshServers,
} from 'wails/go/app/App';
import { EventsOn } from 'wails/runtime/runtime';

import { ServerList } from './ServerList';
import type { VPNServer } from './ServerList';

import './index.css';

type EngineType = 'openvpn' | 'softether';

function stateLabel(state: string): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'preparing':
      return 'Preparing…';
    case 'connecting':
      return 'Connecting…';
    case 'reconnecting':
      return 'Reconnecting…';
    case 'disconnecting':
      return 'Disconnecting…';
    case 'error':
      return 'Connection Error';
    default:
      return 'Disconnected';
  }
}

export function VPN() {
  const { vpnInfo, vpnState, engine, setEngine, isConnected, isTransitioning, setPendingAction, connectedSeconds } =
    useVPNState();

  const [availableEngines, setAvailableEngines] = useState<EngineType[]>([]);
  const [engineStatuses, setEngineStatuses] = useState<Record<EngineType, string>>({
    openvpn: 'Checking…',
    softether: 'Checking…',
  });
  const [enginesLoading, setEnginesLoading] = useState(true);

  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [autoSelect, setAutoSelect] = useState(true);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState(false);
  const serverRequestId = useRef(0);

  const [dnsProtect, setDnsProtect] = useState(true);
  const [dnsResolver, setDnsResolver] = useState('1.1.1.1');
  const [editingDns, setEditingDns] = useState(false);
  const [dnsDraft, setDnsDraft] = useState('');
  const [dnsSaving, setDnsSaving] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [autoConnectEngine, setAutoConnectEngine] = useState<'openvpn' | 'off'>(() => {
    return (localStorage.getItem('veilora_vpn_autoconnect') as 'openvpn' | 'off') || 'off';
  });

  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<{
    stage: string;
    percent: number;
    message: string;
  }>({ stage: '', percent: 0, message: '' });

  const loadEngines = useCallback(async () => {
    setEnginesLoading(true);
    try {
      let engines: EngineType[] = [];
      try {
        const availability = await VPNEngineAvailability();
        engines = (availability ?? []).filter((item) => item.ready).map((item) => item.engine as EngineType);
        setEngineStatuses((prev) => {
          const next = { ...prev };
          for (const item of availability ?? []) {
            if (item.engine === 'openvpn' || item.engine === 'softether') {
              next[item.engine] = item.ready ? 'Ready' : item.message;
            }
          }
          return next;
        });
      } catch {
        engines = await VPNAvailableEngines();
      }
      const supported = (engines ?? []).filter(
        (value): value is EngineType => value === 'openvpn' || value === 'softether',
      );
      setAvailableEngines(supported);
    } catch {
      setAvailableEngines([]);
    } finally {
      setEnginesLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancel = EventsOn('vpn:engine:progress', (data: { stage: string; percent: number; message: string }) => {
      setInstallProgress(data);
      if (data.stage === 'ready') {
        setInstalling(false);
        AppToaster.show({ message: 'VPN engine installed successfully!', intent: 'success' });
        loadEngines();
      } else if (data.stage === 'error') {
        setInstalling(false);
        AppToaster.show({ message: `Install failed: ${data.message}`, intent: 'danger' });
      }
    });
    return cancel;
  }, [loadEngines]);

  const loadCountries = useCallback(async () => {
    try {
      const list = await VPNGetCountries();
      setCountries(list ?? []);
    } catch {
      setCountries([]);
    }
  }, []);

  const loadServers = useCallback(async (c: string, refresh = false) => {
    const reqId = ++serverRequestId.current;
    setServersLoading(true);
    setServersError(false);
    try {
      if (refresh) {
        await VPNRefreshServers();
      }
      const list = await VPNGetServers(c, false);
      if (reqId === serverRequestId.current) {
        setServers(list ?? []);
      }
    } catch {
      if (reqId === serverRequestId.current) {
        setServersError(true);
      }
    } finally {
      if (reqId === serverRequestId.current) {
        setServersLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadEngines();
    loadCountries();
    VPNGetDNSResolver().then((val) => {
      if (val) setDnsResolver(val);
    });
  }, [loadEngines, loadCountries]);

  useEffect(() => {
    loadServers(country);
  }, [country, loadServers]);

  const handleConnect = async () => {
    setPendingAction('connecting');
    try {
      if (autoSelect || !selectedServer) {
        await VPNConnectBest(country, engine, false, dnsProtect);
      } else {
        await VPNConnectToServer(selectedServer.ip, engine, false, dnsProtect);
      }
    } catch (err: unknown) {
      setPendingAction(null);
      AppToaster.show({
        message: err instanceof Error ? err.message : String(err),
        intent: 'danger',
      });
    }
  };

  const handleDisconnect = async () => {
    setPendingAction('disconnecting');
    try {
      await VPNDisconnect();
    } catch (err: unknown) {
      setPendingAction(null);
      AppToaster.show({
        message: err instanceof Error ? err.message : String(err),
        intent: 'danger',
      });
    }
  };

  const handleProvisionSoftEther = async () => {
    setInstalling(true);
    setInstallProgress({ stage: 'provisioning', percent: 25, message: 'Creating SoftEther adapter…' });
    try {
      await VPNProvisionSoftEther();
      AppToaster.show({ message: 'SoftEther adapter configured successfully!', intent: 'success' });
      await loadEngines();
    } catch (err: unknown) {
      AppToaster.show({
        message: err instanceof Error ? err.message : String(err),
        intent: 'danger',
      });
    } finally {
      setInstalling(false);
    }
  };

  const isConnecting = vpnState === 'preparing' || vpnState === 'connecting' || vpnState === 'reconnecting';

  return (
    <div className="vpn-container">
      {/* 1. Primary Dedicated Connection Bar */}
      <section
        className={`vpn-bar ${
          isConnected
            ? 'is-connected'
            : isConnecting
              ? 'is-connecting'
              : vpnState === 'error'
                ? 'is-error'
                : 'is-disconnected'
        }`}
        aria-label="VPN Connection Controls"
      >
        <div className="vpn-bar__left">
          <div className="vpn-bar__indicator" />
          <div className="vpn-bar__status-text">
            <span className="vpn-bar__state">
              <StatusText>{stateLabel(vpnState)}</StatusText>
            </span>
            <span className="vpn-bar__target">
              {isConnected ? (
                <>
                  <OfficialFlag code={vpnInfo.countryShort} title={vpnInfo.countryLong} />
                  <span>{vpnInfo.countryLong || vpnInfo.serverHostName}</span>
                  {vpnInfo.serverIP && (
                    <>
                      <span>·</span>
                      <span className="vpn-bar__ip">{vpnInfo.serverIP}</span>
                      <FluidCopyButton value={vpnInfo.serverIP} label="Copy relay IP" />
                    </>
                  )}
                  <span>·</span>
                  <span className="vpn-bar__timer">
                    <SessionTimer seconds={connectedSeconds} />
                  </span>
                </>
              ) : selectedServer && !autoSelect ? (
                <>
                  <OfficialFlag code={selectedServer.countryShort} title={selectedServer.countryLong} />
                  <span>Target: {selectedServer.hostName}</span>
                </>
              ) : (
                'Target: Automatic (Recommended relay)'
              )}
            </span>
          </div>
        </div>

        <div className="vpn-bar__right">
          {/* Fluid Functionalism Segmented Protocol Switcher */}
          <div className="vpn-protocol-switch" role="group" aria-label="VPN Protocol">
            <button
              type="button"
              className={`vpn-protocol-btn ${engine === 'openvpn' ? 'is-selected' : ''}`}
              disabled={isTransitioning || isConnected}
              onClick={() => setEngine('openvpn')}
            >
              OpenVPN
            </button>
            <button
              type="button"
              className={`vpn-protocol-btn ${engine === 'softether' ? 'is-selected' : ''}`}
              disabled={isTransitioning || isConnected}
              onClick={() => setEngine('softether')}
            >
              SoftEther
            </button>
          </div>

          {/* Primary Action Button */}
          <Button
            intent={isConnected ? 'danger' : 'primary'}
            loading={isTransitioning && !isConnecting}
            disabled={(isTransitioning && !isConnecting) || (!isConnected && !availableEngines.includes(engine))}
            className="vpn-bar__primary-btn"
            onClick={isConnected ? handleDisconnect : handleConnect}
          >
            <StatusText>{isConnected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect'}</StatusText>
          </Button>

          {isConnecting && (
            <Button intent="danger" variant="outlined" icon="cross" onClick={handleDisconnect} title="Cancel">
              Cancel
            </Button>
          )}

          {vpnState === 'error' && availableEngines.includes(engine) && (
            <Button intent="primary" variant="outlined" icon="refresh" onClick={handleConnect}>
              Retry
            </Button>
          )}
        </div>
      </section>

      {/* 2. SoftEther Provisioning Alert (only shown when SoftEther needs setup) */}
      {engine === 'softether' && !availableEngines.includes('softether') && !enginesLoading && (
        <section className="vpn-provision-box" aria-label="Engine Setup Notice">
          <div className="vpn-provision-box__info">
            <strong>SoftEther Virtual Adapter Required</strong>
            <span>{engineStatuses.softether || 'Configure native Neo6 adapter for SoftEther connections.'}</span>
            {installing && (
              <ProgressBar
                intent="primary"
                value={installProgress.percent / 100}
                animate
                style={{ marginTop: '6px' }}
              />
            )}
          </div>
          <Button
            intent="primary"
            icon="wrench"
            loading={installing}
            onClick={handleProvisionSoftEther}
          >
            Provision Adapter
          </Button>
        </section>
      )}

      {/* 3. Server Browser & Table */}
      <ServerList
        servers={servers}
        loading={serversLoading}
        loadError={serversError}
        onRefresh={() => loadServers(country, true)}
        selectedHost={autoSelect ? '' : (selectedServer?.hostName ?? '')}
        onSelect={(s) => {
          setAutoSelect(false);
          setSelectedServer(s);
        }}
        disabled={isTransitioning || isConnected}
        countryFilter={country}
        onCountryFilterChange={(c) => {
          setCountry(c);
          setSelectedServer(null);
          setAutoSelect(true);
        }}
        countries={countries}
      />

      {/* 4. Collapsible Advanced VPN Settings */}
      <section className="vpn-advanced" aria-label="Advanced Settings">
        <button
          type="button"
          className="vpn-advanced__toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <span>Advanced VPN Configuration</span>
          <Icon icon={showAdvanced ? 'chevron-up' : 'chevron-down'} size={14} />
        </button>

        <Collapse isOpen={showAdvanced}>
          <div className="vpn-advanced__content">
            <div className="vpn-advanced__row">
              <div>
                <label htmlFor="vpn-autoselect-switch">Auto-select recommended relay</label>
                <div><span>Connects to highest scoring node if no server is selected</span></div>
              </div>
              <FluidSwitch
                id="vpn-autoselect-switch"
                checked={autoSelect}
                disabled={isTransitioning || isConnected}
                onChange={(checked) => {
                  setAutoSelect(checked);
                  if (checked) setSelectedServer(null);
                }}
              />
            </div>

            <div className="vpn-advanced__row">
              <div>
                <label htmlFor="vpn-autoconnect-switch">Auto-connect on launch</label>
                <div><span>Automatically initiate VPN connection when Veilora starts</span></div>
              </div>
              <FluidSwitch
                id="vpn-autoconnect-switch"
                checked={autoConnectEngine === 'openvpn'}
                onChange={(checked) => {
                  const val = checked ? 'openvpn' : 'off';
                  setAutoConnectEngine(val);
                  localStorage.setItem('veilora_vpn_autoconnect', val);
                }}
              />
            </div>

            <div className="vpn-advanced__row">
              <div>
                <label htmlFor="vpn-dns-protect-switch">DNS Leak Protection</label>
                <div><span>Enforce local resolver overrides to prevent DNS leaks</span></div>
              </div>
              <FluidSwitch
                id="vpn-dns-protect-switch"
                checked={dnsProtect}
                disabled={isTransitioning || isConnected}
                onChange={(checked) => setDnsProtect(checked)}
              />
            </div>

            <div className="vpn-advanced__row">
              <div>
                <label htmlFor="vpn-dns-input">Custom DNS Resolver</label>
                <div><span>Upstream server queried during VPN routing</span></div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <InputGroup
                  id="vpn-dns-input"
                  value={editingDns ? dnsDraft : dnsResolver}
                  disabled={isTransitioning || isConnected || (!editingDns && dnsSaving)}
                  onChange={(e) => setDnsDraft(e.target.value)}
                  onFocus={() => {
                    if (!editingDns) {
                      setDnsDraft(dnsResolver);
                      setEditingDns(true);
                    }
                  }}
                  style={{ width: '130px' }}
                />
                {editingDns && (
                  <Button
                    intent="primary"
                    loading={dnsSaving}
                    onClick={async () => {
                      setDnsSaving(true);
                      try {
                        await VPNSetDNSResolver(dnsDraft.trim());
                        setDnsResolver(dnsDraft.trim());
                        setEditingDns(false);
                      } catch (err: unknown) {
                        AppToaster.show({
                          message: err instanceof Error ? err.message : String(err),
                          intent: 'danger',
                        });
                      } finally {
                        setDnsSaving(false);
                      }
                    }}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Collapse>
      </section>
    </div>
  );
}
