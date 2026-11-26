import { Icon } from '@blueprintjs/core';
import { useEffect, useRef, useState } from 'react';

interface FluidCopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

function copyFallback(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function FluidCopyButton({ value, label = 'Copy', className = '' }: FluidCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      ok = copyFallback(value);
    }
    if (ok) {
      setCopied(true);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <button
      type="button"
      className={`fluid-copy-btn ${copied ? 'is-copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied' : label}
    >
      <span className="fluid-copy-btn__icon">
        <Icon icon={copied ? 'tick' : 'duplicate'} size={12} />
      </span>
    </button>
  );
}
