import { Collapse, Icon } from '@blueprintjs/core';
import NumberFlow from '@number-flow/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FluidSelect } from '@/components/FluidSelect';
import { FilterAction, FilterActionKind, useProxyState } from '@/context/ProxyStateContext';
import { getCurrentLocale } from '@/i18n';
import './index.css';

const MAX_LOGS = 200;

export function RequestLog() {
  const { t } = useTranslation();
  const { logs, isLogsPaused: isPaused, setIsLogsPaused: setIsPaused, clearLogs } = useProxyState();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const displayedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  const startIdx = logs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, logs.length);

  return (
    <div className="request-log">
      <div className="request-log__toolbar">
        <div className="request-log__toolbar-left">
          <div className="request-log__status-pill">
            <span className={`request-log__status-dot ${isPaused ? 'request-log__status-dot--paused' : ''}`} />
            <span>
              <NumberFlow value={logs.length} trend={1} /> logged{logs.length >= MAX_LOGS ? ' (buffer full)' : ''}
            </span>
          </div>

          <button
            type="button"
            className={`request-log__btn ${isPaused ? 'request-log__btn--paused' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live stream' : 'Pause live stream'}
          >
            <Icon icon={isPaused ? 'play' : 'pause'} size={12} />
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            className="request-log__btn"
            disabled={logs.length === 0}
            onClick={() => {
              clearLogs();
              setPage(1);
            }}
            title="Clear all logged events from memory"
          >
            <Icon icon="trash" size={12} />
            <span>Clear</span>
          </button>
        </div>

        <div className="request-log__toolbar-right">
          <FluidSelect
            aria-label="Items per page"
            value={String(pageSize)}
            onChange={(val) => {
              setPageSize(Number(val));
              setPage(1);
            }}
            options={[
              { value: '15', label: '15 / page' },
              { value: '30', label: '30 / page' },
              { value: '50', label: '50 / page' },
            ]}
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="request-log__empty">
          <Icon icon="pulse" size={20} className="request-log__empty-icon" />
          <span>{t('requestLog.emptyState')}</span>
        </div>
      ) : (
        <>
          <div className="request-log__list">
            {displayedLogs.map((log) => (
              <RequestLogRow log={log} key={log.id} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="request-log__pagination">
              <span>
                Showing {startIdx}-{endIdx} of {logs.length}
              </span>
              <div className="request-log__pagination-controls">
                <button
                  type="button"
                  className="request-log__btn request-log__btn--icon"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <Icon icon="chevron-left" size={14} />
                </button>
                <span className="request-log__pagination-page">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="request-log__btn request-log__btn--icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                  aria-label="Next page"
                >
                  <Icon icon="chevron-right" size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getKindClass(kind: FilterActionKind): string {
  switch (kind) {
    case FilterActionKind.Block:
      return 'request-log__kind--danger';
    case FilterActionKind.Modify:
    case FilterActionKind.Redirect:
      return 'request-log__kind--warning';
    default:
      return 'request-log__kind--neutral';
  }
}

function RequestLogRow({ log }: { log: FilterAction }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { hostname } = new URL(log.url, 'http://foo');
  const hasProcessId = log.process.id > 0;
  const hasProcessPath = Boolean(log.process.diskPath);

  return (
    <div className="request-log__item">
      <button
        type="button"
        className={`request-log__row ${isOpen ? 'request-log__row--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div className="request-log__row-main">
          <span className={`request-log__kind ${getKindClass(log.kind)}`}>{log.kind}</span>
          <span className="request-log__hostname" title={hostname}>
            {hostname}
          </span>
          {log.process.name && (
            <span className="request-log__process" title={log.process.name}>
              {log.process.name}
            </span>
          )}
        </div>
        <div className="request-log__row-meta">
          <span className="request-log__time">
            {log.createdAt.toLocaleTimeString(getCurrentLocale(), { timeStyle: 'short' })}
          </span>
          <Icon
            icon="chevron-right"
            size={12}
            className={`request-log__chevron ${isOpen ? 'request-log__chevron--open' : ''}`}
          />
        </div>
      </button>

      <Collapse isOpen={isOpen}>
        <div className="request-log__details">
          <div className="request-log__section">
            <div className="request-log__section-header">
              <span className="request-log__section-title">{t('requestLog.request')}</span>
            </div>
            <div className="request-log__meta-row">
              <div className="request-log__kv-chip">
                <span className="request-log__kv-chip-key">{t('requestLog.method')}</span>
                <span className="request-log__kv-chip-val">{log.method}</span>
              </div>
            </div>
            <div className="request-log__field">
              <span className="request-log__field-label">{t('requestLog.url')}</span>
              <span className="request-log__field-value">{log.url}</span>
            </div>
            {log.kind === FilterActionKind.Redirect && (
              <div className="request-log__field">
                <span className="request-log__field-label">{t('requestLog.redirectedTo')}</span>
                <span className="request-log__field-value">{log.to}</span>
              </div>
            )}
            {log.referer && (
              <div className="request-log__field">
                <span className="request-log__field-label">{t('requestLog.referer')}</span>
                <span className="request-log__field-value">{log.referer}</span>
              </div>
            )}
          </div>

          <div className="request-log__section">
            <div className="request-log__section-header">
              <span className="request-log__section-title">{t('requestLog.process')}</span>
            </div>
            <div className="request-log__meta-row">
              {hasProcessId && (
                <div className="request-log__kv-chip">
                  <span className="request-log__kv-chip-key">PID</span>
                  <span className="request-log__kv-chip-val">{log.process.id}</span>
                </div>
              )}
              <div className="request-log__kv-chip" title={log.process.name}>
                <span className="request-log__kv-chip-key">{t('requestLog.processName')}</span>
                <span className="request-log__kv-chip-val">{log.process.name}</span>
              </div>
            </div>
            {hasProcessPath && (
              <div className="request-log__field">
                <span className="request-log__field-label">{t('requestLog.processPath')}</span>
                <span className="request-log__field-value">{log.process.diskPath}</span>
              </div>
            )}
          </div>

          <div className="request-log__section">
            <div className="request-log__section-header">
              <span className="request-log__section-title">{t('requestLog.rules')}</span>
              <span className="request-log__count-badge">
                <NumberFlow value={log.rules.length} />
              </span>
            </div>
            <div className="request-log__rules">
              {log.rules.map((rule) => (
                <div className="request-log__rule-row" key={`${rule.filterName}-${rule.rawRule}`}>
                  <span className="request-log__rule-filter">{rule.filterName}</span>
                  <code className="request-log__rule-raw">{rule.rawRule}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

function id(): string {
  return Math.random().toString(36).slice(2, 9);
}
