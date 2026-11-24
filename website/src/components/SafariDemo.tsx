import React from 'react';
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider';
import { Safari } from "@/registry/magicui/safari";
import { MalwareLogo } from '../BrandLogos';

export interface SafariDemoProps {
  url?: string;
  itemOne?: React.ReactNode;
  itemTwo?: React.ReactNode;
}

// Authentic Apple macOS Compare Handle (Layered ambient + key shadow)
const MacOSCompareHandle: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        position: 'relative',
        cursor: 'ew-resize',
        pointerEvents: 'none',
      }}
    >
      {/* Top Divider Line - Clean white with proper contrast shadow */}
      <div
        style={{
          flex: 1,
          width: '2px',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Apple macOS Disc - Clean elevation & contact shadow */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        {/* Left Arrow */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 19l-7-7 7-7"
            stroke="#1c1c1e"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Right Arrow */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5l7 7-7 7"
            stroke="#1c1c1e"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Bottom Divider Line - Clean white with proper contrast shadow */}
      <div
        style={{
          flex: 1,
          width: '2px',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 3px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.4)',
        }}
      />
    </div>
  );
};

export function SafariDemo({
  url = 'dictionary.com',
  itemOne,
  itemTwo,
}: SafariDemoProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 'min(920px, 90vw, calc((100vh - 120px) * 1.4617))',
        margin: '0 auto 60px',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Safari
        url={url}
        style={{
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          borderRadius: '12px',
        }}
      >
        <ReactCompareSlider
          style={{ width: '100%', height: '100%' }}
          position={50}
          handle={<MacOSCompareHandle />}
          itemOne={
            itemOne ?? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <ReactCompareSliderImage
                  src="./comparison/before.png"
                  alt="Webpage With Ads"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Left Pill: Without Veilora - clips with itemOne */}
                <div
                  style={{
                    position: 'absolute',
                    top: '28%',
                    transform: 'translateY(-50%)',
                    left: '16px',
                    zIndex: 25,
                    pointerEvents: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    backgroundColor: '#E5E5EA',
                    borderRadius: '9999px',
                    padding: '3px 12px 3px 3px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      flexShrink: 0,
                    }}
                  >
                    <MalwareLogo style={{ width: '16px', height: '16px' }} />
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#1c1c1e',
                      fontSize: '12px',
                      lineHeight: 1,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Without Veilora
                  </span>
                </div>
              </div>
            )
          }
          itemTwo={
            itemTwo ?? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <ReactCompareSliderImage
                  src="./comparison/after.png"
                  alt="Webpage Without Ads (Clean)"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Right Pill: With Veilora - clips with itemTwo */}
                <div
                  style={{
                    position: 'absolute',
                    top: '28%',
                    transform: 'translateY(-50%)',
                    right: '16px',
                    zIndex: 25,
                    pointerEvents: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    backgroundColor: '#E5E5EA',
                    borderRadius: '9999px',
                    padding: '3px 12px 3px 3px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                    userSelect: 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="./veilora.png"
                      alt="Veilora"
                      style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                    />
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#1c1c1e',
                      fontSize: '12px',
                      lineHeight: 1,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    With Veilora
                  </span>
                </div>
              </div>
            )
          }
        />
      </Safari>
    </div>
  );
}
