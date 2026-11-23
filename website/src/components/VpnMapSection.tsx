import React, { useState } from 'react';
import { TextMorph } from 'torph/react';
import { CountryFlag } from './CountryFlags';
import { ShieldAlert, ShieldCheck, Zap, RefreshCw, Power, Info, ChevronUp, Lock, Unlock } from 'lucide-react';

export interface VpnCountry {
  id: string;
  country: string;
  code: 'IN' | 'CH' | 'IS' | 'JP' | 'NL' | 'SE' | 'DE' | 'SG';
  ip: string;
  x: number;
  y: number;
  isp: string;
}

const getServerTag = (code: string): string => {
  switch (code) {
    case 'NL': return 'Netherlands #38';
    case 'CH': return 'Switzerland #14';
    case 'IS': return 'Iceland #08';
    case 'JP': return 'Japan #22';
    case 'SE': return 'Sweden #05';
    case 'DE': return 'Germany #19';
    case 'SG': return 'Singapore #09';
    default: return 'India #01';
  }
};

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
          {/* Radial Gradients for Proton-style Glowing Aura */}
          <defs>
            <radialGradient id="vpn-green-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E599" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#00E599" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#00E599" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00E599" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vpn-red-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
              <stop offset="35%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

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
              {/* Outer Glowing Circular Aura: Proton VPN style soft radial disc */}
              {isConnected ? (
                /* Connected: Aura smoothly grows and becomes small (breathing animation) */
                <circle
                  cx={activeCountry.x}
                  cy={activeCountry.y}
                  r="26"
                  fill="url(#vpn-green-glow)"
                  className="vpn-aura-breathe"
                />
              ) : (
                /* Disconnected: Red glowing aura disc */
                <circle
                  cx={activeCountry.x}
                  cy={activeCountry.y}
                  r="20"
                  fill="url(#vpn-red-glow)"
                />
              )}

              {/* Solid White Ring Disc (Proton VPN Pin Rim) */}
              <circle
                cx={activeCountry.x}
                cy={activeCountry.y}
                r="7.5"
                fill="#ffffff"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22))' }}
              />

              {/* Solid Pin Center Dot */}
              <circle
                cx={activeCountry.x}
                cy={activeCountry.y}
                r="3.8"
                fill={isConnected ? '#00E599' : '#ef4444'}
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
                    {/* Official Country Flag with thin grey border */}
                    <CountryFlag
                      countryCode={activeCountry.code}
                      style={{
                        width: '21px',
                        height: '15px',
                        borderRadius: '3px',
                        boxShadow: '0 0 0 1px #d1d1d6, 0 1px 2px rgba(0, 0, 0, 0.05)',
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
          maxWidth: '820px',
          margin: '0 auto 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(26px, 3.5vw, 42px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: '#0f172a',
            lineHeight: 1.25,
            margin: '0 0 16px',
          }}
        >
          High-speed privacy exit nodes worldwide.
        </h2>

        {/* Animated Connection Status Pill powered by Torph TextMorph & spring lock icons */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            padding: '5px 16px 5px 6px',
            boxShadow:
              '0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            userSelect: 'none',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Animated Lock / Unlock Icon Badge */}
          <div
            key={status}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: isConnected
                ? 'rgba(16, 185, 129, 0.12)'
                : isConnecting
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(239, 68, 68, 0.1)',
              color: isConnected
                ? '#059669'
                : isConnecting
                  ? '#d97706'
                  : '#dc2626',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}
          >
            {isConnected ? (
              <Lock className="vpn-lock-bounce" style={{ width: '13px', height: '13px' }} />
            ) : isConnecting ? (
              <RefreshCw style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Unlock className="vpn-unlock-tilt" style={{ width: '13px', height: '13px' }} />
            )}
          </div>

          {/* Glowing Status Dot */}
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected
                ? '#10b981'
                : isConnecting
                  ? '#f59e0b'
                  : '#ef4444',
              boxShadow: isConnected
                ? '0 0 8px rgba(16, 185, 129, 0.7)'
                : '0 0 6px rgba(239, 68, 68, 0.5)',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}
          />

          {/* Morphing Connection Status Text */}
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isConnected ? '#059669' : isConnecting ? '#d97706' : '#dc2626',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              display: 'inline-flex',
            }}
          >
            <TextMorph ease={{ stiffness: 220, damping: 22 }}>
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </TextMorph>
          </span>
        </div>
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

          {/* Server Row (Proton-style layout in Apple aesthetic) */}
          <div
            style={{
              backgroundColor: '#fbfbfd',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid #f0f0f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!isConnected ? (
                /* Disconnected: Mint Green Zap Badge */
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#00E599',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0, 229, 153, 0.28)',
                  }}
                >
                  <Zap style={{ width: '18px', height: '18px', color: '#09090b', fill: '#09090b' }} />
                </div>
              ) : (
                /* Connected: Mint Green Zap Badge with Connected Country Flag overlapping */
                <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#00E599',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 229, 153, 0.28)',
                    }}
                  >
                    <Zap style={{ width: '18px', height: '18px', color: '#09090b', fill: '#09090b' }} />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: '-4px',
                      bottom: '-3px',
                      borderRadius: '3px',
                      border: '2px solid #ffffff',
                      overflow: 'hidden',
                      lineHeight: 0,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <CountryFlag
                      countryCode={activeCountry.code}
                      style={{ width: '18px', height: '13px', borderRadius: '1px', boxShadow: 'none', border: 'none' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <span
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: '#1c1c1e',
                    letterSpacing: '-0.01em',
                    display: 'block',
                    lineHeight: 1.25,
                  }}
                >
                  Fastest free server
                </span>

                {!isConnected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#86868b' }}>
                      Auto-selected from
                    </span>
                    {/* Overlapping Flag Stack (like Proton reference) */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}>
                      <CountryFlag
                        countryCode="NL"
                        style={{
                          width: '18px',
                          height: '13px',
                          borderRadius: '2px',
                          boxShadow: '0 0 0 1.5px #ffffff',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      />
                      <CountryFlag
                        countryCode="JP"
                        style={{
                          width: '18px',
                          height: '13px',
                          borderRadius: '2px',
                          boxShadow: '0 0 0 1.5px #ffffff',
                          position: 'relative',
                          zIndex: 2,
                          marginLeft: '-5px',
                        }}
                      />
                      <CountryFlag
                        countryCode="CH"
                        style={{
                          width: '18px',
                          height: '13px',
                          borderRadius: '2px',
                          boxShadow: '0 0 0 1.5px #ffffff',
                          position: 'relative',
                          zIndex: 3,
                          marginLeft: '-5px',
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', marginLeft: '5px' }}>
                        +5
                      </span>
                    </div>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: '#86868b',
                      fontWeight: 500,
                      marginTop: '2px',
                      display: 'block',
                    }}
                  >
                    {getServerTag(activeCountry.code)}
                  </span>
                )}
              </div>
            </div>

            {!isConnected ? (
              <Info style={{ width: '18px', height: '18px', color: '#86868b', flexShrink: 0 }} />
            ) : (
              <ChevronUp style={{ width: '18px', height: '18px', color: '#86868b', flexShrink: 0 }} />
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

          {/* Action Button: Connect / Disconnect / Change Server */}
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
              <Zap style={{ width: '16px', height: '16px', color: '#fde047', fill: '#fde047' }} />
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
            /* Connected state: Stacked buttons as in reference (Disconnect & Change server, NO RED BORDER) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button
                onClick={handleDisconnect}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#f2f2f7',
                  color: '#1c1c1e',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5ea')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f2f2f7')}
              >
                <Power style={{ width: '15px', height: '15px', color: '#dc2626' }} />
                Disconnect
              </button>

              <button
                onClick={handleQuickConnect}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: 'none', // Explicitly no red border!
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} />
                Change server
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
