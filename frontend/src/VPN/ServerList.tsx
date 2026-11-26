import { Button, Spinner, Icon } from '@blueprintjs/core';
import NumberFlow from '@number-flow/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FluidCopyButton } from '@/components/FluidCopyButton';
import { FluidSelect } from '@/components/FluidSelect';
import { getCountryDisplayName, OfficialFlag } from '@/components/OfficialFlag';

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
  if (!bps || bps <= 0) return '—';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

function formatUptime(milliseconds: number): string {
  if (!milliseconds || milliseconds <= 0) return '—';
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const totalHours = Math.floor(milliseconds / 3_600_000);
  const days = Math.floor(milliseconds / 86_400_000);
  if (days >= 1) {
    const remHours = totalHours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  if (totalHours >= 1) {
    const remMins = totalMinutes % 60;
    return remMins > 0 ? `${totalHours}h ${remMins}m` : `${totalHours}h`;
  }
  return totalMinutes >= 1 ? `${totalMinutes}m` : '<1m';
}

function pingClass(ping: number): string {
  if (ping <= 0) return '';
  if (ping < 60) return 'vpn-table__ping--good';
  if (ping < 140) return 'vpn-table__ping--fair';
  return 'vpn-table__ping--slow';
}

type SortKey = 'score' | 'ping' | 'speed';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [countryFilter, query, sortBy, pageSize]);

  const countryOptions = useMemo(() => {
    const nameMap = new Map<string, string>();
    for (const s of servers) {
      const code = s.countryShort?.trim().toUpperCase();
      if (code && s.countryLong && !nameMap.has(code)) {
        nameMap.set(code, s.countryLong);
      }
    }
    return [...countries]
      .map((code) => ({
        code,
        name: getCountryDisplayName(code, nameMap),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, servers]);

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

  const totalPages = Math.max(1, Math.ceil(visibleServers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = visibleServers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, visibleServers.length);

  const pagedServers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleServers.slice(start, start + pageSize);
  }, [visibleServers, currentPage, pageSize]);

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

        <FluidSelect
          aria-label="Filter country"
          value={countryFilter}
          onChange={onCountryFilterChange}
          disabled={loading || disabled}
          searchable
          searchPlaceholder="Search country…"
          className="vpn-browser__select vpn-browser__select--country"
          options={[
            { value: '', label: `All Countries (${countryOptions.length})` },
            ...countryOptions.map(({ code, name }) => ({
              value: code,
              label: name,
              icon: <OfficialFlag code={code} title={name} />,
            })),
          ]}
        />

        <FluidSelect
          aria-label="Sort servers"
          value={sortBy}
          onChange={(val) => setSortBy(val as SortKey)}
          disabled={loading}
          className="vpn-browser__select vpn-browser__select--sort"
          options={[
            { value: 'score', label: 'Recommended' },
            { value: 'ping', label: 'Lowest latency' },
            { value: 'speed', label: 'Fastest speed' },
          ]}
        />

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
              <NumberFlow value={visibleServers.length} /> relays
            </>
          )}
        </span>
      </div>

      {/* Aligned Server Table */}
      <div className="vpn-table-container">
        <div className="vpn-table-header" role="row">
          <span className="vpn-th vpn-th--country">Country</span>
          <span className="vpn-th vpn-th--name">Relay Host</span>
          <span className="vpn-th vpn-th--ip">IP Address</span>
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
            pagedServers.map((s) => {
              const isSelected = selectedHost === s.hostName;
              const detailsTitle = [
                `${s.hostName} (${s.ip})`,
                s.operator ? `Operator: ${s.operator}` : '',
                s.totalUsers > 0 ? `Total users: ${s.totalUsers.toLocaleString()}` : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <button
                  type="button"
                  key={s.hostName}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  className={`vpn-tr ${isSelected ? 'vpn-tr--selected' : ''}`}
                  onClick={() => !disabled && onSelect(s)}
                  title={detailsTitle}
                >
                  <span className="vpn-td vpn-td--country">
                    <OfficialFlag code={s.countryShort} />
                    <span className="vpn-td__country-name">{s.countryLong || s.countryShort || '—'}</span>
                  </span>

                  <span className="vpn-td vpn-td--name">
                    <span className="vpn-td__hostname">{s.hostName}</span>
                  </span>

                  <span className="vpn-td vpn-td--ip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{s.ip}</span>
                    <FluidCopyButton value={s.ip} label={`Copy ${s.ip}`} />
                  </span>

                  <span className={`vpn-td vpn-td--ping ${pingClass(s.ping)}`}>
                    {s.ping > 0 ? `${s.ping} ms` : '—'}
                  </span>

                  <span className="vpn-td vpn-td--speed">{formatSpeed(s.speed)}</span>

                  <span className="vpn-td vpn-td--sessions">{s.numVpnSessions.toLocaleString()}</span>

                  <span className="vpn-td vpn-td--uptime">{formatUptime(s.uptime)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {!loading && !loadError && visibleServers.length > 0 && (
        <div className="vpn-pagination">
          <span>
            Showing {startIdx}-{endIdx} of {visibleServers.length}
          </span>
          <div className="vpn-pagination__controls">
            <FluidSelect
              aria-label="Servers per page"
              value={String(pageSize)}
              onChange={(val) => setPageSize(Number(val))}
              options={[
                { value: '25', label: '25 / page' },
                { value: '50', label: '50 / page' },
                { value: '100', label: '100 / page' },
              ]}
            />
            {totalPages > 1 && (
              <>
                <button
                  type="button"
                  className="vpn-pagination__btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <Icon icon="chevron-left" size={14} />
                </button>
                <span className="vpn-pagination__page">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="vpn-pagination__btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                  aria-label="Next page"
                >
                  <Icon icon="chevron-right" size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
