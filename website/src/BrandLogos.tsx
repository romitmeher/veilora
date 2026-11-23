import React from 'react';

// Official Windows Logo (Windows 11 / Fluent Four-Tile Mark)
export const WindowsLogo: React.FC<{ className?: string; style?: React.CSSProperties; fill?: string }> = ({
  className = 'brand-icon',
  style,
  fill = '#0078D4'
}) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="9.2" height="9.2" fill={fill} rx="0.5" />
    <rect x="12.8" y="2" width="9.2" height="9.2" fill={fill} rx="0.5" />
    <rect x="2" y="12.8" width="9.2" height="9.2" fill={fill} rx="0.5" />
    <rect x="12.8" y="12.8" width="9.2" height="9.2" fill={fill} rx="0.5" />
  </svg>
);

// Official Apple Logo (Pixel-perfect 24x24)
export const AppleLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="#000000" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 7.15c.6-.73 1.01-1.75.9-2.77-.88.04-1.94.59-2.57 1.32-.55.64-1.03 1.68-.9 2.68 1 .08 1.98-.5 2.57-1.23z"/>
  </svg>
);

// Official Linux Tux Penguin Logo
export const LinuxLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 48 48" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="14" cy="42" rx="7" ry="3.5" fill="#FFA000"/>
    <ellipse cx="34" cy="42" rx="7" ry="3.5" fill="#FFA000"/>
    <path d="M24 6C17 6 12 12 12 21C12 26 10 32 8 36C7 38 8 40 11 40C15 40 18 38 24 38C30 38 33 40 37 40C40 40 41 38 40 36C38 32 36 26 36 21C36 12 31 6 24 6Z" fill="#1D1B20"/>
    <ellipse cx="24" cy="27" rx="8.5" ry="11" fill="#FFFFFF"/>
    <ellipse cx="20.5" cy="14" rx="2" ry="3" fill="#FFFFFF"/>
    <circle cx="21" cy="14.5" r="1.2" fill="#1D1B20"/>
    <ellipse cx="27.5" cy="14" rx="2" ry="3" fill="#FFFFFF"/>
    <circle cx="27" cy="14.5" r="1.2" fill="#1D1B20"/>
    <path d="M19 18C19 18 24 16 29 18C29 19 26 23 24 23C22 23 19 19 19 18Z" fill="#FFB300"/>
    <path d="M20 19C21.5 20.5 24 21 24 21C24 21 26.5 20.5 28 19C27 21 25 22 24 22C23 22 21 21 20 19Z" fill="#FF8F00"/>
  </svg>
);

// Authentic Official Android Bugdroid Logo (Dome, antennae, eyes)
export const AndroidLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Android Dome Head */}
    <path
      d="M4.5 17.5C4.5 12.8 8.1 9 12 9s7.5 3.8 7.5 8.5H4.5z"
      fill="#3DDC84"
    />
    {/* Left Antenna */}
    <line
      x1="7.2"
      y1="9.8"
      x2="5.2"
      y2="5.8"
      stroke="#3DDC84"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Right Antenna */}
    <line
      x1="16.8"
      y1="9.8"
      x2="18.8"
      y2="5.8"
      stroke="#3DDC84"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Left Eye */}
    <circle cx="8.5" cy="14" r="1.1" fill="#FFFFFF" />
    {/* Right Eye */}
    <circle cx="15.5" cy="14" r="1.1" fill="#FFFFFF" />
  </svg>
);

// Official Circular Spotify Logo (Green circle with three black sound waves)
export const SpotifyLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#1ED760" />
    <path
      d="M17.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      fill="#000000"
    />
  </svg>
);

// Official YouTube Logo
export const YouTubeLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/>
    <polygon points="9.545,15.568 15.818,12 9.545,8.432" fill="#FFFFFF"/>
  </svg>
);

// Official VS Code Multi-Tone Vector Logo
export const VSCodeLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.583 23.473a1.493 1.493 0 0 0 1.157-.278l4.41-3.327a1.495 1.495 0 0 0 .594-1.196V5.328a1.495 1.495 0 0 0-.594-1.196L18.74.805a1.495 1.495 0 0 0-1.722.062L7.387 8.01 3.535 5.092a1.054 1.054 0 0 0-1.352.076L.357 6.64a1.05 1.05 0 0 0-.077 1.442l3.878 4.25-3.878 4.25a1.05 1.05 0 0 0 .077 1.442l1.826 1.472a1.054 1.054 0 0 0 1.352.076l3.852-2.918 9.631 7.143a1.493 1.493 0 0 0 .744.228z" fill="#0065A9"/>
    <path d="M18.74.805l-9.631 7.143 3.939 3.014 6.786-5.068a.747.747 0 0 0 .285-.598V1.309a.5.5 0 0 0-.796-.402L18.74.805z" fill="#007ACC"/>
    <path d="M18.74 23.195l.583-.102a.5.5 0 0 0 .796-.402v-3.987a.747.747 0 0 0-.285-.598l-6.786-5.068-3.939 3.014 9.631 7.141z" fill="#1F9CF0"/>
    <path d="M4.157 12.332L.28 8.082a1.05 1.05 0 0 1 .077-1.442L2.183 5.168a1.054 1.054 0 0 1 1.352-.076l9.513 7.24-9.513 7.24a1.054 1.054 0 0 1-1.352-.076l-1.826-1.472a1.05 1.05 0 0 1-.077-1.442l3.877-4.25z" fill="#0065A9"/>
  </svg>
);

// Official Slack Multi-Color Logo
export const SlackLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
  </svg>
);

// Browser Ads Custom Shield Logo
export const BrowserAdsLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="18" rx="4" fill="#3B82F6"/>
    <path d="M2 8h20" stroke="#FFFFFF" strokeWidth="1.5"/>
    <circle cx="5" cy="5.5" r="1" fill="#FFFFFF"/>
    <circle cx="8" cy="5.5" r="1" fill="#FFFFFF"/>
    <path d="M12 11l4 5m0-5l-4 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Malware Ads Warning Shield Logo
export const MalwareLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" fill="#EF4444"/>
    <path d="M12 8v5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.2" fill="#FFFFFF"/>
  </svg>
);

// Zero Telemetry Shield Logo
export const ZeroTelemetryLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = 'brand-icon', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="#10B981" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
  </svg>
);
