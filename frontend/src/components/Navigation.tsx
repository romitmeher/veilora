import { Icon, type IconName } from '@blueprintjs/core';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProxyState } from '@/context/ProxyStateContext';
import { useVPNState } from '@/context/VPNStateContext';

export type AppTab = 'home' | 'vpn' | 'filterLists' | 'rules' | 'settings';

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 320;
export const SIDEBAR_COLLAPSED_WIDTH = 52;
const COLLAPSE_SLOP = 56;
const CLICK_THRESHOLD = 4;
const TOOLTIP_OPEN_DELAY = 200;
const TOOLTIP_SKIP_WINDOW = 300;

const items: { id: AppTab; icon: IconName }[] = [
  { id: 'home', icon: 'applications' },
  { id: 'vpn', icon: 'globe-network' },
  { id: 'filterLists', icon: 'filter' },
  { id: 'rules', icon: 'code' },
  { id: 'settings', icon: 'cog' },
];

interface NavigationProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  width: number;
  onWidthChange: (width: number) => void;
  onResizingChange?: (resizing: boolean) => void;
}

export function Navigation({
  active,
  onChange,
  open,
  onOpenChange,
  width,
  onWidthChange,
  onResizingChange,
}: NavigationProps) {
  const { t } = useTranslation();
  const { proxyState } = useProxyState();
  const { isConnected, isTransitioning } = useVPNState();

  const [hovered, setHovered] = useState<number | null>(null);
  const [lastHovered, setLastHovered] = useState<number>(0);
  const [canSlideHover, setCanSlideHover] = useState(false);
  const [collapsePreview, setCollapsePreview] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipTop, setTooltipTop] = useState(0);

  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipTimer = useRef<number | null>(null);
  const lastClosedAt = useRef<number>(0);
  const selected = Math.max(0, items.findIndex((item) => item.id === active));
  const isProxyActive = proxyState === 'on';

  const clearTooltipTimer = useCallback(() => {
    if (tooltipTimer.current !== null) {
      window.clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
  }, []);

  useEffect(() => clearTooltipTimer, [clearTooltipTimer]);

  const updateHover = useCallback(
    (index: number | null) => {
      clearTooltipTimer();
      if (index === null) {
        setHovered(null);
        setCanSlideHover(false);
        setTooltipOpen((prev) => {
          if (prev) lastClosedAt.current = performance.now();
          return false;
        });
        return;
      }

      setCanSlideHover(hovered !== null && hovered !== index);
      setHovered(index);
      setLastHovered(index);

      if (!open) {
        const el = rowRefs.current[index];
        if (el) {
          const rect = el.getBoundingClientRect();
          setTooltipTop(rect.top + rect.height / 2);
        }
        const withinSkipWindow =
          tooltipOpen || performance.now() - lastClosedAt.current < TOOLTIP_SKIP_WINDOW;
        if (withinSkipWindow) {
          setTooltipOpen(true);
        } else {
          tooltipTimer.current = window.setTimeout(() => {
            setTooltipOpen(true);
          }, TOOLTIP_OPEN_DELAY);
        }
      } else {
        setTooltipOpen(false);
      }
    },
    [hovered, open, tooltipOpen, clearTooltipTimer],
  );

  // Fluid hover: pick row whose vertical center is nearest pointer (gaps included)
  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    let bestIdx: number | null = null;
    let bestDist = Infinity;
    rowRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(e.clientY - (rect.top + rect.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    if (bestIdx !== null && bestIdx !== hovered) {
      updateHover(bestIdx);
    }
  };

  // Drag-resize rail: click (<4px) toggles, drag clamps [160..320], drag >=56px past min collapses
  const handleRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = open ? width : SIDEBAR_COLLAPSED_WIDTH;
    let moved = false;
    let willCollapse = false;

    onResizingChange?.(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) >= CLICK_THRESHOLD) moved = true;
      if (!moved) return;

      const raw = startWidth + dx;
      willCollapse = raw <= SIDEBAR_MIN_WIDTH - COLLAPSE_SLOP;
      setCollapsePreview(open && willCollapse);
      if (!willCollapse) {
        if (!open) onOpenChange(true);
        onWidthChange(Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, raw)));
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onResizingChange?.(false);
      setCollapsePreview(false);

      if (!moved) {
        onOpenChange(!open);
      } else if (willCollapse) {
        onOpenChange(false);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <nav
      id="app-sidebar"
      className={`sidebar ${open ? 'is-open' : 'is-collapsed'} ${collapsePreview ? 'is-collapse-preview' : ''}`}
      aria-label={t('ui.navigation')}
    >
      <div className="sidebar__inner">
        <div
          className="navigation-track"
          style={
            {
              '--nav-active': selected,
              '--nav-hover': lastHovered,
            } as CSSProperties
          }
          onPointerMove={handleTrackPointerMove}
          onPointerLeave={() => updateHover(null)}
        >
          <span
            className={`navigation-hover ${hovered !== null ? 'is-visible' : ''} ${canSlideHover ? 'can-slide' : ''}`}
            aria-hidden="true"
          />
          <span className="navigation-active" aria-hidden="true" />
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              type="button"
              className="navigation-item"
              aria-current={active === item.id ? 'page' : undefined}
              aria-label={item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)}
              title={
                open
                  ? `${item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)} (Ctrl+${index + 1})`
                  : undefined
              }
              onFocus={() => updateHover(index)}
              onBlur={() => updateHover(null)}
              onClick={() => onChange(item.id)}
            >
              <Icon icon={item.icon} size={15} />
              <span className="navigation-item__label">
                {item.id === 'home' ? t('ui.overview') : t(`app.tabs.${item.id}`)}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-status">
          <div
            className="sidebar-status__item"
            title={`Ad Shield: ${isProxyActive ? 'Active' : 'Paused'}`}
          >
            <span className="sidebar-status__label">Ad Shield</span>
            <span className={`sidebar-status__dot ${isProxyActive ? 'is-active' : ''}`} />
          </div>
          <div
            className="sidebar-status__item"
            title={`VPN Tunnel: ${isConnected ? 'Connected' : isTransitioning ? 'Connecting' : 'Disconnected'}`}
          >
            <span className="sidebar-status__label">VPN Tunnel</span>
            <span
              className={`sidebar-status__dot ${isConnected ? 'is-active' : ''}`}
              style={{
                backgroundColor: isTransitioning ? 'var(--warning)' : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {!open && (
        <div
          role="tooltip"
          className={`sidebar-tooltip ${tooltipOpen ? 'is-visible' : ''}`}
          style={{ top: `${tooltipTop}px` }}
          aria-hidden={!tooltipOpen}
        >
          {items[lastHovered]?.id === 'home'
            ? t('ui.overview')
            : t(`app.tabs.${items[lastHovered]?.id ?? 'home'}`)}
        </div>
      )}

      <div
        className="sidebar__rail"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize or toggle sidebar"
        title="Drag to resize · Click to toggle ([)"
        onPointerDown={handleRailPointerDown}
      />
    </nav>
  );
}
