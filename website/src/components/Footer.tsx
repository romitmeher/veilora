import React from 'react';

interface FooterLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

const PRODUCT_LINKS: FooterLink[] = [
  { label: 'DNS Ad-Shield', href: '#ad-blocker' },
  { label: 'Exit Nodes Map', href: '#exit-nodes' },
  { label: 'Multi-Protocol Tunnel', href: '#protocols' },
  { label: 'Windows Client', href: 'https://github.com/romitmeher/veilora/releases', isExternal: true },
];

const OPEN_SOURCE_LINKS: FooterLink[] = [
  { label: 'Source Code', href: 'https://github.com/romitmeher/veilora', isExternal: true },
  { label: 'Documentation', href: 'https://github.com/romitmeher/veilora#readme', isExternal: true },
  { label: 'Releases & Changelog', href: 'https://github.com/romitmeher/veilora/releases', isExternal: true },
  { label: 'Report an Issue', href: 'https://github.com/romitmeher/veilora/issues/new', isExternal: true },
];

const TRUST_LINKS: FooterLink[] = [
  { label: 'Contributing Guide', href: 'https://github.com/romitmeher/veilora/blob/main/CONTRIBUTING.md', isExternal: true },
  { label: 'Security Policy', href: 'https://github.com/romitmeher/veilora/blob/main/SECURITY.md', isExternal: true },
  { label: 'MIT License', href: 'https://github.com/romitmeher/veilora/blob/main/LICENSE', isExternal: true },
  { label: 'No-Logs Guarantee', href: '#about' },
];

export const Footer: React.FC = () => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const renderLink = (link: FooterLink) => (
    <li key={link.label} style={{ listStyle: 'none' }}>
      <a
        href={link.href}
        target={link.isExternal ? '_blank' : undefined}
        rel={link.isExternal ? 'noreferrer noopener' : undefined}
        onClick={(e) => handleScroll(e, link.href)}
        style={{
          fontSize: '13.5px',
          color: '#86868b',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          transition: 'color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#86868b')}
      >
        <span>{link.label}</span>
        {link.isExternal && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ opacity: 0.6 }}
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        )}
      </a>
    </li>
  );

  return (
    <footer
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f1f1f4',
        position: 'relative',
        zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '64px 28px 140px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* 4-Column Grid Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '48px 32px',
            width: '100%',
          }}
        >
          {/* Column 1: Brand & Open Source Statement */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxWidth: '300px',
            }}
          >
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <img
                src="./veilora.png"
                alt="Veilora Logo"
                style={{
                  width: '30px',
                  height: '30px',
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  fontSize: '19px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                }}
              >
                Veilora
              </span>
            </a>

            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: '#6e6e73',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Local DNS ad-blocking and encrypted multi-protocol VPN client. Zero telemetry, built for privacy.
            </p>

            {/* Minimal MIT License Badge */}
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#E5E5EA',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#1c1c1e',
                  letterSpacing: '-0.01em',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                MIT License • Free & Open Source
              </span>
            </div>
          </div>

          {/* Column 2: Product & Protocols */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              Product
            </span>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: 0,
                padding: 0,
              }}
            >
              {PRODUCT_LINKS.map(renderLink)}
            </ul>
          </div>

          {/* Column 3: Open Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              Open Source
            </span>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: 0,
                padding: 0,
              }}
            >
              {OPEN_SOURCE_LINKS.map(renderLink)}
            </ul>
          </div>

          {/* Column 4: Trust & Legal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              Trust & Legal
            </span>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: 0,
                padding: 0,
              }}
            >
              {TRUST_LINKS.map(renderLink)}
            </ul>
          </div>
        </div>

        {/* Bottom Baseline Divider */}
        <div
          style={{
            borderTop: '1px solid #f1f1f4',
            marginTop: '48px',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: '#86868b',
              letterSpacing: '-0.01em',
            }}
          >
            © 2026 Veilora • MIT License • No Tracking
          </span>
        </div>
      </div>
    </footer>
  );
};
