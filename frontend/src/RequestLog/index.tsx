import { CardList, Card, Tag, Collapse, Intent, CompoundTag, HTMLTable, Button } from '@blueprintjs/core';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { FluidSelect } from '@/components/FluidSelect';

import { getCurrentLocale } from '@/i18n';
import { EventsOn } from 'wails/runtime';
import './index.css';

interface Rule {
  filterName: string;
  rawRule: string;
}

interface Process {
  id: number;
  name: string;
  diskPath: string;
}

enum FilterActionKind {
  Block = 'block',
  Redirect = 'redirect',
  Modify = 'modify',
}

interface FilterAction {
  id: string;
  kind: FilterActionKind;
  method: string;
  url: string;
  to: string;
  referer: string;
  rules: Rule[];
  process: Process;
  createdAt: Date;
}

const MAX_LOGS = 500;

export function RequestLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<FilterAction[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    const cancel = EventsOn('filter:action', (action: Omit<FilterAction, 'id' | 'createdAt'>) => {
      if (isPaused) return;
      setLogs((prev) =>
        [
          {
            ...action,
            id: id(),
            createdAt: new Date(),
          },
          ...prev,
        ].slice(0, MAX_LOGS),
      );
    });

    return () => {
      cancel();
    };
  }, [isPaused]);

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
      {/* Memory management toolbar: buffer gauge, pause stream, clear log, page size */}
      <div className="request-log__toolbar">
        <div className="request-log__toolbar-left">
          <span>
            {logs.length} logged {logs.length >= MAX_LOGS ? '(buffer full)' : ''}
          </span>
          <Button
            size="small"
            variant="minimal"
            icon={isPaused ? 'play' : 'pause'}
            intent={isPaused ? 'warning' : 'none'}
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live stream' : 'Pause live stream'}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            size="small"
            variant="minimal"
            icon="trash"
            disabled={logs.length === 0}
            onClick={() => {
              setLogs([]);
              setPage(1);
            }}
            title="Clear all logged events from memory"
          >
            Clear
          </Button>
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
        <p className="request-log__empty">{t('requestLog.emptyState')}</p>
      ) : (
        <>
          <CardList compact>
            {displayedLogs.map((log) => (
              <RequestLogCard log={log} key={log.id} />
            ))}
          </CardList>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="request-log__pagination">
              <div className="request-log__pagination-info">
                Showing {startIdx}–{endIdx} of {logs.length}
              </div>
              <div className="request-log__pagination-controls">
                <Button
                  size="small"
                  variant="minimal"
                  icon="chevron-left"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                />
                <span className="request-log__pagination-page">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="small"
                  variant="minimal"
                  icon="chevron-right"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestLogCard({ log }: { log: FilterAction }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { hostname } = new URL(log.url, 'http://foo');

  let tagIntent: Intent;
  switch (log.kind) {
    case FilterActionKind.Block:
      tagIntent = Intent.DANGER;
      break;
    case FilterActionKind.Modify:
      tagIntent = Intent.WARNING;
      break;
    case FilterActionKind.Redirect:
      tagIntent = Intent.WARNING;
      break;
    default:
      tagIntent = Intent.NONE;
  }

  const hasProcessId = log.process.id > 0;
  const hasProcessPath = Boolean(log.process.diskPath);

  return (
    <>
      <Card key={log.id} className="request-log__card" interactive onClick={() => setIsOpen(!isOpen)}>
        <div className="request-log__card__summary">
          <Tag minimal intent={tagIntent}>
            {hostname}
          </Tag>
          <Tag minimal className="request-log__card__process-tag" title={log.process.name}>
            {log.process.name}
          </Tag>
        </div>
        <div className="bp6-text-muted">
          {log.createdAt.toLocaleTimeString(getCurrentLocale(), { timeStyle: 'short' })}
        </div>
      </Card>

      <Collapse isOpen={isOpen}>
        <Card className="request-log__card__details" compact>
          <div className="request-log__card__details__section">
            <div className="request-log__card__details__section-header">
              <div className="request-log__card__details__section-title">{t('requestLog.request')}</div>
            </div>
            <div className="request-log__card__details__group">
              <div className="request-log__card__details__field request-log__card__details__field--tag">
                <div className="request-log__card__details__value">
                  <CompoundTag leftContent={t('requestLog.method')} minimal>
                    {log.method}
                  </CompoundTag>
                </div>
              </div>
              <div className="request-log__card__details__field request-log__card__details__field--text">
                <div className="request-log__card__details__label">{t('requestLog.url')}:</div>
                <div className="request-log__card__details__value">{log.url}</div>
              </div>
              {log.kind === FilterActionKind.Redirect && (
                <div className="request-log__card__details__field request-log__card__details__field--text">
                  <div className="request-log__card__details__label">{t('requestLog.redirectedTo')}:</div>
                  <div className="request-log__card__details__value">{log.to}</div>
                </div>
              )}
              {log.referer && (
                <div className="request-log__card__details__field request-log__card__details__field--text">
                  <div className="request-log__card__details__label">{t('requestLog.referer')}:</div>
                  <div className="request-log__card__details__value">{log.referer}</div>
                </div>
              )}
            </div>
          </div>
          <div className="request-log__card__details__section">
            <div className="request-log__card__details__section-header">
              <div className="request-log__card__details__section-title">{t('requestLog.process')}</div>
            </div>
            <div className="request-log__card__details__group">
              <div className="request-log__card__details__field request-log__card__details__field--tag request-log__card__details__field--process-summary">
                <div className="request-log__card__details__value">
                  {hasProcessId && (
                    <CompoundTag leftContent="PID" minimal>
                      {log.process.id}
                    </CompoundTag>
                  )}
                  <CompoundTag
                    leftContent={t('requestLog.processName')}
                    minimal
                    className="request-log__card__details__process-name-tag"
                    title={log.process.name}
                  >
                    {log.process.name}
                  </CompoundTag>
                </div>
              </div>
              {hasProcessPath && (
                <div className="request-log__card__details__field request-log__card__details__field--text">
                  <div className="request-log__card__details__label">{t('requestLog.processPath')}:</div>
                  <div className="request-log__card__details__value">{log.process.diskPath}</div>
                </div>
              )}
            </div>
          </div>
          <div className="request-log__card__details__section">
            <div className="request-log__card__details__section-header">
              <div className="request-log__card__details__section-title">{t('requestLog.rules')}</div>
              <Tag minimal>{log.rules.length}</Tag>
            </div>
            <HTMLTable bordered compact striped className="request-log__card__details__rules">
              <thead>
                <tr>
                  <th>{t('requestLog.filterName')}</th>
                  <th>{t('requestLog.rule')}</th>
                </tr>
              </thead>
              <tbody>
                {log.rules.map((rule) => (
                  <tr key={rule.rawRule}>
                    <td>{rule.filterName}</td>
                    <td>{rule.rawRule}</td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </div>
        </Card>
      </Collapse>
    </>
  );
}

function id(): string {
  return Math.random().toString(36).slice(2, 9);
}
