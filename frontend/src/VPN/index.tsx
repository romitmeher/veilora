import { Button, HTMLSelect, Switch, Tag, InputGroup } from '@blueprintjs/core';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { AppToaster } from '@/common/toaster';
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
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting…';
    case 'disconnecting': return 'Disconnecting…';
    case 'error': return 'Error';
    default: return 'Disconnected';
  }
}

export function VPN() {
  const { t } = useTranslation();
  const { vpnInfo, vpnState, isConnected, isTransitioning } = useVPNState();

  const [engine, setEngine] = useState<EngineType>('openvpn');
  const [availableEngines, setAvailableEngines] = useState<EngineType[]>(['openvpn']);
  const [country, setCountry] = useState('');
  const [autoSelect, setAutoSelect] = useState(true);
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [dnsProtect, setDnsProtect] = useState(true);
  const [dnsResolver, setDnsResolver] = useState('1.1.1.1');
  const [editingDns, setEditingDns] = useState(false);

  useEffect(() => {
    VPNAvailableEngines()
      .then((engines: EngineType[]) => {
        if (engines?.length) setAvailableEngines(engines);
      })
      .catch(() => {});

    VPNGetDNSResolver()
      .then((r: string) => { if (r) setDnsResolver(r); })
      .catch(() => {});
  }, []);

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

  const handleDnsResolverSave = () => {
    VPNSetDNSResolver(dnsResolver);
    setEditingDns(false);
  };

  const canAct = !isTransitioning;
  const statusClass = `vpn-status vpn-status--${vpnState}`;

  return (
    <div className="vpn">
      {/* Status card */}
      <div className={statusClass}>
        <div className="vpn-status__header">
          <div className="vpn-status__indicator" />
          <span className="vpn-status__label">{stateLabel(vpnState)}</span>
          {isConnected && vpnInfo.serverHostName && (
            <div className="vpn-status__meta">
              <div>{vpnInfo.serverHostName}</div>
              <div>{vpnInfo.countryLong} · {vpnInfo.engine?.toUpperCase()}</div>
            </div>
          )}
        </div>
        {vpnInfo.status?.message ? (
          <div className="vpn-status__message">{vpnInfo.status.message}</div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="vpn-controls">
        <Tag size="large" intent="primary" fill className="vpn-controls__header">
          {t('vpn.controls.title')}
        </Tag>
        <div className="vpn-controls__body">

          {/* Engine */}
          <div className="vpn-controls__row">
            <label>{t('vpn.controls.engine')}</label>
            <HTMLSelect
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineType)}
              disabled={!canAct || isConnected}
              className="vpn-controls__select"
            >
              {availableEngines.includes('openvpn') && (
                <option value="openvpn">OpenVPN</option>
              )}
              {availableEngines.includes('softether') && (
                <option value="softether">SoftEther</option>
              )}
              {!availableEngines.includes('openvpn') && !availableEngines.includes('softether') && (
                <option value="openvpn">OpenVPN (not found)</option>
              )}
            </HTMLSelect>
          </div>

          {/* Country */}
          <div className="vpn-controls__row">
            <label>{t('vpn.controls.country')}</label>
            <InputGroup
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
                    value={dnsResolver}
                    onChange={(e) => setDnsResolver(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDnsResolverSave()}
                    small
                    style={{ maxWidth: 140 }}
                    autoFocus
                  />
                  <Button size="small" intent="primary" onClick={handleDnsResolverSave}>
                    {t('vpn.controls.save')}
                  </Button>
                </>
              ) : (
                <>
                  <code style={{ fontSize: '0.78rem' }}>{dnsResolver}</code>
                  <Button
                    size="small"
                    variant="minimal"
                    icon="edit"
                    disabled={isConnected}
                    onClick={() => setEditingDns(true)}
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
        disabled={!canAct && !isConnected}
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
