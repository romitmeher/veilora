import { Icon } from '@blueprintjs/core';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { AppToaster } from '@/common/toaster';
import { FluidSwitch } from '@/components/FluidSwitch';
import { OfficialFlag, parseRegionalTitle } from '@/components/OfficialFlag';
import { useProxyState } from '@/context/ProxyStateContext';
import { FilterListType } from '@/FilterLists/types';
import { GetFilterLists, ToggleFilterList } from 'wails/go/config/Config';
import { config } from 'wails/go/models';

interface FilterCommandDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onOpenFullPage?: () => void;
}

const TABS: { id: 'all' | FilterListType; labelKey?: string; fallback: string }[] = [
  { id: 'all', fallback: 'All' },
  { id: FilterListType.GENERAL, labelKey: 'filterTypes.general', fallback: 'General' },
  { id: FilterListType.ADS, labelKey: 'filterTypes.ads', fallback: 'Ads' },
  { id: FilterListType.PRIVACY, labelKey: 'filterTypes.privacy', fallback: 'Privacy' },
  { id: FilterListType.MALWARE, labelKey: 'filterTypes.malware', fallback: 'Malware' },
  { id: FilterListType.REGIONAL, labelKey: 'filterTypes.regional', fallback: 'Regional' },
  { id: FilterListType.DIGITAL_WELLBEING, labelKey: 'filterTypes.digitalWellbeing', fallback: 'Digital wellbeing' },
  { id: FilterListType.CUSTOM, labelKey: 'filterTypes.custom', fallback: 'Custom' },
];

const ROW_HEIGHT = 40;

export function FilterCommandDialog({
  open,
  onClose,
  onChanged,
  onOpenFullPage,
}: FilterCommandDialogProps) {
  const { t } = useTranslation();
  const { isProxyRunning } = useProxyState();

  const [lists, setLists] = useState<config.FilterList[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | FilterListType>('all');
  const [activeIdx, setActiveIdx] = useState(0);
  const [canSlide, setCanSlide] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setQuery('');
    setActiveTab('all');
    setActiveIdx(0);
    setCanSlide(false);
    setLoading(true);
    GetFilterLists()
      .then((res) => {
        if (mounted) setLists(res ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      mounted = false;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return lists.filter((item) => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (words.length === 0) return true;
      const haystack = `${item.name} ${item.url} ${item.type}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [lists, activeTab, query]);

  // Reset highlight to first row when filtered set changes (Fluid Functionalism CommandMenu spec)
  const itemsKey = useMemo(() => filtered.map((f) => f.url).join('\0'), [filtered]);
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

  const handleToggleItem = useCallback(
    async (item: config.FilterList) => {
      if (isProxyRunning) {
        AppToaster.show({
          message: t('common.stopProxyToToggleFilter') as string,
          intent: 'warning',
        });
        return;
      }
      const next = !item.enabled;
      setLists((prev) => prev.map((x) => (x.url === item.url ? { ...x, enabled: next } : x)));
      try {
        await ToggleFilterList(item.url, next);
        onChanged?.();
      } catch (err) {
        setLists((prev) => prev.map((x) => (x.url === item.url ? { ...x, enabled: item.enabled } : x)));
        AppToaster.show({
          message: t('filterLists.toggleError', { error: String(err) }),
          intent: 'danger',
        });
      }
    },
    [isProxyRunning, onChanged, t],
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
      const idx = TABS.findIndex((tab) => tab.id === activeTab);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextTab = TABS[(idx + delta + TABS.length) % TABS.length];
      if (nextTab) setActiveTab(nextTab.id);
      return;
    }

    if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      handleToggleItem(filtered[activeIdx]);
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
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter Lists Command Menu"
        className="cmd-dialog"
      >
        <div className="cmd-menu__input-wrap">
          <Icon icon="search" size={14} className="cmd-menu__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-menu__input"
            placeholder="Search filter lists by name, URL, or section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-activedescendant={filtered[activeIdx] ? `cmd-filter-${activeIdx}` : undefined}
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
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const label = tab.labelKey ? t(tab.labelKey) : tab.fallback;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`cmd-menu__tab ${isSelected ? 'is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveTab(tab.id)}
              >
                {label}
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
            <div className="cmd-menu__empty">Loading filter lists…</div>
          ) : filtered.length === 0 ? (
            <div className="cmd-menu__empty">No filter lists match your search.</div>
          ) : (
            <div className="cmd-menu__items">
              <span
                className={`cmd-menu__hover ${canSlide ? 'can-slide' : ''}`}
                aria-hidden="true"
              />
              {filtered.map((item, idx) => {
                const { codes, title } = parseRegionalTitle(item.name);
                const isHighlighted = idx === activeIdx;
                return (
                  <div
                    key={item.url}
                    id={`cmd-filter-${idx}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`cmd-menu__row ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      setCanSlide(true);
                      setActiveIdx(idx);
                    }}
                    onClick={() => handleToggleItem(item)}
                  >
                    <span className="cmd-menu__row-left">
                      {codes.length > 0 && (
                        <span className="filter-row__flags">
                          {codes.map((c) => (
                            <OfficialFlag key={c} code={c} />
                          ))}
                        </span>
                      )}
                      <span className="cmd-menu__row-title">{title}</span>
                      <span className={`filter-row__category-badge filter-row__category-badge--${item.type}`}>
                        {t(`filterTypes.${item.type}`)}
                      </span>
                    </span>
                    <span
                      className="cmd-menu__row-right"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <FluidSwitch
                        checked={item.enabled}
                        disabled={isProxyRunning}
                        aria-label={`Toggle ${title}`}
                        onChange={() => handleToggleItem(item)}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmd-menu__footer">
          <span className="cmd-menu__hints">
            <kbd>↑↓</kbd> Navigate · <kbd>←→</kbd> Sections · <kbd>Enter</kbd> Toggle · <kbd>Esc</kbd> Close
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
              <span>Manage all</span>
              <Icon icon="arrow-right" size={11} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
