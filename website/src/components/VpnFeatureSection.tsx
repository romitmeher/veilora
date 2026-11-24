import React from 'react';

interface ProtocolPillProps {
  label: string;
  logo: string;
}

const ProtocolPill: React.FC<ProtocolPillProps> = ({ label, logo }) => {
  return (
    <span
      className="inline-morph-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#E5E5EA', // Apple System Gray
        borderRadius: '9999px',
        padding: '2px 10px 2px 2px',
        verticalAlign: 'baseline',
        margin: '0 3px',
        position: 'relative',
        top: '1px',
        lineHeight: 1,
        userSelect: 'none',
        transition: 'all 0.2s ease',
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
          src={logo}
          alt={label}
          style={{ width: '15px', height: '15px', objectFit: 'contain' }}
        />
      </span>
      <span
        style={{
          fontWeight: 600,
          color: '#1c1c1e',
          fontSize: '0.9em',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </span>
  );
};

export const VpnFeatureSection: React.FC = () => {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto 120px',
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
        Multi-protocol tunneling. Zero log retention.
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
        Beyond local DNS filtering, Veilora enables full-device encrypted tunneling. Route your traffic through privacy-hardened exit nodes powered by{' '}
        <ProtocolPill label="WireGuard" logo="./logos/wireguard.png" />
        {', '}
        <ProtocolPill label="OpenVPN" logo="./logos/openvpn.png" />
        {', and '}
        <ProtocolPill label="SoftEther" logo="./logos/softether.png" />
        {' '}— keeping your real IP masked and your connection secure against ISP monitoring, deep packet inspection, and untrusted public networks.
      </p>
    </section>
  );
};
