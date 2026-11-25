import { Button, HTMLSelect, Spinner, Icon } from '@blueprintjs/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusText } from '@/components/StatusText';

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
  countryFilter: string;
  onCountryFilterChange: (country: string) => void;
  countries: string[];
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
  if (ping < 60) return 'vpn-table__ping--good';
  if (ping < 140) return 'vpn-table__ping--fair';
  return 'vpn-table__ping--slow';
}

type SortKey = 'score' | 'ping' | 'speed';

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function ServerList({
  servers,
  loading,
  loadError,
  onRefresh,
  selectedHost,
  onSelect,
  disabled,
  countryFilter,
  onCountryFilterChange,
  countries,
}: ServerListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('score');

  const visibleServers = useMemo(() => {
    let list = servers;
    if (countryFilter) {
      list = list.filter((s) => s.countryShort?.toUpperCase() === countryFilter.toUpperCase());
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        `${s.hostName} ${s.countryLong} ${s.countryShort} ${s.ip}`.toLowerCase().includes(q),
      );
    }
    if (sortBy === 'ping') {
      return [...list].sort((a, b) => (a.ping || 9999) - (b.ping || 9999));
    }
    if (sortBy === 'speed') {
      return [...list].sort((a, b) => b.speed - a.speed);
    }
    return list;
  }, [servers, countryFilter, query, sortBy]);

  return (
    <div className="vpn-browser">
      {/* Toolbar */}
      <div className="vpn-browser__toolbar">
        <div className="vpn-browser__search">
          <Icon icon="search" size={13} className="vpn-browser__search-icon" />
          <input
            className="vpn-browser__input"
            aria-label="Search servers"
            placeholder="Search hostname, country, IP…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          {query && (
            <button
              type="button"
              className="vpn-browser__clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon icon="cross" size={12} />
            </button>
          )}
        </div>

        <HTMLSelect
          aria-label="Filter country"
          value={countryFilter}
          onChange={(e) => onCountryFilterChange(e.target.value)}
          disabled={loading || disabled}
          className="vpn-browser__select vpn-browser__select--country"
        >
          <option value="">All Countries ({servers.length})</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryFlag(c)} {c}
            </option>
          ))}
        </HTMLSelect>

        <HTMLSelect
          aria-label="Sort servers"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          disabled={loading}
          className="vpn-browser__select vpn-browser__select--sort"
        >
          <option value="score">Recommended</option>
          <option value="ping">Lowest latency</option>
          <option value="speed">Fastest speed</option>
        </HTMLSelect>

        <Button
          icon="refresh"
          variant="outlined"
          onClick={onRefresh}
          disabled={disabled || loading}
          title={t('vpn.servers.refresh')}
          aria-label={t('vpn.servers.refresh')}
        />

        <span className="vpn-browser__count">
          {loading ? (
            'Loading…'
          ) : (
            <>
              <StatusText numbers>{visibleServers.length}</StatusText> relays
            </>
          )}
        </span>
      </div>

      {/* Aligned Server Table */}
      <div className="vpn-table-container">
        <div className="vpn-table-header" role="row">
          <span className="vpn-th vpn-th--country">Country</span>
          <span className="vpn-th vpn-th--name">Relay Host / IP</span>
          <span className="vpn-th vpn-th--ping">Ping</span>
          <span className="vpn-th vpn-th--speed">Speed</span>
          <span className="vpn-th vpn-th--sessions">Sessions</span>
          <span className="vpn-th vpn-th--uptime">Uptime</span>
        </div>

        <div className="vpn-table-body" aria-busy={loading}>
          {loading ? (
            <div className="vpn-table__state">
              <Spinner size={22} />
              <span>Fetching live VPNGate relays…</span>
            </div>
          ) : loadError ? (
            <div role="alert" className="vpn-table__state vpn-table__state--error">
              <Icon icon="warning-sign" size={20} />
              <p>{t('vpn.feedback.serversError')}</p>
              <Button intent="primary" variant="outlined" onClick={onRefresh} disabled={disabled}>
                {t('vpn.feedback.retry')}
              </Button>
            </div>
          ) : visibleServers.length === 0 ? (
            <div className="vpn-table__state">
              <Icon icon="search" size={20} />
              <span>{query || countryFilter ? 'No servers match your filters' : 'No servers available'}</span>
            </div>
          ) : (
            visibleServers.slice(0, 100).map((s) => {
              const isSelected = selectedHost === s.hostName;
              return (
                <button
                  type="button"
                  key={s.hostName}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  className={`vpn-tr ${isSelected ? 'vpn-tr--selected' : ''}`}
                  onClick={() => !disabled && onSelect(s)}
                  title={`Select ${s.hostName} (${s.ip})`}
                >
                  <span className="vpn-td vpn-td--country">
                    <span className="vpn-td__flag">{countryFlag(s.countryShort)}</span>
                    <span className="vpn-td__code">{s.countryShort || '—'}</span>
                  </span>

                  <span className="vpn-td vpn-td--name">
                    <span className="vpn-td__hostname">{s.hostName}</span>
                    <span className="vpn-td__ip">{s.ip}</span>
                  </span>

                  <span className={`vpn-td vpn-td--ping ${pingClass(s.ping)}`}>
                    {s.ping > 0 ? `${s.ping} ms` : '—'}
                  </span>

                  <span className="vpn-td vpn-td--speed">{formatSpeed(s.speed)}</span>

                  <span className="vpn-td vpn-td--sessions">{s.numVpnSessions}</span>

                  <span className="vpn-td vpn-td--uptime">{formatUptime(s.uptime)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
