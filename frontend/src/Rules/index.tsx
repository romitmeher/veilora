import { Button, Tag, Tooltip, Icon } from '@blueprintjs/core';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';

import { useProxyState } from '@/context/ProxyStateContext';
import { GetRules, SetRules } from 'wails/go/config/Config';
import { BrowserOpenURL } from 'wails/runtime/runtime';

import './index.css';

const HELP_URL = 'https://github.com/irbis-sh/zen-desktop/blob/master/docs/external/how-to-rules.md';

export function Rules() {
  const { t } = useTranslation();
  const { isProxyRunning } = useProxyState();
  const [rules, setRules] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(Date.now());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const filters = await GetRules();
        if (filters !== null) {
          setRules(filters.join('\n'));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveRulesDebounced = useDebouncedCallback(async (val: string) => {
    setIsSaving(true);
    try {
      const cleanList = val
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
      await SetRules(cleanList);
      setLastSaved(Date.now());
    } finally {
      setIsSaving(false);
    }
  }, 400);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRules(val);
    saveRulesDebounced(val);
  };

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = useMemo(() => {
    return rules.split('\n');
  }, [rules]);

  const activeRulesCount = useMemo(() => {
    return lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('!') && !trimmed.startsWith('#');
    }).length;
  }, [lines]);

  return (
    <div className="rules-view">
      {/* 1. Editor Toolbar */}
      <div className="rules-toolbar">
        <div className="rules-toolbar__left">
          <Tag minimal round>
            {activeRulesCount} active {activeRulesCount === 1 ? 'rule' : 'rules'}
          </Tag>
          <span className={`rules-save-state ${!isSaving && lastSaved ? 'is-saved' : ''}`}>
            <Icon icon={isSaving ? 'refresh' : 'saved'} size={12} />
            <span>{isSaving ? 'Saving…' : 'Saved'}</span>
          </span>
        </div>

        <div className="rules-toolbar__right">
          <Button
            variant="outlined"
            icon="help"
            size="small"
            onClick={() => BrowserOpenURL(HELP_URL)}
          >
            Syntax Guide
          </Button>
          <Button
            variant="minimal"
            icon="trash"
            size="small"
            disabled={isProxyRunning || !rules}
            onClick={() => {
              setRules('');
              saveRulesDebounced('');
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* 2. Code-like Editor Frame */}
      <Tooltip
        content={t('common.stopProxyToEditRules') as string}
        disabled={!isProxyRunning}
        placement="top"
        fill
      >
        <div className="rules-editor-frame">
          <div className="rules-gutter" ref={gutterRef} aria-hidden="true">
            {lines.map((_, idx) => (
              <div key={idx} className="rules-gutter-line">
                {idx + 1}
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            className="rules-textarea"
            placeholder={
              loading
                ? 'Loading custom rules…'
                : '! Add custom ad-blocking rules here (one per line)\n||example.com^\n@@||allowed-domain.com^'
            }
            value={rules}
            disabled={isProxyRunning || loading}
            onChange={handleTextChange}
            onScroll={handleScroll}
            spellCheck={false}
          />
        </div>
      </Tooltip>

      {/* 3. Syntax Helper Footer */}
      <div className="rules-syntax-bar">
        <div className="rules-syntax-hints">
          <span><code>||domain^</code> Block domain</span>
          <span><code>@@||domain^</code> Allow domain</span>
          <span><code>!</code> Comment</span>
        </div>
        <span>Adblock Plus syntax compatible</span>
      </div>
    </div>
  );
}
