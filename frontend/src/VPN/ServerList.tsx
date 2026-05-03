import { Button, Spinner, HTMLSelect } from '@blueprintjs/core';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { VPNGetServers, VPNGetCountries, VPNRefreshServers } from 'wails/go/app/App';

export interface VPNServer {
  hostName: string;
  ip: string;
  score: number;
  ping: number;
  speed: number;
  countryLong: string;
  countryShort: string;
  numVpnSessions: number;
  computedScore: number;
  openVpnConfigBase64: string;
}

interface ServerListProps {
  selectedHost: string;
  onSelect: (server: VPNServer) => void;
  disabled: boolean;
}

function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

export function ServerList({ selectedHost, onSelect, disabled }: ServerListProps) {
  const { t } = useTranslation();
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);

  const loadServers = useCallback(async (countryFilter: string) => {
    setLoading(true);
    try {
      const result = await VPNGetServers(countryFilter, true);
      setServers(result ?? []);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    VPNGetCountries()
      .then((c: string[]) => setCountries((c ?? []).sort()))
      .catch(() => {});
    loadServers('');
  }, [loadServers]);

  const handleRefresh = () => {
    VPNRefreshServers();
    loadServers(country);
  };

  return (
    <div className="vpn-servers">
      <div className="bp6-tag bp6-large bp6-fill vpn-servers__header" style={{ borderRadius: 0 }}>
        {t('vpn.servers.title')}
      </div>
      <div className="vpn-servers__toolbar">
        <HTMLSelect
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            loadServers(e.target.value);
          }}
          disabled={disabled || loading}
        >
          <option value="">{t('vpn.servers.allCountries')}</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </HTMLSelect>
        <Button
          icon="refresh"
          variant="minimal"
          onClick={handleRefresh}
          disabled={disabled || loading}
          title={t('vpn.servers.refresh')}
        />
      </div>

      <div className="vpn-servers__list">
        {loading ? (
          <Spinner size={20} style={{ margin: '12px auto' }} />
        ) : servers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem', color: 'var(--bp-text-muted-color)' }}>
            {t('vpn.servers.empty')}
          </div>
        ) : (
          servers.slice(0, 80).map((s) => (
            <div
              key={s.hostName}
              className={`vpn-server-row${selectedHost === s.hostName ? ' vpn-server-row--selected' : ''}`}
              onClick={() => !disabled && onSelect(s)}
            >
              <div className="vpn-server-row__name" title={s.hostName}>{s.hostName}</div>
              <div className="vpn-server-row__country">{s.countryShort}</div>
              <div className="vpn-server-row__ping">{s.ping > 0 ? `${s.ping}ms` : '—'}</div>
              <div className="vpn-server-row__speed">{formatSpeed(s.speed)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
