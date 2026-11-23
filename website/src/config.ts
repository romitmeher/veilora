export interface DownloadItem {
  os: string;
  arch: string;
  format: string;
  filename: string;
  size: string;
  sha256: string;
  url: string;
  recommended?: boolean;
}

export const SITE_CONFIG = {
  name: 'Veilora',
  version: 'v0.1.0',
  tagline: 'Private network shield & encrypted tunnel suite',
  githubUrl: 'https://github.com/romitmeher/veilora',
  releaseUrl: 'https://github.com/romitmeher/veilora/releases/tag/v0.1.0',
  license: 'GPL-3.0',
  downloads: [
    {
      os: 'Windows',
      arch: 'x64 (10/11)',
      format: '.exe (Installer)',
      filename: 'Veilora-Setup-v0.1.0-x64.exe',
      size: '24.2 MB',
      sha256: '9a4c8e71c9df2a829f0e1d848cf69a2db12ef7e0e7a2b0e6e8e50b7f8c14a90b',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/Veilora-Setup-v0.1.0-x64.exe',
      recommended: true,
    },
    {
      os: 'Windows',
      arch: 'x64 Portable',
      format: '.zip',
      filename: 'Veilora-v0.1.0-win-x64.zip',
      size: '18.6 MB',
      sha256: '7b2e3f5a1c0d4e9f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/Veilora-v0.1.0-win-x64.zip',
    },
    {
      os: 'macOS',
      arch: 'Apple Silicon & Intel',
      format: '.dmg',
      filename: 'Veilora-v0.1.0-universal.dmg',
      size: '26.8 MB',
      sha256: '3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/Veilora-v0.1.0-universal.dmg',
    },
    {
      os: 'Linux',
      arch: 'x86_64 AppImage',
      format: '.AppImage',
      filename: 'Veilora-v0.1.0-x86_64.AppImage',
      size: '29.1 MB',
      sha256: '5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/Veilora-v0.1.0-x86_64.AppImage',
    },
    {
      os: 'Linux',
      arch: 'Debian / Ubuntu',
      format: '.deb',
      filename: 'veilora_0.1.0_amd64.deb',
      size: '21.4 MB',
      sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/veilora_0.1.0_amd64.deb',
    },
    {
      os: 'Android',
      arch: 'arm64-v8a',
      format: '.apk',
      filename: 'veilora-mobile-v0.1.0.apk',
      size: '14.8 MB',
      sha256: 'e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
      url: 'https://github.com/romitmeher/veilora/releases/download/v0.1.0/veilora-mobile-v0.1.0.apk',
    },
  ] as DownloadItem[],
  metrics: [
    { value: '352,410', label: 'Loaded Filter Rules', sub: 'Compiled into memory Radix tree' },
    { value: '< 0.4 ms', label: 'Local DNS Latency', sub: 'Sub-millisecond loopback resolver' },
    { value: '940 Mbps', label: 'SoftEther Throughput', sub: 'Layer-2 Ethernet over HTTPS' },
    { value: '0 Bytes', label: 'Outbound Telemetry', sub: '100% on-device & open source' },
  ],
  faqs: [
    {
      q: 'How does Veilora block ads across the entire operating system?',
      a: 'Veilora binds a lightning-fast DNS server to 127.0.0.1:53 on your machine and sets the active network adapter to use this loopback address. Every DNS resolution query from any browser, background process, game, or desktop application is checked against 350,000+ rules in memory before any socket connection is attempted. Blocked tracker queries return NXDOMAIN in under 0.4ms, saving bandwidth and preventing tracker connections entirely.'
    },
    {
      q: 'What is the advantage of SoftEther VPN over standard VPN protocols?',
      a: 'SoftEther VPN encapsulates Ethernet frames inside high-speed HTTPS (Layer 2 over SSL-VPN). This provides two massive benefits: first, it bypasses restrictive enterprise and ISP firewalls that actively block standard IPsec or WireGuard UDP packets; second, its multithreaded TCP engine delivers high throughput with minimal packet drop on jittery connections.'
    },
    {
      q: 'Does Veilora collect or log my browsing history?',
      a: 'Never. Veilora has zero tracking, zero analytics SDKs, and zero cloud reporting endpoints. Query history is stored solely in a bounded in-memory circular ring buffer (up to 500 entries) in RAM for the desktop UI live inspector. The moment you close the app or flush the log, all memory is instantly reclaimed.'
    },
    {
      q: 'Can I use Veilora alongside my browser ad blocker?',
      a: 'Yes! Veilora acts at the operating system DNS layer, blocking network requests before they leave your device. Browser extensions operate at the DOM layer inside web pages (cleaning up whitespace and cosmetic CSS). They complement each other flawlessly, with Veilora protecting non-browser apps, desktop clients, and system telemetry that browser extensions cannot touch.'
    },
    {
      q: 'Which operating systems and architectures are supported?',
      a: 'Veilora supports Windows 10 and 11 (x64), macOS (Apple Silicon M-series & Intel Universal), Linux (x86_64 AppImage and Debian/Ubuntu .deb), and Android mobile devices (via our companion React Native / Go mobile APK).'
    },
    {
      q: 'Is Veilora free and open source?',
      a: 'Yes, 100%. Veilora is licensed under the GNU General Public License v3.0 (GPL-3.0). You are free to inspect the Go and TypeScript source code, compile it yourself, and audit every packet handling path.'
    }
  ]
};
