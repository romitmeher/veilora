import React, { useEffect, useState } from 'react';
import { TextMorph } from 'torph/react';
import { Button } from './Button';
import { FlickeringGrid } from '@/registry/magicui/flickering-grid';
import {
  WindowsLogo,
  LinuxLogo,
  AndroidLogo,
  SpotifyLogo,
  YouTubeLogo,
  SlackLogo,
  BrowserAdsLogo,
  ZeroTelemetryLogo
} from '../BrandLogos';

interface MorphItem {
  label: string;
  icon: React.ReactNode;
}

const PLATFORMS: MorphItem[] = [
  {
    label: 'Windows',
    icon: <WindowsLogo style={{ width: '22px', height: '22px' }} />
  },
  {
    label: 'Android',
    icon: <AndroidLogo style={{ width: '22px', height: '22px' }} />
  },
  {
    label: 'macOS',
    icon: <img src="./logos/apple.png" alt="Apple" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  },
  {
    label: 'Linux',
    icon: <LinuxLogo style={{ width: '22px', height: '22px' }} />
  }
];

const TARGETS: MorphItem[] = [
  {
    label: 'YouTube Ads',
    icon: <YouTubeLogo style={{ width: '22px', height: '22px' }} />
  },
  {
    label: 'Browser Ads',
    icon: <BrowserAdsLogo style={{ width: '22px', height: '22px' }} />
  },
  {
    label: 'Spotify Audio Ads',
    icon: <SpotifyLogo style={{ width: '22px', height: '22px' }} />
  },
  {
    label: 'Slack Tracking',
    icon: <SlackLogo style={{ width: '22px', height: '22px' }} />
  }
];

const PROTOCOLS: MorphItem[] = [
  {
    label: 'SoftEther',
    icon: <img src="./logos/softether.png" alt="SoftEther" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
  },
  {
    label: 'OpenVPN',
    icon: <img src="./logos/openvpn.png" alt="OpenVPN" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
  },
  {
    label: 'WireGuard',
    icon: <img src="./logos/wireguard.png" alt="WireGuard" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
  },
  {
    label: 'Zero Logs',
    icon: <ZeroTelemetryLogo style={{ width: '22px', height: '22px' }} />
  }
];

interface InlineChipProps {
  item: MorphItem;
}

const InlineChip: React.FC<InlineChipProps> = ({ item }) => {
  return (
    <span
      className="inline-morph-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#E5E5EA', // Apple System Gray
        borderRadius: '9999px',
        padding: '4px 14px 4px 4px', // Equal 4px space on top, bottom, and left
        verticalAlign: 'middle',
        margin: '0 4px',
        lineHeight: 1,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon Badge - Equal spacing on top, bottom, and left */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </span>

      {/* Morphing Label using Torph */}
      <span
        style={{
          fontWeight: 600,
          color: '#1c1c1e',
          whiteSpace: 'nowrap',
          fontSize: '0.82em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <TextMorph ease={{ stiffness: 220, damping: 22 }}>
          {item.label}
        </TextMorph>
      </span>
    </span>
  );
};

export const MorphHero: React.FC = () => {
  const [platformIndex, setPlatformIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [protocolIndex, setProtocolIndex] = useState(0);

  // Staggered transitions with brisk, engaging cadence
  useEffect(() => {
    const t1 = setInterval(() => {
      setPlatformIndex((prev) => (prev + 1) % PLATFORMS.length);
    }, 2800);

    const t2 = setInterval(() => {
      setTargetIndex((prev) => (prev + 1) % TARGETS.length);
    }, 2400);

    const t3 = setInterval(() => {
      setProtocolIndex((prev) => (prev + 1) % PROTOCOLS.length);
    }, 3200);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        padding: '48px 20px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Ambient Flickering Grid Background: Hero only, masked to keep the text area crisp and clear */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          maskImage:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.85) 68%, transparent 98%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.85) 68%, transparent 98%)',
        }}
      >
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          color="#60A5FA"
          maxOpacity={0.5}
          flickerChance={0.15}
        />
      </div>

      {/* Top Gradient Fade: Smooth transition into navbar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'linear-gradient(to bottom, #ffffff 15%, rgba(255, 255, 255, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Bottom Gradient Fade: Smooth transition into Safari demo */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to top, #ffffff 15%, rgba(255, 255, 255, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Hero Foreground Content: Elevated z-index and isolated from background */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1040px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Hero Typography Sentence with Inline Torph Chips */}
        <h1
          style={{
            fontSize: 'clamp(24px, 3.8vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.35,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            margin: 0,
            maxWidth: '920px',
          }}
        >
          A private shield for{' '}
          <InlineChip item={PLATFORMS[platformIndex]} />
          {', '}
          <br style={{ display: 'none' }} className="responsive-br" />
          blocks{' '}
          <InlineChip item={TARGETS[targetIndex]} />
          {', and routes '}
          <br style={{ display: 'none' }} className="responsive-br" />
          encrypted traffic with{' '}
          <InlineChip item={PROTOCOLS[protocolIndex]} />
          {'.'}
        </h1>

        {/* Concise Description */}
        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            lineHeight: 1.55,
            color: '#6e6e73',
            maxWidth: '560px',
            margin: '24px auto 32px',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          Veilora is a lightweight, open-source privacy client that stops ads, telemetry, and trackers at the DNS layer—with built-in encrypted VPN tunneling.
        </p>

        {/* Primary Download for Windows CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Button
            size="lg"
            href="https://github.com/veilora/veilora/releases/latest"
            icon={<WindowsLogo style={{ width: '18px', height: '18px' }} fill="#0078D4" />}
          >
            Download for Windows
          </Button>
          <span
            style={{
              fontSize: '12px',
              color: '#86868b',
              fontWeight: 400,
              letterSpacing: '-0.005em',
            }}
          >
            Windows 10 / 11 · 64-bit · Free & Open Source
          </span>
        </div>
      </div>
    </section>
  );
};
