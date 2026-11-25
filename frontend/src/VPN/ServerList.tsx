import { Button, Spinner } from '@blueprintjs/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface VPNServer {
  hostName: string;
  ip: string;
  score: number;
  ping: number;
  speed: number;
  countryLong: string;
  countryShort: string;
  numVpnSessions: number;
  uptime: number;
  totalUsers: number;
  totalTraffic: number;
  logType: string;
  operator: string;
  message: string;
  computedScore: number;
  openVpnConfigBase64: string;
}

interface ServerListProps {
  servers: VPNServer[];
  loading: boolean;
  loadError: boolean;
  onRefresh: () => void;
  selectedHost: string;
  onSelect: (server: VPNServer) => void;
  disabled: boolean;
}

function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

function formatUptime(milliseconds: number): string {
  if (!milliseconds) return '—';
  const days = Math.floor(milliseconds / 86_400_000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(milliseconds / 3_600_000);
  return hours > 0 ? `${hours}h` : '<1h';
}

function pingClass(ping: number): string {
  if (ping <= 0) return '';
  if (ping < 60) return 'vpn-server-row__ping--good';
  if (ping < 150) return 'vpn-server-row__ping--fair';
  return 'vpn-server-row__ping--slow';
}

export function ServerList({
  servers,
  loading,
  loadError,
  onRefresh,
  selectedHost,
  onSelect,
  disabled,
}: ServerListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const visibleServers = servers.filter((s) =>
    `${s.hostName} ${s.countryLong} ${s.countryShort} ${s.ip}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="vpn-servers">
      <div className="vpn-servers__header">
        <span>{t('vpn.servers.title')}</span>
        <span className="vpn-servers__count">
          {loading ? 'Loading…' : `${visibleServers.length} available`}
        </span>
      </div>
      <div className="vpn-servers__toolbar">
        <input
          className="bp6-input bp6-fill"
          aria-label={t('vpn.feedback.search')}
          placeholder={t('vpn.feedback.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <Button
          icon="refresh"
          variant="outlined"
          onClick={onRefresh}
          disabled={disabled || loading}
          title={t('vpn.servers.refresh')}
          aria-label={t('vpn.servers.refresh')}
        />
      </div>

      <div className="vpn-servers__list" aria-busy={loading}>
        {loading ? (
          <Spinner size={20} style={{ margin: '12px auto' }} />
        ) : loadError ? (
          <div role="alert" className="vpn-servers__empty">
            <p>{t('vpn.feedback.serversError')}</p>
            <Button onClick={onRefresh} disabled={disabled}>
              {t('vpn.feedback.retry')}
            </Button>
          </div>
        ) : visibleServers.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem', color: 'var(--bp-text-muted-color)' }}
          >
            {query ? t('vpn.feedback.noMatches') : t('vpn.servers.empty')}
          </div>
        ) : (
          visibleServers.slice(0, 80).map((s) => (
            <button
              type="button"
              disabled={disabled}
              aria-pressed={selectedHost === s.hostName}
              key={s.hostName}
              className={`vpn-server-row${selectedHost === s.hostName ? ' vpn-server-row--selected' : ''}`}
              onClick={() => !disabled && onSelect(s)}
            >
              <span
                className="vpn-server-row__name"
                title={`${s.hostName}\nIP: ${s.ip}\nOperator: ${s.operator || '—'}\nPolicy: ${s.logType || '—'}\n${s.message || ''}`}
              >
                {s.hostName}
                <small>
                  {s.countryLong || s.countryShort} · {s.ip}
                </small>
              </span>
              <span className="vpn-server-row__country">{s.countryShort || '—'}</span>
              <span className={`vpn-server-row__ping ${pingClass(s.ping)}`}>
                {s.ping > 0 ? `${s.ping} ms` : '—'}
              </span>
              <span className="vpn-server-row__speed">{formatSpeed(s.speed)}</span>
              <span className="vpn-server-row__stats">
                <span>{s.numVpnSessions} sessions</span>
                <span>{formatUptime(s.uptime)} uptime</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
