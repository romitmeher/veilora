import React from 'react';

interface PillProps {
  type: 'veilora' | 'zen';
}

export const Pill: React.FC<PillProps> = ({ type }) => {
  const isVeilora = type === 'veilora';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#E5E5EA',
        borderRadius: '9999px',
        padding: '2px 10px 2px 2px',
        verticalAlign: 'baseline',
        margin: '0 3px',
        position: 'relative',
        top: '1px',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}
      >
        <img
          src={isVeilora ? './veilora.png' : './logos/zen.png'}
          alt={isVeilora ? 'Veilora' : 'Zen'}
          style={{ width: '14px', height: '14px', objectFit: 'contain' }}
        />
      </span>
      <span
        style={{
          fontWeight: 600,
          color: '#1c1c1e',
          fontSize: '0.88em',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {isVeilora ? 'Veilora' : 'Zen'}
      </span>
    </span>
  );
};

export const AboutSection: React.FC = () => {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto 80px',
        padding: '0 20px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          fontSize: 'clamp(24px, 3.2vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.025em',
          color: '#0f172a',
          lineHeight: 1.25,
          marginBottom: '16px',
        }}
      >
        System-wide blocking. Zero telemetry.
      </h2>
      <p
        style={{
          fontSize: 'clamp(15px, 1.8vw, 17px)',
          lineHeight: 1.65,
          color: '#6e6e73',
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        <Pill type="veilora" /> neutralizes ads, trackers, and malicious domains directly at the local proxy and DNS layer before network requests ever reach your browsers or desktop applications. Built upon the high-performance core of <Pill type="zen" />, it pairs transparent request inspection with integrated encrypted VPN tunneling for complete privacy.
      </p>
    </section>
  );
};
