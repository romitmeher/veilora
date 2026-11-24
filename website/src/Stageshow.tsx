import React, { useState } from 'react';
import { 
  Shield, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Power, 
  Zap, 
  Filter, 
  ArrowRight,
  Server
} from 'lucide-react';
import { SoftEtherLogo, OpenVPNLogo, EasyListLogo, AdGuardLogo } from './BrandLogos';

interface RequestItem {
  id: string;
  time: string;
  domain: string;
  ruleList: string;
  status: 'blocked' | 'allowed';
  latency: string;
}

const SAMPLE_REQUESTS: RequestItem[] = [
  { id: '1', time: '13:42:01', domain: 'securepubads.g.doubleclick.net', ruleList: 'EasyList', status: 'blocked', latency: '0.3ms' },
  { id: '2', time: '13:42:03', domain: 'api.github.com', ruleList: 'Pass-through', status: 'allowed', latency: '12.4ms' },
  { id: '3', time: '13:42:05', domain: 'telemetry.microsoft.com', ruleList: 'AdGuard Tracking', status: 'blocked', latency: '0.2ms' },
  { id: '4', time: '13:42:07', domain: 'registry.npmjs.org', ruleList: 'Pass-through', status: 'allowed', latency: '16.8ms' },
  { id: '5', time: '13:42:09', domain: 'analytics.tiktok.com', ruleList: 'Peter Lowe List', status: 'blocked', latency: '0.2ms' },
  { id: '6', time: '13:42:12', domain: 'cdn.jsdelivr.net', ruleList: 'Pass-through', status: 'allowed', latency: '9.5ms' },
];

const VPN_SERVERS = [
  { country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ping: '12ms', speed: '940 Mbps', proto: 'SoftEther' },
  { country: 'Germany', city: 'Frankfurt', flag: '🇩🇪', ping: '28ms', speed: '880 Mbps', proto: 'SoftEther' },
  { country: 'United Kingdom', city: 'London', flag: '🇬🇧', ping: '32ms', speed: '910 Mbps', proto: 'OpenVPN' },
  { country: 'Singapore', city: 'Singapore', flag: '🇸🇬', ping: '45ms', speed: '840 Mbps', proto: 'SoftEther' },
];

export const Stageshow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vpn' | 'activity' | 'filters'>('overview');
  const [isBlockingOn, setIsBlockingOn] = useState(true);
  const [isVpnConnected, setIsVpnConnected] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<'softether' | 'openvpn'>('softether');
  const [searchFilter, setSearchFilter] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      
      {/* Product Window */}
      <div className="stageshow-window">
        {/* Title Bar */}
        <div className="stageshow-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            </div>
            <div style={{ height: '14px', width: '1px', backgroundColor: '#dadada' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="./veilora.png" alt="Veilora" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1d1b20' }}>Veilora</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ebebeb', color: '#7d7d7d' }}>
                v0.1.0
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', backgroundColor: '#ffffff', border: '1px solid #dadada', fontSize: '11px', color: '#7d7d7d' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isBlockingOn ? '#10b981' : '#ef4444' }} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>127.0.0.1:53</span>
            </div>
            <button
              onClick={() => setIsBlockingOn(!isBlockingOn)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: isBlockingOn ? '#f0f9ff' : '#ebebeb',
                color: isBlockingOn ? '#117bc8' : '#7d7d7d',
                border: isBlockingOn ? '1px solid #7dd3fc' : '1px solid #dadada',
                cursor: 'pointer'
              }}
            >
              <Power size={12} />
              <span>{isBlockingOn ? 'Active' : 'Stopped'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="stageshow-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`stageshow-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Shield size={13} />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('vpn')}
            className={`stageshow-tab ${activeTab === 'vpn' ? 'active' : ''}`}
          >
            <Globe size={13} />
            <span>VPN Controls</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`stageshow-tab ${activeTab === 'activity' ? 'active' : ''}`}
          >
            <Zap size={13} />
            <span>Request Activity</span>
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`stageshow-tab ${activeTab === 'filters' ? 'active' : ''}`}
          >
            <Filter size={13} />
            <span>Filter Lists (4)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="stageshow-body">
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Ad Blocking Card */}
                <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid #dadada', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f0f9ff', color: '#117bc8' }}>
                        <Shield size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1b20' }}>DNS Ad Blocking</h4>
                        <p style={{ fontSize: '12px', color: '#7d7d7d', marginTop: '2px' }}>352,410 rules loaded • Radix trie</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                      Active
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #ebebeb', fontSize: '11px' }}>
                    <span style={{ color: '#7d7d7d' }}>Neutralized today: <strong style={{ color: '#000000' }}>1,842 requests</strong></span>
                    <button onClick={() => setActiveTab('filters')} style={{ background: 'none', border: 'none', color: '#117bc8', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Rules <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* VPN Tunnel Card */}
                <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid #dadada', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f0f9ff', color: '#117bc8' }}>
                        <Globe size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1b20' }}>VPN Tunnel</h4>
                        <p style={{ fontSize: '12px', color: '#7d7d7d', marginTop: '2px' }}>
                          {isVpnConnected ? 'Tokyo, Japan (SoftEther L2)' : 'Tunnel disconnected'}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', backgroundColor: isVpnConnected ? '#dcfce7' : '#fee2e2', color: isVpnConnected ? '#16a34a' : '#dc2626' }}>
                      {isVpnConnected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #ebebeb', fontSize: '11px' }}>
                    <span style={{ color: '#7d7d7d' }}>Ping: <strong style={{ color: '#117bc8', fontFamily: 'var(--font-mono)' }}>12ms</strong> • 940 Mbps</span>
                    <button onClick={() => setIsVpnConnected(!isVpnConnected)} style={{ background: 'none', border: 'none', color: '#117bc8', fontWeight: 600, cursor: 'pointer' }}>
                      {isVpnConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Request Log Stream */}
              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #dadada', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="#117bc8" />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d1b20' }}>Recent Local DNS Queries</span>
                  </div>
                  <button onClick={() => setActiveTab('activity')} style={{ background: 'none', border: 'none', color: '#117bc8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    Full Inspector →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {SAMPLE_REQUESTS.slice(0, 3).map((req) => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#f9f9f9', border: '1px solid #ebebeb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {req.status === 'blocked' ? (
                          <XCircle size={14} color="#dc2626" />
                        ) : (
                          <CheckCircle2 size={14} color="#16a34a" />
                        )}
                        <span style={{ color: '#1d1b20', fontWeight: 500 }}>{req.domain}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#a1a1a1', fontSize: '10px' }}>{req.ruleList}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: req.status === 'blocked' ? '#fee2e2' : '#dcfce7', color: req.status === 'blocked' ? '#dc2626' : '#16a34a' }}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vpn' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px', backgroundColor: '#f0f9ff', border: '1px solid #7dd3fc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SoftEtherLogo className="brand-icon" />
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#1d1b20' }}>SoftEther Layer-2 Tunnel Active</h5>
                    <p style={{ fontSize: '11px', color: '#7d7d7d' }}>Ethernet-over-HTTPS protocol prioritizes maximum throughput</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedProtocol('softether')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedProtocol === 'softether' ? '#117bc8' : '#ffffff',
                      color: selectedProtocol === 'softether' ? '#ffffff' : '#7d7d7d',
                      border: '1px solid #dadada',
                      cursor: 'pointer'
                    }}
                  >
                    SoftEther
                  </button>
                  <button
                    onClick={() => setSelectedProtocol('openvpn')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: selectedProtocol === 'openvpn' ? '#117bc8' : '#ffffff',
                      color: selectedProtocol === 'openvpn' ? '#ffffff' : '#7d7d7d',
                      border: '1px solid #dadada',
                      cursor: 'pointer'
                    }}
                  >
                    OpenVPN
                  </button>
                </div>
              </div>

              <div style={{ borderRadius: '12px', border: '1px solid #dadada', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', backgroundColor: '#f7f7f7', borderBottom: '1px solid #dadada', fontSize: '11px', fontWeight: 600, color: '#7d7d7d' }}>
                  <span>Location</span>
                  <span>Latency</span>
                  <span>Bandwidth</span>
                  <span style={{ textAlign: 'right' }}>Status</span>
                </div>
                {VPN_SERVERS.map((srv, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #ebebeb', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{srv.flag}</span>
                      <span style={{ fontWeight: 600, color: '#1d1b20' }}>{srv.city}, {srv.country}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#117bc8', fontWeight: 600 }}>{srv.ping}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#7d7d7d' }}>{srv.speed}</span>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setIsVpnConnected(true)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: idx === 0 && isVpnConnected ? '#dcfce7' : '#ebebeb',
                          color: idx === 0 && isVpnConnected ? '#16a34a' : '#1d1b20',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {idx === 0 && isVpnConnected ? 'Active' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} color="#7d7d7d" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search requested domains..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '9999px',
                      border: '1px solid #dadada',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                </div>
                <div style={{ padding: '6px 14px', borderRadius: '9999px', backgroundColor: '#f0f9ff', border: '1px solid #7dd3fc', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#117bc8', fontWeight: 600 }}>
                  Buffer: 48 / 500
                </div>
              </div>

              <div style={{ borderRadius: '12px', border: '1px solid #dadada', overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                {SAMPLE_REQUESTS.filter(r => r.domain.includes(searchFilter)).map((req) => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #ebebeb', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#a1a1a1', fontSize: '10px' }}>{req.time}</span>
                      <span style={{ color: '#1d1b20', fontWeight: 500 }}>{req.domain}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#a1a1a1' }}>{req.latency}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: req.status === 'blocked' ? '#fee2e2' : '#dcfce7', color: req.status === 'blocked' ? '#dc2626' : '#16a34a' }}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: '#7d7d7d', marginBottom: '4px' }}>
                Active blocklist feeds compiled into in-memory Radix tree:
              </p>
              {[
                { name: 'EasyList Standard', rules: '142,390 rules', tag: 'Ads & Banners', logo: <EasyListLogo className="brand-icon-sm" /> },
                { name: 'EasyPrivacy Telemetry', rules: '98,410 rules', tag: 'Behavioral Trackers', logo: <EasyListLogo className="brand-icon-sm" /> },
                { name: 'Peter Lowe Malware', rules: '4,100 rules', tag: 'Phishing & Bots', logo: <Shield size={18} color="#117bc8" /> },
                { name: 'AdGuard Mobile & Tracking', rules: '107,510 rules', tag: 'Cross-Site Analytics', logo: <AdGuardLogo className="brand-icon-sm" /> },
              ].map((fl, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ebebeb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {fl.logo}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d1b20' }}>{fl.name}</div>
                      <div style={{ fontSize: '11px', color: '#7d7d7d' }}>{fl.rules} • <span style={{ color: '#117bc8' }}>{fl.tag}</span></div>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    Loaded
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
