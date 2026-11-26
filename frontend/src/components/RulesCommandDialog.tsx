import { Icon } from '@blueprintjs/core';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AppToaster } from '@/common/toaster';
import { FluidSwitch } from '@/components/FluidSwitch';
import { useProxyState } from '@/context/ProxyStateContext';
import { GetRules, SetRules } from 'wails/go/config/Config';

interface RulesCommandDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onOpenFullPage?: () => void;
}

type RuleKind = 'all' | 'block' | 'allow' | 'comment';

const TABS: { id: RuleKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'block', label: 'Block' },
  { id: 'allow', label: 'Allow' },
  { id: 'comment', label: 'Comments' },
];

const ROW_HEIGHT = 40;

function classifyRule(line: string): Exclude<RuleKind, 'all'> {
  const trimmed = line.trim();
  if (trimmed.startsWith('!')) return 'comment';
  if (trimmed.startsWith('@@')) return 'allow';
  return 'block';
}

export function RulesCommandDialog({
  open,
  onClose,
  onChanged,
  onOpenFullPage,
}: RulesCommandDialogProps) {
  const { isProxyRunning } = useProxyState();

  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<RuleKind>('all');
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
    GetRules()
      .then((res) => {
        if (mounted) {
          setLines((res ?? []).filter((l) => l.trim().length > 0));
        }
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
    return lines
      .map((text, index) => ({ text, kind: classifyRule(text), index }))
      .filter((item) => {
        if (activeTab !== 'all' && item.kind !== activeTab) return false;
        if (words.length === 0) return true;
        return words.every((w) => item.text.toLowerCase().includes(w));
      });
  }, [lines, activeTab, query]);

  const canQuickAdd = useMemo(() => {
    const q = query.trim();
    return q.length > 0 && !lines.some((l) => l.trim() === q);
  }, [lines, query]);

  const totalRows = filtered.length + (canQuickAdd ? 1 : 0);

  const itemsKey = useMemo(
    () => `${canQuickAdd ? 'add' : ''}\0` + filtered.map((r) => `${r.index}:${r.text}`).join('\0'),
    [filtered, canQuickAdd],
  );
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

  const persistRules = useCallback(
    async (nextLines: string[]) => {
      if (isProxyRunning) {
        AppToaster.show({
          message: 'Stop Ad Shield to modify custom rules',
          intent: 'warning',
        });
        return false;
      }
      setLines(nextLines);
      try {
        await SetRules(nextLines);
        onChanged?.();
        return true;
      } catch (err) {
        AppToaster.show({ message: `Failed to save rules: ${String(err)}`, intent: 'danger' });
        return false;
      }
    },
    [isProxyRunning, onChanged],
  );

  const handleAddRule = useCallback(async () => {
    const rule = query.trim();
    if (!rule) return;
    const ok = await persistRules([...lines, rule]);
    if (ok) setQuery('');
  }, [lines, persistRules, query]);

  const handleToggleRule = useCallback(
    async (idxToToggle: number) => {
      const current = lines[idxToToggle];
      if (!current) return;
      const trimmed = current.trim();
      const nextLine = trimmed.startsWith('!')
        ? trimmed.replace(/^!\s*/, '')
        : `! ${trimmed}`;
      await persistRules(lines.map((line, i) => (i === idxToToggle ? nextLine : line)));
    },
    [lines, persistRules],
  );

  const handleRemoveRule = useCallback(
    async (idxToRemove: number) => {
      await persistRules(lines.filter((_, i) => i !== idxToRemove));
    },
    [lines, persistRules],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (totalRows === 0) return;
      e.preventDefault();
      setCanSlide(true);
      setActiveIdx((prev) => {
        const next = (prev + 1) % totalRows;
        scrollRowToCenter(next);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      if (totalRows === 0) return;
      e.preventDefault();
      setCanSlide(true);
      setActiveIdx((prev) => {
        const next = (prev - 1 + totalRows) % totalRows;
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

    if (e.key === 'Enter') {
      e.preventDefault();
      if (canQuickAdd && activeIdx === 0) {
        handleAddRule();
      } else {
        const ruleIdx = canQuickAdd ? activeIdx - 1 : activeIdx;
        const item = filtered[ruleIdx];
        if (item) handleToggleRule(item.index);
      }
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
      <div role="dialog" aria-modal="true" aria-label="Custom Rules Command Menu" className="cmd-dialog">
        <div className="cmd-menu__input-wrap">
          <Icon icon="search" size={14} className="cmd-menu__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-menu__input"
            placeholder="Search custom rules or type a rule to add (e.g. ||ads.example.com^)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-activedescendant={totalRows > 0 ? `cmd-rule-${activeIdx}` : undefined}
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
                {tab.label}
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
            <div className="cmd-menu__empty">Loading custom rules…</div>
          ) : totalRows === 0 ? (
            <div className="cmd-menu__empty">No custom rules yet. Type a rule above to add one.</div>
          ) : (
            <div className="cmd-menu__items">
              <span className={`cmd-menu__hover ${canSlide ? 'can-slide' : ''}`} aria-hidden="true" />
              {canQuickAdd && (
                <button
                  id="cmd-rule-0"
                  type="button"
                  role="option"
                  aria-selected={activeIdx === 0}
                  className={`cmd-menu__row ${activeIdx === 0 ? 'is-highlighted' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => {
                    setCanSlide(true);
                    setActiveIdx(0);
                  }}
                  onClick={handleAddRule}
                >
                  <span className="cmd-menu__row-left">
                    <Icon icon="plus" size={13} />
                    <span className="cmd-menu__row-title">Add rule: {query.trim()}</span>
                    <span className="filter-row__category-badge filter-row__category-badge--custom">New</span>
                  </span>
                  <span className="cmd-menu__row-right">
                    <span className="cmd-menu__state-pill is-enabled">Enter</span>
                  </span>
                </button>
              )}
              {filtered.map((item, i) => {
                const rowIdx = canQuickAdd ? i + 1 : i;
                const isHighlighted = rowIdx === activeIdx;
                const badgeClass =
                  item.kind === 'block'
                    ? 'filter-row__category-badge--malware'
                    : item.kind === 'allow'
                      ? 'filter-row__category-badge--custom'
                      : '';
                const isEnabled = item.kind !== 'comment';
                const displayRule = isEnabled ? item.text : item.text.trim().replace(/^!\s*/, '');
                return (
                  <div
                    key={`${item.index}-${item.text}`}
                    id={`cmd-rule-${rowIdx}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`cmd-menu__row ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      setCanSlide(true);
                      setActiveIdx(rowIdx);
                    }}
                    onClick={() => handleToggleRule(item.index)}
                  >
                    <span className="cmd-menu__row-left">
                      <span
                        className="cmd-menu__row-title"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          opacity: isEnabled ? 1 : 0.6,
                        }}
                      >
                        {displayRule}
                      </span>
                      <span className={`filter-row__category-badge ${badgeClass}`}>
                        {item.kind === 'block' ? 'Block' : item.kind === 'allow' ? 'Allow' : 'Disabled'}
                      </span>
                    </span>
                    <span
                      className="cmd-menu__row-right"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <FluidSwitch
                        checked={isEnabled}
                        disabled={isProxyRunning}
                        aria-label={`Toggle rule ${displayRule}`}
                        onChange={() => handleToggleRule(item.index)}
                      />
                      <button
                        type="button"
                        className="cmd-menu__clear"
                        title="Delete rule"
                        aria-label={`Delete rule ${displayRule}`}
                        onClick={() => handleRemoveRule(item.index)}
                      >
                        <Icon icon="trash" size={12} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmd-menu__footer">
          <span className="cmd-menu__hints">
            <kbd>↑↓</kbd> Navigate · <kbd>←→</kbd> Tabs · <kbd>Enter</kbd> Add/Remove · <kbd>Esc</kbd> Close
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
              <span>Open editor</span>
              <Icon icon="arrow-right" size={11} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
