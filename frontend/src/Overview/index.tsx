import { Button, Icon, Tag } from '@blueprintjs/core';
import { useState, useEffect } from 'react';

import type { AppTab } from '@/components/Navigation';
import { StatusText } from '@/components/StatusText';
import { useProxyState } from '@/context/ProxyStateContext';
import { useVPNState } from '@/context/VPNStateContext';
import { RequestLog } from '@/RequestLog';
import { StartProxy, StopProxy, VPNConnectBest, VPNDisconnect } from 'wails/go/app/App';

import './index.css';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset));
}

export function Overview({ onNavigate }: { onNavigate: (tab: AppTab) => void }) {
  const { proxyState } = useProxyState();
  const { vpnInfo, isConnected, isTransitioning } = useVPNState();

  const [connectedSeconds, setConnectedSeconds] = useState(0);

  useEffect(() => {
    if (!isConnected) return;
    const start = Date.now();
    const interval = window.setInterval(() => {
      setConnectedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => {
      window.clearInterval(interval);
      setConnectedSeconds(0);
    };
  }, [isConnected]);

  const isProxyActive = proxyState === 'on';

  const handleProxyToggle = () => {
    if (proxyState === 'off') {
      StartProxy();
    } else {
      StopProxy();
    }
  };

  const handleVpnToggle = () => {
    if (isConnected) {
      VPNDisconnect();
    } else {
      VPNConnectBest('', 'openvpn', false, true).catch(() => {});
    }
  };

  return (
    <div className="overview">
      {/* 1. Dual Focused Control Cards */}
      <section className="overview-cards" aria-label="Privacy Controls">
        {/* Card 1: Ad & Tracker Blocking */}
        <div className={`overview-card ${isProxyActive ? 'is-active' : ''}`}>
          <div className="overview-card__header">
            <div className="overview-card__title-group">
              <div className="overview-card__icon">
                <Icon icon="shield" size={16} />
              </div>
              <h2>Ad & Tracker Blocking</h2>
            </div>
            <span className={`service-state ${isProxyActive ? 'is-active' : ''}`}>
              <span className="status-dot" />
              <StatusText>{isProxyActive ? 'Active' : 'Paused'}</StatusText>
            </span>
          </div>

          <div className="overview-card__body">
            Filters ads, tracking beacons, and analytics requests across local apps and browsers.
          </div>

          <div className="overview-card__actions">
            <Button
              intent={isProxyActive ? 'danger' : 'primary'}
              icon={isProxyActive ? 'pause' : 'power'}
              loading={proxyState === 'loading'}
              onClick={handleProxyToggle}
            >
              <StatusText>{isProxyActive ? 'Pause blocking' : 'Enable blocking'}</StatusText>
            </Button>
            <div className="overview-card__links">
              <Button variant="minimal" icon="filter" onClick={() => onNavigate('filterLists')}>
                Filter lists
              </Button>
              <Button variant="minimal" icon="code" onClick={() => onNavigate('rules')}>
                Rules
              </Button>
            </div>
          </div>
        </div>

        {/* Card 2: VPN Routing */}
        <div className={`overview-card ${isConnected ? 'is-active' : ''}`}>
          <div className="overview-card__header">
            <div className="overview-card__title-group">
              <div className="overview-card__icon">
                <Icon icon="globe-network" size={16} />
              </div>
              <h2>VPN Tunnel</h2>
            </div>
            <span className={`service-state ${isConnected ? 'is-active' : ''}`}>
              <span className="status-dot" />
              <StatusText>
                {isConnected ? 'Connected' : isTransitioning ? 'Connecting…' : 'Disconnected'}
              </StatusText>
            </span>
          </div>

          <div className="overview-card__body">
            {isConnected ? (
              <div className="overview-card__details">
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Endpoint:</span>
                  <span className="overview-card__detail-value">
                    {countryCodeToFlag(vpnInfo.countryShort)} {vpnInfo.countryLong || vpnInfo.countryShort || 'Relay'}
                  </span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Duration:</span>
                  <span className="overview-card__detail-value">{formatDuration(connectedSeconds)}</span>
                </div>
                <div className="overview-card__detail-row">
                  <span className="overview-card__detail-label">Protocol:</span>
                  <span className="overview-card__detail-value">
                    {vpnInfo.engine === 'softether' ? 'SoftEther' : 'OpenVPN'}
                  </span>
                </div>
              </div>
            ) : (
              'Routes outbound traffic through encrypted VPN servers.'
            )}
          </div>

          <div className="overview-card__actions">
            <Button
              intent={isConnected ? 'danger' : 'primary'}
              icon={isConnected ? 'cross' : 'play'}
              loading={isTransitioning}
              onClick={handleVpnToggle}
            >
              <StatusText>
                {isConnected ? 'Disconnect' : isTransitioning ? 'Connecting…' : 'Connect to best server'}
              </StatusText>
            </Button>
            <Button variant="minimal" icon="arrow-right" onClick={() => onNavigate('vpn')}>
              Servers
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Compact Request Activity Section */}
      <section className="overview-activity" aria-label="Request Activity">
        <div className="overview-activity__header">
          <h3>Request Activity</h3>
          <Tag minimal>{isProxyActive ? 'Live' : 'Paused'}</Tag>
        </div>

        {isProxyActive ? (
          <RequestLog />
        ) : (
          <div className="overview-activity__paused">
            <Icon icon="info-sign" size={14} />
            <span>Ad blocking is paused. Network activity stream will appear here when active.</span>
          </div>
        )}
      </section>
    </div>
  );
}
