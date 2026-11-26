import {
  Spinner,
  Button,
  MenuItem,
  Popover,
  Menu,
  MenuDivider,
  Tag,
  Tooltip,
  Icon,
} from '@blueprintjs/core';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AppToaster } from '@/common/toaster';
import { FluidSwitch } from '@/components/FluidSwitch';
import { OfficialFlag } from '@/components/OfficialFlag';
import { useProxyState } from '@/context/ProxyStateContext';
import { GetFilterLists, RemoveFilterList, ToggleFilterList } from 'wails/go/config/Config';
import { config } from 'wails/go/models';
import { BrowserOpenURL } from 'wails/runtime/runtime';

import { CreateFilterList } from './CreateFilterList';
import { ExportFilterList } from './ExportFilterList';
import { ImportFilterList } from './ImportFilterList';
import { FilterListType } from './types';

import './index.css';

const NO_DOOMSCROLL_URL = 'https://github.com/irbis-sh/filter-lists/blob/master/no-doomscroll/readme.md';

export function FilterLists() {
  const { t } = useTranslation();
  const [state, setState] = useState<{
    filterLists: config.FilterList[];
    loading: boolean;
  }>({
    filterLists: [],
    loading: true,
  });

  const [type, setType] = useState<FilterListType>(FilterListType.GENERAL);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLists = useCallback(async () => {
    try {
      const filterLists = await GetFilterLists();
      setState({ filterLists: filterLists ?? [], loading: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    GetFilterLists()
      .then((lists) => {
        if (active) setState({ filterLists: lists ?? [], loading: false });
      })
      .catch(() => {
        if (active) setState((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => [
    { id: FilterListType.GENERAL, label: t('filterTypes.general') },
    { id: FilterListType.ADS, label: t('filterTypes.ads') },
    { id: FilterListType.PRIVACY, label: t('filterTypes.privacy') },
    { id: FilterListType.MALWARE, label: t('filterTypes.malware') },
    { id: FilterListType.REGIONAL, label: t('filterTypes.regional') },
    { id: FilterListType.DIGITAL_WELLBEING, label: t('filterTypes.digitalWellbeing') },
    { id: FilterListType.CUSTOM, label: t('filterTypes.custom') },
  ], [t]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const visibleLists = useMemo(() => {
    if (isSearching) {
      return state.filterLists.filter((item) =>
        `${item.name} ${item.url} ${item.type}`.toLowerCase().includes(trimmedQuery),
      );
    }
    return state.filterLists.filter((item) => item.type === type);
  }, [state.filterLists, type, trimmedQuery, isSearching]);

  return (
    <div className="filter-lists-view">
      {/* 1. Category Switcher & Actions Toolbar */}
      <div className="filter-lists-toolbar">
        <div className="filter-lists-categories" role="tablist">
          {categories.map((cat) => {
            const count = state.filterLists.filter((item) => item.type === cat.id && item.enabled).length;
            const total = state.filterLists.filter((item) => item.type === cat.id).length;
            const isActive = !isSearching && type === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`filter-category-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  if (isSearching) setSearchQuery('');
                  setType(cat.id);
                }}
              >
                <span>{cat.label}</span>
                <span className="bp6-text-muted" style={{ fontSize: '10px' }}>
                  ({count}/{total})
                </span>
              </button>
            );
          })}
        </div>

        <div className="filter-lists-toolbar__actions">
          <div className="filter-lists-search">
            <Icon icon="search" size={12} className="filter-lists-search__icon" />
            <input
              placeholder="Search all filters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search all filter lists"
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-lists-search__clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <Icon icon="cross" size={12} />
              </button>
            )}
          </div>

          {type === FilterListType.DIGITAL_WELLBEING && (
            <Button
              variant="outlined"
              icon="help"
              onClick={() => BrowserOpenURL(NO_DOOMSCROLL_URL)}
            >
              About
            </Button>
          )}

          {type === FilterListType.CUSTOM && (
            <Popover
              content={
                <Menu>
                  <ExportFilterList />
                  <ImportFilterList onAdd={fetchLists} />
                </Menu>
              }
            >
              <Button icon="more" variant="outlined" text="Manage" />
            </Popover>
          )}
        </div>
      </div>

      {/* 2. Compact List Container */}
      <div className="filter-lists-container">
        {state.loading ? (
          <div className="filter-lists-empty">
            <Spinner size={20} />
            <span style={{ marginTop: '8px', display: 'block' }}>Loading filter subscriptions…</span>
          </div>
        ) : visibleLists.length === 0 ? (
          <div className="filter-lists-empty">
            {searchQuery ? 'No filter lists match your search.' : 'No filter lists in this category.'}
          </div>
        ) : (
          visibleLists.map((filterList) => (
            <FilterListCompactRow
              key={filterList.url}
              filterList={filterList}
              showCategoryBadge={isSearching}
              showDelete={filterList.type === FilterListType.CUSTOM}
              onRemoved={fetchLists}
              onToggled={fetchLists}
            />
          ))
        )}
      </div>

      {type === FilterListType.CUSTOM && (
        <CreateFilterList onAdd={fetchLists} />
      )}
    </div>
  );
}

function parseRegionalTitle(name: string): { codes: string[]; title: string } {
  const match = name.match(/^((?:[\u{1F1E6}-\u{1F1FF}]{2}[A-Z]{2}\s*)+):\s*(.+)$/u);
  if (!match) return { codes: [], title: name };
  const codes = Array.from(match[1].matchAll(/[A-Z]{2}/g), (m) => m[0]);
  return { codes, title: match[2] };
}

export function FilterListCompactRow({
  filterList,
  showCategoryBadge,
  showDelete,
  onRemoved,
  onToggled,
}: {
  filterList: config.FilterList;
  showCategoryBadge?: boolean;
  showDelete?: boolean;
  showButtons?: boolean;
  onRemoved?: () => void;
  onToggled?: () => void;
}) {
  const { t } = useTranslation();
  const { isProxyRunning } = useProxyState();
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(filterList.enabled);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(filterList.url);
      AppToaster.show({ message: 'Filter list URL copied to clipboard', intent: 'success' });
    } catch {
      AppToaster.show({ message: 'Failed to copy URL', intent: 'danger' });
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await RemoveFilterList(filterList.url);
      AppToaster.show({ message: 'Filter list removed', intent: 'success' });
      onRemoved?.();
    } catch (err) {
      AppToaster.show({
        message: t('filterLists.deleteError', { error: String(err) }),
        intent: 'danger',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const { codes, title } = useMemo(() => parseRegionalTitle(filterList.name), [filterList.name]);

  return (
    <div className="filter-row">
      <div className="filter-row__info">
        <div className="filter-row__title-line">
          {codes.length > 0 && (
            <span className="filter-row__flags">
              {codes.map((c) => (
                <OfficialFlag key={c} code={c} />
              ))}
            </span>
          )}
          <span className="filter-row__name">{title}</span>
          {showCategoryBadge && (
            <span className={`filter-row__category-badge filter-row__category-badge--${filterList.type}`}>
              {t(`filterTypes.${filterList.type}`)}
            </span>
          )}
          {filterList.trusted && (
            <Tag intent="success" minimal>
              Trusted
            </Tag>
          )}
        </div>
        <span className="filter-row__url" title={filterList.url}>
          {filterList.url}
        </span>
      </div>

      <div className="filter-row__actions">
        <Tooltip
          content={t('common.stopProxyToToggleFilter') as string}
          disabled={!isProxyRunning}
          placement="left"
        >
          <FluidSwitch
            checked={switchChecked}
            disabled={switchLoading || isProxyRunning}
            aria-label={filterList.name}
            onChange={async (checked) => {
              setSwitchLoading(true);
              const initial = switchChecked;
              setSwitchChecked(checked);
              try {
                await ToggleFilterList(filterList.url, checked);
              } catch (err) {
                setSwitchChecked(initial);
                AppToaster.show({
                  message: t('filterLists.toggleError', { error: String(err) }),
                  intent: 'danger',
                });
              } finally {
                setSwitchLoading(false);
                onToggled?.();
              }
            }}
          />
        </Tooltip>

        <Popover
          content={
            <Menu>
              <MenuItem icon="duplicate" text="Copy Link" onClick={copyUrl} />
              <MenuItem
                icon="share"
                text="Open in Browser"
                onClick={() => BrowserOpenURL(filterList.url)}
              />
              {showDelete && (
                <>
                  <MenuDivider />
                  <MenuItem
                    icon="trash"
                    intent="danger"
                    text="Delete List"
                    disabled={deleteLoading || isProxyRunning}
                    onClick={handleDelete}
                  />
                </>
              )}
            </Menu>
          }
          placement="bottom-end"
        >
          <button type="button" className="filter-row__menu-btn" aria-label="List options">
            <Icon icon="more" size={14} />
          </button>
        </Popover>
      </div>
    </div>
  );
}

// Re-export alias for compatibility with onboarding screen
export const FilterListItem = FilterListCompactRow;
