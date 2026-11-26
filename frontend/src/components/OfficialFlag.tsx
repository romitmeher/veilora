import { useState } from 'react';

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
