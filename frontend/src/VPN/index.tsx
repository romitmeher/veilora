import { Button, HTMLSelect, Switch, Tag, InputGroup, ProgressBar, Icon } from '@blueprintjs/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AppToaster } from '@/common/toaster';
import { StatusText } from '@/components/StatusText';
import { useVPNState } from '@/context/VPNStateContext';
import {
  VPNConnectBest,
  VPNConnectToServer,
  VPNDisconnect,
  VPNAvailableEngines,
  VPNEngineAvailability,
  VPNInstallEngine,
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
      return 'Error';
    default:
      return 'Disconnected';
  }
}

export function VPN() {
  const { t } = useTranslation();
  const { vpnInfo, vpnState, isConnected, isTransitioning } = useVPNState();

  // The bundled OpenVPN engine works without a separate client installation.
  const [engine, setEngine] = useState<EngineType>('openvpn');
  const [availableEngines, setAvailableEngines] = useState<EngineType[]>([]);
  const [engineStatuses, setEngineStatuses] = useState<Record<EngineType, string>>({
    openvpn: 'Checking...',
    softether: 'Checking...',
  });
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState(false);
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [autoSelect, setAutoSelect] = useState(true);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serversError, setServersError] = useState(false);
  const serverRequestId = useRef(0);
  const killSwitch = false;
  const [dnsProtect, setDnsProtect] = useState(true);
  const [dnsResolver, setDnsResolver] = useState('1.1.1.1');
  const [editingDns, setEditingDns] = useState(false);
  const [dnsDraft, setDnsDraft] = useState('');
  const [dnsSaving, setDnsSaving] = useState(false);

  // Auto-connect on launch configuration for the bundled OpenVPN engine.
  const [autoConnectEngine, setAutoConnectEngine] = useState<'openvpn' | 'off'>(() => {
    return (localStorage.getItem('veilora_vpn_autoconnect') as 'openvpn' | 'off') || 'off';
  });

  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<{
    stage: string;
    percent: number;
    message: string;
  }>({
    stage: '',
    percent: 0,
    message: '',
  });

  const loadEngines = useCallback(async () => {
    setEnginesLoading(true);
    setEnginesError(false);
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
      // Prefer OpenVPN as the default engine since it works dynamically out of the box.
      if (supported.length > 0) {
        setEngine((prev) => {
          if (supported.includes(prev)) return prev;
          return supported.includes('openvpn') ? 'openvpn' : supported[0];
        });
      }
    } catch {
      setAvailableEngines([]);
      setEnginesError(true);
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
        AppToaster.show({ message: data.message || 'Installation failed', intent: 'danger' });
      }
    });
    return cancel;
  }, [loadEngines, vpnState]);

  const handleInstallEngine = async (targetEngine: EngineType = 'softether') => {
    setInstalling(true);
    const engineLabel = targetEngine === 'softether' ? 'SoftEther VPN Gate Plug-in' : 'OpenVPN';
    setInstallProgress({ stage: 'starting', percent: 10, message: `Starting ${engineLabel} setup...` });
    try {
      if (targetEngine === 'softether') {
        await VPNProvisionSoftEther();
      } else {
        await VPNInstallEngine(targetEngine);
      }
      await loadEngines();
    } catch (err) {
      setInstalling(false);
      AppToaster.show({
        message: `Install failed: ${err instanceof Error ? err.message : String(err)}`,
        intent: 'danger',
      });
    }
  };

  const loadServers = useCallback(async (countryFilter: string, refresh = false) => {
    const id = ++serverRequestId.current;
    setServersLoading(true);
    setServersError(false);
    try {
      if (refresh) await VPNRefreshServers();
      const result = await VPNGetServers(countryFilter, true);
      if (id === serverRequestId.current) {
        setServers(result ?? []);
      }
    } catch {
      if (id === serverRequestId.current) {
        setServers([]);
        setServersError(true);
      }
    } finally {
      if (id === serverRequestId.current) setServersLoading(false);
    }
  }, []);

  const invalidateServerRequests = useCallback(() => {
    serverRequestId.current++;
  }, []);

  useEffect(() => {
    loadServers(country);
    return invalidateServerRequests;
  }, [loadServers, invalidateServerRequests, country]);

  useEffect(() => {
    loadEngines();

    VPNGetCountries()
      .then((values: string[]) => setCountries((values ?? []).sort()))
      .catch(() => setCountries([]));

    VPNGetDNSResolver()
      .then((r: string) => {
        if (r) setDnsResolver(r);
      })
      .catch(() => {});

    // Check autostart preference on app launch
    const saved = localStorage.getItem('veilora_vpn_autoconnect');
    if (saved === 'openvpn' && vpnState === 'disconnected') {
      VPNAvailableEngines().then((avail) => {
        const preferred = avail?.includes('softether') ? 'softether' : avail?.includes('openvpn') ? 'openvpn' : null;
        if (preferred) {
          VPNConnectBest('', preferred, false, true).catch(() => {});
        }
      });
    }
  }, [loadEngines, vpnState]);

  const handleConnect = useCallback(async () => {
    try {
      if (!availableEngines.includes(engine)) {
        AppToaster.show({
          message: `${engine === 'softether' ? 'Veilora VPN' : 'OpenVPN'} runtime is not ready. No VPN connection was attempted.`,
          intent: 'warning',
        });
        return;
      }
      if (autoSelect) {
        await VPNConnectBest(country, engine, killSwitch, dnsProtect);
      } else {
        if (!selectedServer) {
          AppToaster.show({ message: t('vpn.noServerSelected'), intent: 'warning' });
          return;
        }
        await VPNConnectToServer(selectedServer.hostName, engine, killSwitch, dnsProtect);
      }
    } catch (err) {
      AppToaster.show({ message: t('vpn.connectError', { error: err }), intent: 'danger' });
    }
  }, [availableEngines, engine, autoSelect, country, killSwitch, dnsProtect, selectedServer, t]);

  const handleDisconnect = useCallback(async () => {
    try {
      await VPNDisconnect();
    } catch (err) {
      AppToaster.show({ message: t('vpn.disconnectError', { error: err }), intent: 'danger' });
    }
  }, [t]);

  const handleToggleAutoConnect = () => {
    const target = 'openvpn';
    const next = autoConnectEngine === target ? 'off' : target;
    setAutoConnectEngine(next);
    localStorage.setItem('veilora_vpn_autoconnect', next);
    AppToaster.show({
      message: next === 'off' ? 'Auto-connect on launch disabled' : 'Auto-connect on launch set to OpenVPN',
      intent: 'primary',
    });
  };

  const handleDnsResolverSave = async () => {
    setDnsSaving(true);
    try {
      await VPNSetDNSResolver(dnsDraft.trim());
      setDnsResolver(await VPNGetDNSResolver());
      setEditingDns(false);
      AppToaster.show({ message: t('vpn.feedback.dnsSaved'), intent: 'success' });
    } catch (error) {
      AppToaster.show({ message: t('vpn.feedback.dnsError', { error }), intent: 'danger' });
    } finally {
      setDnsSaving(false);
    }
  };

  const isConnecting = vpnState === 'preparing' || vpnState === 'connecting' || vpnState === 'reconnecting';
  const canAct = !isTransitioning;
  const statusClass = `vpn-status vpn-status--${vpnState}`;

  return (
    <div className="vpn">
      {/* Engine setup & installer card */}
      {!isConnected && (enginesLoading || enginesError || !availableEngines.includes(engine)) && (
        <div className="vpn-engine-installer-card">
          <div className="vpn-engine-installer-header">
            <div className="vpn-engine-installer-icon">
              <Icon icon="shield" size={24} intent="primary" />
            </div>
            <div className="vpn-engine-installer-title">
              <h3>
                {engine === 'softether' && !availableEngines.includes('softether')
                  ? 'SoftEther VPN Engine Not Installed'
                  : engine === 'openvpn' && !availableEngines.includes('openvpn')
                    ? 'OpenVPN Engine Not Installed'
                    : 'Secure Tunnel Engine Required'}
              </h3>
              <p>
                {engine === 'softether' && !availableEngines.includes('softether')
                  ? 'SoftEther is optional. Select OpenVPN to use the runtime included in standalone Windows builds.'
                  : engine === 'openvpn' && !availableEngines.includes('openvpn')
                    ? 'This build has no usable bundled OpenVPN runtime. Windows policy MSI 1625 blocks external OpenVPN installation.'
                    : 'Veilora requires a tunneling engine (SoftEther VPN Gate client plug-in or OpenVPN) to encrypt and route your traffic.'}
              </p>
            </div>
          </div>

          {/* Academic volunteer mirror download speed notice */}
          <div className="vpn-engine-note">
            <Icon icon="info-sign" size={14} />
            <span>
              VPN Gate is an academic volunteer network (University of Tsukuba). Mirror downloads (~65 MB) can be slow
              due to bandwidth throttling on overseas volunteer nodes.
            </span>
          </div>

          {/* Step-by-step setup guide for SoftEther */}
          {engine === 'softether' && !installing && (
            <div className="vpn-softether-guide">
              <div className="vpn-softether-guide__title">
                <Icon icon="help" size={14} /> Veilora VPN Setup
              </div>
              <ol className="vpn-softether-guide__steps">
                <li>
                  Click <strong>Provision Veilora VPN</strong>; Veilora will request Windows administrator approval.
                </li>
                <li>
                  Veilora uses <strong>SEVPNCLIENT</strong> when installed, otherwise <strong>SEVPNCLIENTDEV</strong>,
                  and configures the <strong>VPN</strong> adapter for <strong>VeiloraVPN</strong>.
                </li>
                <li>Veilora verifies the service, virtual adapter, and native endpoint before reporting ready.</li>
                <li>
                  When finished, click <strong>Check Again</strong> to verify detection.
                </li>
              </ol>
            </div>
          )}

          {installing ? (
            <div className="vpn-engine-installer-progress">
              <div className="vpn-engine-progress-header">
                <span>{installProgress.message || 'Installing engine...'}</span>
                <span>{installProgress.percent}%</span>
              </div>
              <ProgressBar
                value={installProgress.percent / 100}
                intent="primary"
                animate={installProgress.stage !== 'ready'}
                stripes
              />
            </div>
          ) : (
            <div className="vpn-engine-installer-actions">
              {engine === 'softether' && !availableEngines.includes('softether') ? (
                <>
                  <Button
                    intent="primary"
                    icon="download"
                    size="large"
                    onClick={() => handleInstallEngine('softether')}
                    loading={enginesLoading}
                  >
                    Provision Veilora VPN
                  </Button>
                  {availableEngines.includes('openvpn') && (
                    <Button intent="none" icon="shield" size="large" onClick={() => setEngine('openvpn')}>
                      Use OpenVPN (Ready)
                    </Button>
                  )}
                </>
              ) : engine === 'openvpn' && !availableEngines.includes('openvpn') ? (
                <>
                  <Tag intent="danger" size="large" fill>
                    OpenVPN runtime not bundled
                  </Tag>
                  {availableEngines.includes('softether') && (
                    <Button intent="none" icon="download" size="large" onClick={() => setEngine('softether')}>
                      Use SoftEther (Installed)
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Tag intent="none">Select an available engine</Tag>
                </>
              )}
              <Button icon="refresh" variant="minimal" onClick={loadEngines}>
                Check Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Status card with Fluid Functionalism pulse animation */}
      <div className={statusClass}>
        <div className="vpn-status__header">
          <div className="vpn-status__left">
            <div className="vpn-status__indicator" />
            <span className="vpn-status__label" role="status">
              <StatusText>{stateLabel(vpnState)}</StatusText>
            </span>
          </div>
          <div className="vpn-status__right">
            {isConnected && vpnInfo.serverHostName && (
              <div className="vpn-status__meta">
                <div>{vpnInfo.serverHostName}</div>
                <div>
                  {vpnInfo.countryLong} · {vpnInfo.engine?.toUpperCase()}
                </div>
              </div>
            )}
            <div className="vpn-status__actions">
              <Button
                intent={isConnected ? 'danger' : 'success'}
                loading={isTransitioning && !isConnecting}
                disabled={
                  (isTransitioning && !isConnecting) ||
                  (!isConnected && (enginesLoading || (!autoSelect && !selectedServer) || editingDns))
                }
                onClick={isConnected ? handleDisconnect : handleConnect}
              >
                {isConnected
                  ? t('vpn.disconnect')
                  : isConnecting
                    ? 'Connecting…'
                    : autoSelect
                      ? t('vpn.connectBest')
                      : selectedServer
                        ? t('vpn.connectTo', { host: selectedServer.hostName })
                        : t('vpn.connectBest')}
              </Button>
              {isConnecting && (
                <Button
                  intent="danger"
                  variant="outlined"
                  icon="cross"
                  onClick={handleDisconnect}
                  title="Cancel connection attempt"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
        {vpnInfo.status?.message ? <div className="vpn-status__message">{vpnInfo.status.message}</div> : null}
      </div>

      {/* Controls */}
      <div className="vpn-controls">
        <Tag size="large" intent="primary" fill className="vpn-controls__header">
          {t('vpn.controls.title')}
        </Tag>
        <div className="vpn-controls__body">
          {/* Engine selection */}
          <div className="vpn-controls__row">
            <label htmlFor="vpn-engine">{t('vpn.controls.engine')}</label>
            <HTMLSelect
              id="vpn-engine"
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineType)}
              disabled={!canAct || isConnected}
              className="vpn-controls__select"
            >
              <option value="openvpn">
                OpenVPN ({availableEngines.includes('openvpn') ? 'Ready' : engineStatuses.openvpn})
              </option>
              <option value="softether">
                SoftEther ({availableEngines.includes('softether') ? 'Ready' : engineStatuses.softether})
              </option>
            </HTMLSelect>
          </div>

          {/* Country */}
          <div className="vpn-controls__row">
            <label htmlFor="vpn-country">{t('vpn.controls.country')}</label>
            <HTMLSelect
              id="vpn-country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setSelectedServer(null);
              }}
              disabled={!canAct || isConnected}
              className="vpn-controls__select"
            >
              <option value="">Any country</option>
              {countries.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </HTMLSelect>
          </div>

          {/* Server selection */}
          <div className="vpn-controls__row">
            <label htmlFor="vpn-server">Server</label>
            <HTMLSelect
              id="vpn-server"
              value={autoSelect ? '' : (selectedServer?.hostName ?? '')}
              onChange={(e) => {
                const host = e.target.value;
                if (!host) {
                  setAutoSelect(true);
                  setSelectedServer(null);
                } else {
                  const match = servers.find((s) => s.hostName === host) ?? null;
                  setSelectedServer(match);
                  setAutoSelect(false);
                }
              }}
              disabled={!canAct || isConnected || serversLoading}
              className="vpn-controls__select"
            >
              <option value="">Auto-select (Best server)</option>
              {servers.slice(0, 80).map((s) => (
                <option key={s.hostName} value={s.hostName}>
                  {s.hostName} ({s.countryShort || s.countryLong}
                  {s.ping > 0 ? ` · ${s.ping}ms` : ''})
                </option>
              ))}
            </HTMLSelect>
          </div>

          {/* Auto-select toggle */}
          <div className="vpn-controls__switch-row">
            <label>{t('vpn.controls.autoSelect')}</label>
            <Switch
              aria-label={t('vpn.controls.autoSelect')}
              checked={autoSelect}
              onChange={(e) => setAutoSelect(e.currentTarget.checked)}
              disabled={!canAct || isConnected}
              inline
            />
          </div>

          {/* Auto-connect on startup option for OpenVPN */}
          <div className="vpn-controls__switch-row">
            <label>Auto-connect via OpenVPN on launch</label>
            <Switch
              aria-label="Auto-connect via OpenVPN on launch"
              checked={autoConnectEngine === 'openvpn'}
              onChange={handleToggleAutoConnect}
              disabled={!canAct || isConnected}
              inline
            />
          </div>

          {/* Kill switch */}
          <div className="vpn-controls__switch-row">
            <label>{t('vpn.controls.killSwitch')} — unavailable</label>
            <Switch
              aria-label={t('vpn.controls.killSwitch')}
              checked={killSwitch}
              disabled
              title="Unavailable: tunnel-aware protection is not implemented"
              inline
            />
          </div>

          {/* DNS protection */}
          <div className="vpn-controls__switch-row">
            <label>{t('vpn.controls.dnsProtection')}</label>
            <Switch
              aria-label={t('vpn.controls.dnsProtection')}
              checked={dnsProtect}
              onChange={(e) => setDnsProtect(e.currentTarget.checked)}
              disabled={!canAct || isConnected}
              inline
            />
          </div>

          {/* DNS resolver (visible when DNS protect is on) */}
          {dnsProtect && (
            <div className="vpn-controls__dns-resolver">
              <span style={{ fontSize: '0.78rem', color: 'var(--bp-text-muted-color)' }}>
                {t('vpn.controls.resolver')}:
              </span>
              {editingDns ? (
                <>
                  <InputGroup
                    aria-label={t('vpn.controls.resolver')}
                    value={dnsDraft}
                    disabled={dnsSaving}
                    onChange={(e) => setDnsDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDnsResolverSave()}
                    small
                    style={{ maxWidth: 140 }}
                    autoFocus
                  />
                  <Button size="small" intent="primary" loading={dnsSaving} onClick={handleDnsResolverSave}>
                    {t('vpn.controls.save')}
                  </Button>
                  <Button size="small" disabled={dnsSaving} onClick={() => setEditingDns(false)}>
                    {t('vpn.feedback.cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <code style={{ fontSize: '0.78rem' }}>{dnsResolver}</code>
                  <Button
                    size="small"
                    variant="minimal"
                    icon="edit"
                    aria-label={t('vpn.controls.resolver')}
                    disabled={isConnected}
                    onClick={() => {
                      setDnsDraft(dnsResolver);
                      setEditingDns(true);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Server list */}
      {!isConnected && (
        <ServerList
          servers={servers}
          loading={serversLoading}
          loadError={serversError}
          onRefresh={() => loadServers(country, true)}
          selectedHost={autoSelect ? '' : (selectedServer?.hostName ?? '')}
          onSelect={(server) => {
            setSelectedServer(server);
            setAutoSelect(false);
          }}
          disabled={!canAct || isConnected}
        />
      )}

      {/* Connect / Disconnect / Cancel button group */}
      <div className="vpn-connect-group">
        <Button
          fill
          size="large"
          intent={isConnected ? 'danger' : 'success'}
          className="vpn-connect-btn"
          loading={isTransitioning && !isConnecting}
          disabled={
            (isTransitioning && !isConnecting) ||
            (!isConnected && (enginesLoading || (!autoSelect && !selectedServer) || editingDns))
          }
          onClick={isConnected ? handleDisconnect : handleConnect}
        >
          {isConnected
            ? t('vpn.disconnect')
            : isConnecting
              ? 'Connecting…'
              : autoSelect
                ? t('vpn.connectBest')
                : selectedServer
                  ? t('vpn.connectTo', { host: selectedServer.hostName })
                  : t('vpn.connectBest')}
        </Button>
        {isConnecting && (
          <Button
            size="large"
            intent="danger"
            icon="cross"
            className="vpn-cancel-btn"
            onClick={handleDisconnect}
            title="Cancel connection attempt"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
