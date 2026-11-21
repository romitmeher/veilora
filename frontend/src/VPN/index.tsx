import { Button, Callout, HTMLSelect, Switch, Tag, InputGroup } from '@blueprintjs/core';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { AppToaster } from '@/common/toaster';
import { StatusText } from '@/components/StatusText';
import { useVPNState } from '@/context/VPNStateContext';
import {
  VPNConnectBest,
  VPNConnectToServer,
  VPNDisconnect,
  VPNAvailableEngines,
  VPNGetDNSResolver,
  VPNSetDNSResolver,
} from 'wails/go/app/App';

import { ServerList } from './ServerList';
import type { VPNServer } from './ServerList';

import './index.css';

type EngineType = 'openvpn' | 'softether';

function stateLabel(state: string): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
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

  const [engine, setEngine] = useState<EngineType>('openvpn');
  const [availableEngines, setAvailableEngines] = useState<EngineType[]>([]);
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState(false);
  const [country, setCountry] = useState('');
  const [autoSelect, setAutoSelect] = useState(true);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [dnsProtect, setDnsProtect] = useState(true);
  const [dnsResolver, setDnsResolver] = useState('1.1.1.1');
  const [editingDns, setEditingDns] = useState(false);
  const [dnsDraft, setDnsDraft] = useState('');
  const [dnsSaving, setDnsSaving] = useState(false);

  const loadEngines = useCallback(async () => {
    setEnginesLoading(true);
    setEnginesError(false);
    try {
      const engines = await VPNAvailableEngines();
      const supported = (engines ?? [])
        .filter((value): value is EngineType => value === 'openvpn' || value === 'softether')
        .sort();
      setAvailableEngines(supported);
      if (supported.length) setEngine(supported[0]);
    } catch {
      setAvailableEngines([]);
      setEnginesError(true);
    } finally {
      setEnginesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEngines();

    VPNGetDNSResolver()
      .then((r: string) => {
        if (r) setDnsResolver(r);
      })
      .catch(() => {});
  }, [loadEngines]);

  const handleConnect = useCallback(async () => {
    try {
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
  }, [autoSelect, country, engine, killSwitch, dnsProtect, selectedServer, t]);

  const handleDisconnect = useCallback(async () => {
    try {
      await VPNDisconnect();
    } catch (err) {
      AppToaster.show({ message: t('vpn.disconnectError', { error: err }), intent: 'danger' });
    }
  }, [t]);

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

  const canAct = !isTransitioning;
  const statusClass = `vpn-status vpn-status--${vpnState}`;

  return (
    <div className="vpn">
      {!isConnected && (enginesLoading || enginesError || availableEngines.length === 0) && (
        <Callout
          className="vpn-readiness"
          intent={enginesLoading ? 'none' : 'warning'}
          title={t(
            enginesLoading
              ? 'vpn.feedback.checking'
              : enginesError
                ? 'vpn.feedback.engineError'
                : 'vpn.feedback.noEngine',
          )}
        >
          {!enginesLoading && (
            <>
              <p>{t('vpn.feedback.installEngine')}</p>
              <Button icon="refresh" onClick={loadEngines}>
                {t('vpn.feedback.retry')}
              </Button>
            </>
          )}
        </Callout>
      )}
      {/* Status card */}
      <div className={statusClass}>
        <div className="vpn-status__header">
          <div className="vpn-status__indicator" />
          <span className="vpn-status__label" role="status">
            <StatusText>{stateLabel(vpnState)}</StatusText>
          </span>
          {isConnected && vpnInfo.serverHostName && (
            <div className="vpn-status__meta">
              <div>{vpnInfo.serverHostName}</div>
              <div>
                {vpnInfo.countryLong} · {vpnInfo.engine?.toUpperCase()}
              </div>
            </div>
          )}
        </div>
        {vpnInfo.status?.message ? <div className="vpn-status__message">{vpnInfo.status.message}</div> : null}
      </div>

      {/* Controls */}
      <div className="vpn-controls">
        <Tag size="large" intent="primary" fill className="vpn-controls__header">
          {t('vpn.controls.title')}
        </Tag>
        <div className="vpn-controls__body">
          {/* Engine */}
          <div className="vpn-controls__row">
            <label htmlFor="vpn-engine">{t('vpn.controls.engine')}</label>
            <HTMLSelect
              id="vpn-engine"
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineType)}
              disabled={!canAct || isConnected}
              className="vpn-controls__select"
            >
              {availableEngines.includes('openvpn') && <option value="openvpn">OpenVPN</option>}
              {availableEngines.includes('softether') && <option value="softether">SoftEther</option>}
              {!availableEngines.includes('openvpn') && !availableEngines.includes('softether') && (
                <option value="openvpn">OpenVPN (not found)</option>
              )}
            </HTMLSelect>
          </div>

          {/* Country */}
          <div className="vpn-controls__row">
            <label htmlFor="vpn-country">{t('vpn.controls.country')}</label>
            <InputGroup
              id="vpn-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder={t('vpn.controls.countryPlaceholder')}
              disabled={!canAct || isConnected}
              style={{ maxWidth: 80 }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--bp-text-muted-color)' }}>
              {t('vpn.controls.countryHint')}
            </span>
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

          {/* Kill switch */}
          <div className="vpn-controls__switch-row">
            <label>{t('vpn.controls.killSwitch')}</label>
            <Switch
              aria-label={t('vpn.controls.killSwitch')}
              checked={killSwitch}
              onChange={(e) => setKillSwitch(e.currentTarget.checked)}
              disabled={!canAct || isConnected}
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

      {/* Manual server list */}
      {!autoSelect && !isConnected && (
        <ServerList
          selectedHost={selectedServer?.hostName ?? ''}
          onSelect={setSelectedServer}
          disabled={!canAct || isConnected}
        />
      )}

      {/* Connect / Disconnect button */}
      <Button
        fill
        size="large"
        intent={isConnected ? 'danger' : 'success'}
        className="vpn-connect-btn"
        loading={isTransitioning}
        disabled={
          isTransitioning ||
          (!isConnected &&
            (enginesLoading || !availableEngines.includes(engine) || (!autoSelect && !selectedServer) || editingDns))
        }
        onClick={isConnected ? handleDisconnect : handleConnect}
      >
        {isConnected
          ? t('vpn.disconnect')
          : autoSelect
            ? t('vpn.connectBest')
            : selectedServer
              ? t('vpn.connectTo', { host: selectedServer.hostName })
              : t('vpn.connectBest')}
      </Button>
    </div>
  );
}
