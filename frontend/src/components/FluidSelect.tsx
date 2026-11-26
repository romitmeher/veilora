import { Icon } from '@blueprintjs/core';
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FluidSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface FluidSelectProps {
  value: string;
  options: FluidSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  'aria-label'?: string;
}

const ROW_HEIGHT = 30;
const POPUP_PADDING = 4;

export function FluidSelect({
  value,
  options,
  onChange,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  className = '',
  'aria-label': ariaLabel,
}: FluidSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number; flip: boolean }>({
    top: 0,
    left: 0,
    minWidth: 140,
    flip: false,
  });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [lastHoveredIdx, setLastHoveredIdx] = useState<number>(0);
  const [canSlideHover, setCanSlideHover] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }, [options, searchable, searchQuery]);

  const filteredSelectedIdx = Math.max(
    0,
    filteredOptions.findIndex((opt) => opt.value === value),
  );

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const extraSearch = searchable ? 38 : 0;
    const estimatedHeight = Math.min(300, options.length * ROW_HEIGHT + POPUP_PADDING * 2 + extraSearch);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const flip = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setCoords({
      top: flip ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, searchable ? 210 : 140),
      flip,
    });
  }, [options.length, searchable]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setSearchQuery('');
    updatePosition();
    setHoveredIdx(null);
    setCanSlideHover(false);
    setLastHoveredIdx(Math.max(0, options.findIndex((opt) => opt.value === value)));
    setOpen(true);
    if (searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [disabled, options, searchable, updatePosition, value]);

  useEffect(() => {
    rowRefs.current = [];
    setHoveredIdx(filteredOptions.length > 0 && searchQuery ? 0 : null);
    setLastHoveredIdx(0);
    setCanSlideHover(false);
  }, [searchQuery, filteredOptions.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
        e.preventDefault();
        setHoveredIdx((prev) => {
          const next = prev === null ? filteredSelectedIdx : (prev + 1) % filteredOptions.length;
          setCanSlideHover(prev !== null);
          setLastHoveredIdx(next);
          return next;
        });
      } else if (e.key === 'ArrowUp' && filteredOptions.length > 0) {
        e.preventDefault();
        setHoveredIdx((prev) => {
          const next =
            prev === null ? filteredSelectedIdx : (prev - 1 + filteredOptions.length) % filteredOptions.length;
          setCanSlideHover(prev !== null);
          setLastHoveredIdx(next);
          return next;
        });
      } else if (e.key === 'Enter' && hoveredIdx !== null) {
        const opt = filteredOptions[hoveredIdx];
        if (opt) {
          e.preventDefault();
          onChange(opt.value);
          setOpen(false);
          triggerRef.current?.focus();
        }
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, hoveredIdx, filteredSelectedIdx, filteredOptions, onChange, updatePosition]);

  const handleListPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (bestIdx !== null && bestIdx !== hoveredIdx) {
      setCanSlideHover(hoveredIdx !== null);
      setHoveredIdx(bestIdx);
      setLastHoveredIdx(bestIdx);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`fluid-select__trigger ${open ? 'is-open' : ''} ${className}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="fluid-select__label" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          {selectedOption?.icon}
          <span>{selectedOption?.label ?? ''}</span>
        </span>
        <Icon icon="chevron-down" size={12} className="fluid-select__chevron" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            className={`fluid-select__popup ${coords.flip ? 'is-flipped' : ''}`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              minWidth: `${coords.minWidth}px`,
            }}
          >
            {searchable && (
              <div className="fluid-select__search">
                <Icon icon="search" size={12} className="fluid-select__search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="fluid-select__search-input"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="fluid-select__search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear filter"
                  >
                    <Icon icon="cross" size={11} />
                  </button>
                )}
              </div>
            )}

            <div
              className="fluid-select__list"
              style={
                {
                  '--select-hover': lastHoveredIdx,
                } as CSSProperties
              }
              onPointerMove={handleListPointerMove}
              onPointerLeave={() => {
                setHoveredIdx(null);
                setCanSlideHover(false);
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="fluid-select__empty">No matches</div>
              ) : (
                <>
                  <span
                    className={`fluid-select__hover ${hoveredIdx !== null ? 'is-visible' : ''} ${canSlideHover ? 'can-slide' : ''}`}
                    aria-hidden="true"
                  />
                  {filteredOptions.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        ref={(el) => {
                          rowRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`fluid-select__option ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                          triggerRef.current?.focus();
                        }}
                      >
                        <span className="fluid-select__check" aria-hidden="true">
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className="fluid-select__option-label"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
