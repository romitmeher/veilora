import { useState } from 'react';

const regionNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

export function getCountryDisplayName(
  code: string,
  nameMap?: ReadonlyMap<string, string>,
): string {
  const upper = code?.trim().toUpperCase();
  if (!upper) return '';
  const fromMap = nameMap?.get(upper);
  if (fromMap) return fromMap;
  if (upper.length === 2 && regionNames) {
    try {
      return regionNames.of(upper) || upper;
    } catch {
      return upper;
    }
  }
  return upper;
}

export function parseRegionalTitle(name: string): { codes: string[]; title: string } {
  const match = name.match(/^((?:[\u{1F1E6}-\u{1F1FF}]{2}[A-Z]{2}\s*)+):\s*(.+)$/u);
  if (!match) return { codes: [], title: name };
  const codes = Array.from(match[1].matchAll(/[A-Z]{2}/g), (m) => m[0]);
  return { codes, title: match[2] };
}

export function emojiFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function OfficialFlag({ code, title }: { code: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  const clean = code?.trim().toLowerCase();
  if (!clean || clean.length !== 2 || failed) {
    return (
      <span className="vpn-td__flag-fallback" title={title ?? code}>
        {emojiFlag(code)}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/${clean}.svg`}
      alt={title ?? code.toUpperCase()}
      title={title ?? code.toUpperCase()}
      loading="lazy"
      className="vpn-td__flag-img"
      onError={() => setFailed(true)}
    />
  );
}
