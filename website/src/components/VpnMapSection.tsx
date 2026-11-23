import React, { useState } from 'react';
import { TextMorph } from 'torph/react';
import { CountryFlag } from './CountryFlags';
import { ShieldAlert, ShieldCheck, Zap, RefreshCw, Power } from 'lucide-react';

export interface VpnCountry {
  id: string;
  country: string;
  code: 'IN' | 'CH' | 'IS' | 'JP' | 'NL' | 'SE' | 'DE' | 'SG';
  ip: string;
  x: number;
  y: number;
  isp: string;
}

export const INDIA_COUNTRY: VpnCountry = {
  id: 'in',
  country: 'India',
  code: 'IN',
  ip: '103.152.220.14',
  x: 702.4,
  y: 222.0,
  isp: 'Bharti Airtel Ltd · Exposed',
};

export const VPN_COUNTRIES: VpnCountry[] = [
  {
    id: 'ch',
    country: 'Switzerland',
    code: 'CH',
    ip: '185.156.172.48',
    x: 523.7,
    y: 159.0,
    isp: 'Veilora Swiss Core #1 · Zero-Logs',
  },
  {
    id: 'is',
    country: 'Iceland',
    code: 'IS',
    ip: '194.26.29.112',
    x: 439.0,
    y: 112.3,
    isp: 'Veilora Nordic Privacy #3 · Zero-Logs',
  },
  {
    id: 'jp',
    country: 'Japan',
    code: 'JP',
    ip: '146.70.117.82',
    x: 887.9,
    y: 186.6,
    isp: 'Veilora Asia-East #7 · Zero-Logs',
  },
  {
    id: 'nl',
    country: 'Netherlands',
    code: 'NL',
    ip: '185.220.101.5',
    x: 513.6,
    y: 146.2,
    isp: 'Veilora Euro-Hub #2 · Zero-Logs',
  },
  {
    id: 'se',
    country: 'Sweden',
    code: 'SE',
    ip: '193.180.118.42',
    x: 550.2,
    y: 126.9,
    isp: 'Veilora Baltic Shield #5 · Zero-Logs',
  },
  {
    id: 'de',
    country: 'Germany',
    code: 'DE',
    ip: '194.126.177.10',
    x: 524.1,
    y: 152.1,
    isp: 'Veilora High-Speed DE #4 · Zero-Logs',
  },
  {
    id: 'sg',
    country: 'Singapore',
    code: 'SG',
    ip: '103.114.162.24',
    x: 788.4,
    y: 257.3,
    isp: 'Veilora Straits Secure #9 · Zero-Logs',
  },
];

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export const VpnMapSection: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeCountry, setActiveCountry] = useState<VpnCountry>(INDIA_COUNTRY);
  const [lastIndex, setLastIndex] = useState<number>(-1);

  // Quick Connect / Switch to next random country
  const handleQuickConnect = () => {
    if (status === 'connecting') return;
    setStatus('connecting');

    let nextIdx: number;
    do {
      nextIdx = Math.floor(Math.random() * VPN_COUNTRIES.length);
    } while (nextIdx === lastIndex && VPN_COUNTRIES.length > 1);

    setLastIndex(nextIdx);
    const target = VPN_COUNTRIES[nextIdx];

    setTimeout(() => {
      setActiveCountry(target);
      setStatus('connected');
    }, 600);
  };

  const handleDisconnect = () => {
    setStatus('disconnected');
    setActiveCountry(INDIA_COUNTRY);
  };

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Smooth Camera Pan & Zoom: Focuses squarely on the active country
  const zoom = 2.4;
  const targetX = 640 - activeCountry.x * zoom;
  const targetY = 260 - activeCountry.y * zoom;

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '680px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        padding: '60px 24px 80px',
      }}
    >
      {/* FULL-SECTION SKELETON MAP WITH CAMERA PAN & ZOOM */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <svg
          viewBox="0 0 1000 520"
          preserveAspectRatio="xMidYMid slice"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        >
          {/* Animated Camera Group: Moves and zooms directly to the active country */}
          <g
            style={{
              transform: `translate(${targetX}px, ${targetY}px) scale(${zoom})`,
              transition: 'transform 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: '0 0',
            }}
          >
            {/* Skeleton World Map SVG Image */}
            <image
              href="./world-skeleton.svg"
              x="0"
              y="0"
              width="1000"
              height="520"
              style={{ opacity: 0.94 }}
            />

            {/* ONLY the active country is shown - all non-connected dots removed */}
            <g>
              {/* Connected State: Smooth Green Radar Beacons */}
              {isConnected && (
                <>
                  <circle
                    cx={activeCountry.x}
                    cy={activeCountry.y}
                    r="14"
                    fill="rgba(16, 185, 129, 0.35)"
                    className="vpn-beacon-radar"
                  />
                  <circle
                    cx={activeCountry.x}
                    cy={activeCountry.y}
                    r="14"
                    fill="rgba(16, 185, 129, 0.35)"
                    className="vpn-beacon-radar-delayed"
                  />
                </>
              )}

              {/* Disconnected State: STATIC red halo ripple (No border line, no animation) */}
              {!isConnected && (
                <circle
                  cx={activeCountry.x}
                  cy={activeCountry.y}
                  r="11"
                  fill="rgba(239, 68, 68, 0.14)"
                />
              )}

              {/* Pin Center Dot with clean white hairline rim */}
              <circle
                cx={activeCountry.x}
                cy={activeCountry.y}
                r="4.5"
                fill={isConnected ? '#10b981' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth="1.6"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))' }}
              />

              {/* Floating Country Badge with Proper Vertical Spacing & Elevation Shadow */}
              <foreignObject
                x={activeCountry.x - 100}
                y={activeCountry.y - 64}
                width="200"
                height="48"
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    transform: `scale(${1 / zoom})`,
                    transformOrigin: 'center bottom',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      padding: '5px 11px 5px 6px',
                      boxShadow:
                        '0 10px 28px -4px rgba(0, 0, 0, 0.2), 0 3px 8px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                      border: 'none',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {/* Official Country Flag (no grey border wrapper) */}
                    <CountryFlag
                      countryCode={activeCountry.code}
                      style={{
                        width: '21px',
                        height: '15px',
                        borderRadius: '3px',
                        boxShadow: 'none',
                        border: 'none',
                        flexShrink: 0,
                      }}
                    />

                    {/* Country Name */}
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#1c1c1e',
                        fontSize: '12.5px',
                        letterSpacing: '-0.01em',
                        lineHeight: 1,
                      }}
                    >
                      {activeCountry.country}
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          </g>
        </svg>
      </div>

      {/* Top Gradient Fade (Seamlessly dissolves into page) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'linear-gradient(to bottom, #ffffff 25%, rgba(255, 255, 255, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Foreground Header Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 12,
          textAlign: 'center',
          maxWidth: '740px',
          margin: '0 auto 36px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6e6e73',
            marginBottom: '10px',
            display: 'inline-block',
          }}
        >
          Encrypted Tunneling
        </span>
        <h2
          style={{
            fontSize: 'clamp(26px, 3.5vw, 42px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: '#0f172a',
            lineHeight: 1.25,
            margin: '0 0 12px',
          }}
        >
          High-speed privacy exit nodes worldwide.
        </h2>
        <p
          style={{
            fontSize: 'clamp(15px, 1.8vw, 17px)',
            lineHeight: 1.6,
            color: '#6e6e73',
            margin: 0,
          }}
        >
          Route device traffic through private, zero-log endpoints with WireGuard and OpenVPN protocols.
        </p>
      </div>

      {/* Foreground Content: Proton VPN HUD Floating Over the Zoomed Map */}
      <div
        style={{
          position: 'relative',
          zIndex: 12,
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          pointerEvents: 'none',
        }}
      >
        {/* Floating Glassmorphic HUD Controller Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            pointerEvents: 'auto',
          }}
        >
          {/* Status Header Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '5px 12px',
                borderRadius: '9999px',
                backgroundColor: isConnected
                  ? 'rgba(16, 185, 129, 0.1)'
                  : isConnecting
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(239, 68, 68, 0.09)',
                color: isConnected
                  ? '#059669'
                  : isConnecting
                    ? '#d97706'
                    : '#dc2626',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isConnected
                    ? '#10b981'
                    : isConnecting
                      ? '#f59e0b'
                      : '#ef4444',
                  boxShadow: isConnected
                    ? '0 0 8px rgba(16, 185, 129, 0.7)'
                    : 'none',
                }}
              />
              {isConnected
                ? 'PROTECTED'
                : isConnecting
                  ? 'SECURING TUNNEL...'
                  : 'UNPROTECTED'}
            </span>

            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#86868b',
              }}
            >
              WireGuard · UDP
            </span>
          </div>

          {/* Clean Location Row (No Pill Wrapper) */}
          <div
            style={{
              backgroundColor: '#fbfbfd',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #f0f0f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CountryFlag
                countryCode={activeCountry.code}
                style={{ width: '28px', height: '20px', borderRadius: '4px', boxShadow: 'none', border: 'none' }}
              />
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#86868b',
                    letterSpacing: '0.04em',
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  {isConnected ? 'VPN Exit Location' : 'Current Location'}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1c1c1e',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {activeCountry.country}
                </span>
              </div>
            </div>

            {isConnected ? (
              <ShieldCheck style={{ width: '20px', height: '20px', color: '#10b981' }} />
            ) : (
              <ShieldAlert style={{ width: '20px', height: '20px', color: '#ef4444' }} />
            )}
          </div>

          {/* Real-time IP Display with Torph Morphing Animation */}
          <div
            style={{
              backgroundColor: '#fbfbfd',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #f0f0f4',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#86868b',
                  letterSpacing: '0.04em',
                }}
              >
                IP Address
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: isConnected ? '#059669' : '#dc2626',
                  fontWeight: 500,
                }}
              >
                {isConnected ? 'Shielded' : 'Exposed'}
              </span>
            </div>

            {/* Torph Numerical IP Morphing */}
            <div
              style={{
                fontSize: '19px',
                fontWeight: 600,
                color: '#1c1c1e',
                fontFamily: 'SF Mono, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              <TextMorph numbers ease={{ stiffness: 240, damping: 24 }}>
                {activeCountry.ip}
              </TextMorph>
            </div>

            <span
              style={{
                fontSize: '12px',
                color: '#86868b',
                marginTop: '4px',
                display: 'block',
              }}
            >
              {activeCountry.isp}
            </span>
          </div>

          {/* Action Button: Connect / Disconnect */}
          {!isConnected ? (
            <button
              onClick={handleQuickConnect}
              className="btn-primary"
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                gap: '8px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Zap style={{ width: '16px', height: '16px', color: '#fde047' }} />
              Quick Connect
            </button>
          ) : isConnecting ? (
            <button
              disabled
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: '#f3f4f6',
                color: '#86868b',
                border: '1px solid #e5e5ea',
                cursor: 'wait',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <RefreshCw
                style={{
                  width: '16px',
                  height: '16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Securing Handshake...
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={handleQuickConnect}
                className="btn-primary"
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} />
                Switch Country
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  height: '44px',
                  padding: '0 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s ease',
                }}
              >
                <Power style={{ width: '14px', height: '14px' }} />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'linear-gradient(to top, #ffffff 25%, rgba(255, 255, 255, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </section>
  );
};
