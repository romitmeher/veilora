import { Icon } from '@blueprintjs/core';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppToaster } from '@/common/toaster';
import { getCountryDisplayName, OfficialFlag } from '@/components/OfficialFlag';
import { useVPNState } from '@/context/VPNStateContext';
import type { VPNServer } from '@/VPN/ServerList';
import { VPNConnectToServer, VPNGetCountries, VPNGetServers } from 'wails/go/app/App';

interface ServerCommandDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenFullPage?: () => void;
}

const ROW_HEIGHT = 40;

function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${bps} bps`;
}

export function ServerCommandDialog({ open, onClose, onOpenFullPage }: ServerCommandDialogProps) {
  const { engine, setPendingAction } = useVPNState();
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCountry, setActiveCountry] = useState<string>('all');
  const [activeIdx, setActiveIdx] = useState(0);
  const [canSlide, setCanSlide] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setQuery('');
    setActiveCountry('all');
    setActiveIdx(0);
    setCanSlide(false);
    setLoading(true);
    Promise.all([VPNGetServers('', false).catch(() => []), VPNGetCountries().catch(() => [])])
      .then(([srvList, countryList]) => {
        if (!mounted) return;
        setServers((srvList as VPNServer[]) ?? []);
        setCountries((countryList as string[]) ?? []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      mounted = false;
    };
  }, [open]);

  const countryItems = useMemo(() => {
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

  const tabs = useMemo(() => ['all', ...countryItems.map((c) => c.code)], [countryItems]);

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return servers
      .filter((s) => {
        if (activeCountry !== 'all' && s.countryShort?.toUpperCase() !== activeCountry.toUpperCase()) {
          return false;
        }
        if (words.length === 0) return true;
        const haystack = `${s.hostName} ${s.countryLong} ${s.countryShort} ${s.ip}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      })
      .slice(0, 60);
  }, [servers, activeCountry, query]);

  const itemsKey = useMemo(() => filtered.map((s) => s.hostName).join('\0'), [filtered]);
  useEffect(() => {
    setCanSlide(false);
    setActiveIdx(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [itemsKey]);

  const scrollRowToCenter = useCallback((idx: number) => {
    const container = listRef.current;
    if (!container) return;
    if (idx === 0) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const targetTop = idx * ROW_HEIGHT - container.clientHeight / 2 + ROW_HEIGHT / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, []);

  const handleConnect = useCallback(
    async (server: VPNServer) => {
      onClose();
      setPendingAction('connecting');
      try {
        await VPNConnectToServer(server.hostName, engine, false, true);
      } catch (err) {
        setPendingAction(null);
        AppToaster.show({ message: `Failed to connect: ${String(err)}`, intent: 'danger' });
      }
    },
    [engine, onClose, setPendingAction],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (filtered.length === 0) return;
      e.preventDefault();
      setCanSlide(true);
      setActiveIdx((prev) => {
        const next = (prev + 1) % filtered.length;
        scrollRowToCenter(next);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      if (filtered.length === 0) return;
      e.preventDefault();
      setCanSlide(true);
      setActiveIdx((prev) => {
        const next = (prev - 1 + filtered.length) % filtered.length;
        scrollRowToCenter(next);
        return next;
      });
      return;
    }

    if (
      (e.key === 'ArrowRight' || e.key === 'ArrowLeft') &&
      !e.shiftKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      const idx = tabs.indexOf(activeCountry);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextTab = tabs[(idx + delta + tabs.length) % tabs.length];
      if (nextTab) setActiveCountry(nextTab);
      return;
    }

    if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      handleConnect(filtered[activeIdx]);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="cmd-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="VPN Servers Command Menu" className="cmd-dialog">
        <div className="cmd-menu__input-wrap">
          <Icon icon="search" size={14} className="cmd-menu__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-menu__input"
            placeholder="Search VPN relays by country, hostname, or IP…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-activedescendant={filtered[activeIdx] ? `cmd-server-${activeIdx}` : undefined}
          />
          {query && (
            <button
              type="button"
              className="cmd-menu__clear"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon icon="cross" size={12} />
            </button>
          )}
        </div>

        <div className="cmd-menu__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeCountry === 'all'}
            className={`cmd-menu__tab ${activeCountry === 'all' ? 'is-active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveCountry('all')}
          >
            All
          </button>
          {countryItems.map(({ code, name }) => {
            const isSelected = activeCountry === code;
            return (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`cmd-menu__tab ${isSelected ? 'is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveCountry(code)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <OfficialFlag code={code} title={name} />
                  <span>{name}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={listRef}
          role="listbox"
          className="cmd-menu__list"
          style={{ '--cmd-active': activeIdx } as CSSProperties}
        >
          {loading ? (
            <div className="cmd-menu__empty">Loading VPN relays…</div>
          ) : filtered.length === 0 ? (
            <div className="cmd-menu__empty">No relays match your search.</div>
          ) : (
            <div className="cmd-menu__items">
              <span className={`cmd-menu__hover ${canSlide ? 'can-slide' : ''}`} aria-hidden="true" />
              {filtered.map((s, idx) => {
                const isHighlighted = idx === activeIdx;
                return (
                  <button
                    key={s.hostName}
                    id={`cmd-server-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    className={`cmd-menu__row ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      setCanSlide(true);
                      setActiveIdx(idx);
                    }}
                    onClick={() => handleConnect(s)}
                  >
                    <span className="cmd-menu__row-left">
                      <OfficialFlag code={s.countryShort} />
                      <span className="cmd-menu__row-title">{s.countryLong || s.countryShort}</span>
                      <span className="filter-row__category-badge">{s.hostName}</span>
                    </span>
                    <span className="cmd-menu__row-right" style={{ display: 'inline-flex', gap: '6px' }}>
                      {s.ping > 0 && (
                        <span className="cmd-menu__state-pill is-enabled">{s.ping} ms</span>
                      )}
                      <span className="cmd-menu__state-pill">{formatSpeed(s.speed)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmd-menu__footer">
          <span className="cmd-menu__hints">
            <kbd>↑↓</kbd> Navigate · <kbd>←→</kbd> Country · <kbd>Enter</kbd> Connect · <kbd>Esc</kbd> Close
          </span>
          {onOpenFullPage && (
            <button
              type="button"
              className="cmd-menu__footer-link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClose();
                onOpenFullPage();
              }}
            >
              <span>All servers</span>
              <Icon icon="arrow-right" size={11} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
