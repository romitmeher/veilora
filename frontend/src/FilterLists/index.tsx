import {
  Spinner,
  Switch,
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
    { id: FilterListType.REGIONAL, label: t('filterTypes.regional') },
    { id: FilterListType.DIGITAL_WELLBEING, label: t('filterTypes.digitalWellbeing') },
    { id: FilterListType.CUSTOM, label: t('filterTypes.custom') },
  ], [t]);

  const visibleLists = useMemo(() => {
    let list = state.filterLists.filter((item) => item.type === type);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) =>
        `${item.name} ${item.url}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [state.filterLists, type, searchQuery]);

  return (
    <div className="filter-lists-view">
      {/* 1. Category Switcher & Actions Toolbar */}
      <div className="filter-lists-toolbar">
        <div className="filter-lists-categories" role="tablist">
          {categories.map((cat) => {
            const count = state.filterLists.filter((item) => item.type === cat.id && item.enabled).length;
            const total = state.filterLists.filter((item) => item.type === cat.id).length;
            const isActive = type === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`filter-category-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setType(cat.id)}
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
              placeholder="Search filters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search filter lists"
            />
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
              showDelete={type === FilterListType.CUSTOM}
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

export function FilterListCompactRow({
  filterList,
  showDelete,
  onRemoved,
  onToggled,
}: {
  filterList: config.FilterList;
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

  return (
    <div className="filter-row">
      <div className="filter-row__info">
        <div className="filter-row__title-line">
          <span className="filter-row__name">{filterList.name}</span>
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
          <Switch
            checked={switchChecked}
            disabled={switchLoading || isProxyRunning}
            onChange={async (e) => {
              setSwitchLoading(true);
              const initial = switchChecked;
              const { checked } = e.currentTarget;
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
