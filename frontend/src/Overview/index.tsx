import { Icon } from '@blueprintjs/core';
import NumberFlow from '@number-flow/react';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';

import { AppToaster } from '@/common/toaster';
import { FilterCommandDialog } from '@/components/FilterCommandDialog';
import { FluidCopyButton } from '@/components/FluidCopyButton';
import { FluidSwitch } from '@/components/FluidSwitch';
import type { AppTab } from '@/components/Navigation';
import { OfficialFlag } from '@/components/OfficialFlag';
import { RulesCommandDialog } from '@/components/RulesCommandDialog';
import { ServerCommandDialog } from '@/components/ServerCommandDialog';
import { SessionTimer } from '@/components/SessionTimer';
import { StatusText } from '@/components/StatusText';
import { useProxyState } from '@/context/ProxyStateContext';
import { useVPNState } from '@/context/VPNStateContext';
import { RequestLog } from '@/RequestLog';
import { StartProxy, StopProxy, VPNConnectBest, VPNDisconnect } from 'wails/go/app/App';
import { GetFilterLists, GetPort, GetRules } from 'wails/go/config/Config';

import './index.css';

export function Overview({ onNavigate }: { onNavigate: (tab: AppTab) => void }) {
  const { proxyState, sessionBlocks } = useProxyState();
  const { vpnInfo, vpnState, engine, setEngine, isConnected, isTransitioning, setPendingAction, connectedSeconds } =
    useVPNState();

  const [filterStats, setFilterStats] = useState({ enabled: 0, total: 0 });
  const [customRulesCount, setCustomRulesCount] = useState(0);
  const [proxyPort, setProxyPort] = useState<number>(8899);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [serversDialogOpen, setServersDialogOpen] = useState(false);

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [lastHoveredCard, setLastHoveredCard] = useState(0);
  const [canSlideCard, setCanSlideCard] = useState(false);

  const refreshFilterStats = useCallback(() => {
    GetFilterLists()
      .then((lists) => {
        const safeLists = lists ?? [];
        setFilterStats({
          enabled: safeLists.filter((l) => l.enabled).length,
          total: safeLists.length,
        });
      })
      .catch(() => {});
  }, []);

  const refreshRulesCount = useCallback(() => {
    GetRules()
      .then((rules) => {
        const count = (rules ?? []).filter((line) => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('!');
        }).length;
        setCustomRulesCount(count);
      })
      .catch(() => {});
  }, []);

  const updateCardHover = useCallback(
    (idx: number | null) => {
      if (idx === null) {
        setHoveredCard(null);
        setCanSlideCard(false);
        return;
      }
      setCanSlideCard(hoveredCard !== null && hoveredCard !== idx);
      setHoveredCard(idx);
      setLastHoveredCard(idx);
    },
    [hoveredCard],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      GetFilterLists().catch(() => []),
      GetRules().catch(() => []),
      GetPort().catch(() => 8899),
    ]).then(([lists, rules, port]) => {
      if (!active) return;
      const safeLists = lists ?? [];
      setFilterStats({
        enabled: safeLists.filter((l) => l.enabled).length,
        total: safeLists.length,
      });
      const ruleLines = (rules ?? []).filter((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('!');
      }).length;
      setCustomRulesCount(ruleLines);
      if (port) setProxyPort(port);
    });
    return () => {
      active = false;
    };
  }, []);

  const isProxyActive = proxyState === 'on';
  const isProxyLoading = proxyState === 'loading';

  const handleProxyToggle = (next: boolean) => {
    if (next) {
      StartProxy();
    } else {
      StopProxy();
    }
  };

  const handleVpnToggle = (next: boolean) => {
    if (next) {
      setPendingAction('connecting');
      VPNConnectBest('', engine, false, true).catch((err) => {
        setPendingAction(null);
        AppToaster.show({
          message: `VPN connection failed: ${String(err)}`,
          intent: 'danger',
        });
      });
    } else {
      setPendingAction('disconnecting');
      VPNDisconnect().catch((err) => {
        setPendingAction(null);
        AppToaster.show({
          message: `VPN disconnect failed: ${String(err)}`,
          intent: 'danger',
        });
      });
    }
  };

  return (
    <div className="overview">
      {/* 1. Separate Ad Shield & VPN Tunnel Cards with Fluid Functionalism 2-D Hover */}
      <section
        className="overview-cards"
        aria-label="Privacy Controls"
        style={{ '--card-hover-idx': lastHoveredCard } as CSSProperties}
        onPointerLeave={() => updateCardHover(null)}
      >
        <span
          className={`overview-cards__hover ${hoveredCard !== null ? 'is-visible' : ''} ${canSlideCard ? 'can-slide' : ''}`}
          aria-hidden="true"
        />

        {/* Card 1: Ad Shield */}
        <div
          className={`overview-card ${isProxyActive ? 'is-active' : ''}`}
          onPointerEnter={() => updateCardHover(0)}
        >
          <div className="overview-card__header">
            <div className="overview-card__title-group">
              <div className="overview-card__icon">
                <Icon icon="shield" size={16} />
              </div>
              <div className="overview-card__heading">
                <h2>Ad Shield</h2>
                <span className={`service-state ${isProxyActive ? 'is-active' : ''}`}>
                  <span className="status-dot" />
                  <StatusText>{isProxyLoading ? 'Starting…' : isProxyActive ? 'Active' : 'Paused'}</StatusText>
                </span>
              </div>
            </div>
            <FluidSwitch
              checked={isProxyActive}
              disabled={isProxyLoading}
              aria-label="Toggle Ad Shield"
              onChange={handleProxyToggle}
            />
          </div>

          <div className="overview-card__details">
            <div className="overview-card__detail-row">
              <span className="overview-card__detail-label">Filter lists</span>
              <span className="overview-card__detail-value">
                <NumberFlow value={filterStats.enabled} /> / <NumberFlow value={filterStats.total} /> active
              </span>
            </div>
            <div className="overview-card__detail-row">
              <span className="overview-card__detail-label">Custom rules</span>
              <span className="overview-card__detail-value">
                <NumberFlow value={customRulesCount} /> rules
              </span>
            </div>
            <div className="overview-card__detail-row">
              <span className="overview-card__detail-label">
                {isProxyActive ? 'Blocked this session' : 'Local proxy'}
              </span>
              <span className="overview-card__detail-value">
                {isProxyActive ? (
                  <NumberFlow value={sessionBlocks} trend={1} />
                ) : (
                  <span className="overview-card__mono">127.0.0.1:{proxyPort}</span>
                )}
              </span>
            </div>
          </div>

          <div className="overview-card__actions">
            <button
              type="button"
              className="overview-card__link"
              onClick={() => setFilterDialogOpen(true)}
            >
              <Icon icon="filter" size={13} />
              <span>Filter lists</span>
            </button>
            <button type="button" className="overview-card__link" onClick={() => setRulesDialogOpen(true)}>
              <Icon icon="code" size={13} />
              <span>Rules</span>
            </button>
          </div>
        </div>

        {/* Card 2: VPN Tunnel */}
        <div
          className={`overview-card ${isConnected ? 'is-active' : ''}`}
          onPointerEnter={() => updateCardHover(1)}
        >
          <div className="overview-card__header">
            <div className="overview-card__title-group">
              <div className="overview-card__icon">
                <Icon icon="globe-network" size={16} />
              </div>
              <div className="overview-card__heading">
                <h2>VPN Tunnel</h2>
                <span className={`service-state ${isConnected ? 'is-active' : ''}`}>
                  <span className="status-dot" />
                  <StatusText>
                    {isConnected
                      ? 'Connected'
                      : vpnState === 'disconnecting'
                        ? 'Disconnecting…'
                        : isTransitioning
                          ? 'Connecting…'
                          : 'Disconnected'}
                  </StatusText>
                </span>
              </div>
            </div>
            <FluidSwitch
              checked={isConnected || (isTransitioning && vpnState !== 'disconnecting')}
              disabled={isTransitioning}
              pending={isTransitioning}
              aria-label="Toggle VPN Tunnel"
              onChange={handleVpnToggle}
            />
          </div>

          <div className="overview-card__details">
            {isConnected ? (
              <>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Endpoint</span>
                  <span className="overview-card__detail-value">
                    <OfficialFlag code={vpnInfo.countryShort} />
                    <span>{vpnInfo.countryLong || vpnInfo.countryShort || 'Relay'}</span>
                  </span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Relay IP</span>
                  <span className="overview-card__detail-value overview-card__mono">
                    <span>{vpnInfo.serverIP || vpnInfo.serverHostName || '—'}</span>
                    {vpnInfo.serverIP && <FluidCopyButton value={vpnInfo.serverIP} label="Copy relay IP" />}
                  </span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Protocol · Session</span>
                  <span className="overview-card__detail-value">
                    {vpnInfo.engine === 'softether' ? 'SoftEther' : 'OpenVPN'} ·{' '}
                    <SessionTimer seconds={connectedSeconds} />
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Exit node</span>
                  <span className="overview-card__detail-value">Best available relay</span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Protocol</span>
                  <span className="overview-card__detail-value">
                    {engine === 'softether' ? 'SoftEther' : 'OpenVPN'}
                  </span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">DNS protection</span>
                  <span className="overview-card__detail-value">Enforced on connect</span>
                </div>
              </>
            )}
          </div>

          <div className="overview-card__actions">
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
            <button type="button" className="overview-card__link" onClick={() => setServersDialogOpen(true)}>
              <Icon icon="globe-network" size={13} />
              <span>Browse servers</span>
              <Icon icon="arrow-right" size={12} />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Request Activity */}
      <section className="overview-activity" aria-label="Request Activity">
        <div className="overview-activity__header">
          <h3>Request Activity</h3>
          <span className={`service-state ${isProxyActive ? 'is-active' : ''}`}>
            <span className="status-dot" />
            <span>{isProxyActive ? 'Live' : 'Paused'}</span>
          </span>
        </div>

        {isProxyActive ? (
          <RequestLog />
        ) : (
          <div className="overview-activity__paused">
            <div className="overview-activity__paused-info">
              <Icon icon="shield" size={15} />
              <span>Ad Shield is paused. Enable blocking to inspect live filtered requests.</span>
            </div>
            <button
              type="button"
              className="overview-activity__enable-btn"
              disabled={isProxyLoading}
              onClick={() => StartProxy()}
            >
              Enable Ad Shield
            </button>
          </div>
        )}
      </section>

      <FilterCommandDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        onChanged={refreshFilterStats}
        onOpenFullPage={() => onNavigate('filterLists')}
      />
      <RulesCommandDialog
        open={rulesDialogOpen}
        onClose={() => setRulesDialogOpen(false)}
        onChanged={refreshRulesCount}
        onOpenFullPage={() => onNavigate('rules')}
      />
      <ServerCommandDialog
        open={serversDialogOpen}
        onClose={() => setServersDialogOpen(false)}
        onOpenFullPage={() => onNavigate('vpn')}
      />
    </div>
  );
}
