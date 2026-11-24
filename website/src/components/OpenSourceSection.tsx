import React, { useEffect, useState } from 'react';
import { BookOpen, Bug, GitPullRequest } from 'lucide-react';
import { FlickeringGrid } from '@/registry/magicui/flickering-grid';
import { Footer } from './Footer';

interface Contributor {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
}

const FALLBACK_CONTRIBUTORS: Contributor[] = [
  {
    login: 'romitmeher',
    name: 'Romit Meher',
    avatar_url: 'https://avatars.githubusercontent.com/u/141936924?v=4',
    html_url: 'https://github.com/romitmeher',
  },
  {
    login: 'Harshit-patil56',
    name: 'Harshit Patil',
    avatar_url: 'https://avatars.githubusercontent.com/u/125437672?v=4',
    html_url: 'https://github.com/Harshit-patil56',
  },
];

const GitHubIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg
    style={{ width: `${size}px`, height: `${size}px`, fill: 'currentColor' }}
    viewBox="0 0 438.549 438.549"
    aria-hidden="true"
  >
    <path d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z" />
  </svg>
);

const RESOURCE_LINKS = [
  {
    label: 'Source Code',
    href: 'https://github.com/romitmeher/veilora',
    icon: <GitHubIcon size={14} />,
  },
  {
    label: 'Documentation',
    href: 'https://github.com/romitmeher/veilora#readme',
    icon: <BookOpen size={14} strokeWidth={2.4} />,
  },
  {
    label: 'Report a Bug',
    href: 'https://github.com/romitmeher/veilora/issues/new',
    icon: <Bug size={14} strokeWidth={2.4} />,
  },
  {
    label: 'Contributing',
    href: 'https://github.com/romitmeher/veilora/blob/main/CONTRIBUTING.md',
    icon: <GitPullRequest size={14} strokeWidth={2.4} />,
  },
];

const ResourcePill: React.FC<{
  link: (typeof RESOURCE_LINKS)[0];
}> = ({ link }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-morph-chip resource-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: isHovered ? '#dedee3' : '#E5E5EA',
        borderRadius: '9999px',
        padding: '4px 14px 4px 4px',
        textDecoration: 'none',
        boxShadow: isHovered
          ? '0 4px 18px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9) inset, 0 0 14px rgba(255, 255, 255, 0.45)'
          : '0 1px 3px rgba(0, 0, 0, 0.08)',
        transform: isHovered ? 'translateY(-1.5px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient Luminous Center Glow (Pulsing while hovered) */}
      <span className="pill-glow" aria-hidden="true" />

      {/* Full-Pill Light Sweep Specular Reflection (Slowed down, returns back on mouse leave like Button component) */}
      <span className="pill-shine" aria-hidden="true" />

      {/* White Circular Icon Disc */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: isHovered
            ? '0 2px 6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(255, 255, 255, 0.8)'
            : '0 1px 2px rgba(0, 0, 0, 0.1)',
          color: '#0f172a',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
        }}
      >
        {link.icon}
      </span>
      <span
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: isHovered ? '#000000' : '#1c1c1e',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          transition: 'color 0.2s ease',
        }}
      >
        {link.label}
      </span>
    </a>
  );
};

const ContributorPill: React.FC<{ contributor: Contributor }> = ({ contributor }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={contributor.html_url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-morph-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: isHovered ? '#dadade' : '#E5E5EA',
        borderRadius: '9999px',
        padding: '4px 14px 4px 4px',
        textDecoration: 'none',
        boxShadow: isHovered
          ? '0 4px 14px rgba(0, 0, 0, 0.12)'
          : '0 1px 3px rgba(0, 0, 0, 0.08)',
        transform: isHovered ? 'translateY(-1.5px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Contributor Avatar Disc (Static, not animated) */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src={contributor.avatar_url}
          alt={contributor.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </span>

      {/* Vertical Flip Text Container: Smoothly flips from Name to @handle (bottom to top) */}
      <span
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: '#1c1c1e',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          display: 'inline-grid',
          gridTemplateAreas: '"stack"',
          overflow: 'hidden',
          height: '18px',
          lineHeight: '18px',
          verticalAlign: 'middle',
        }}
      >
        <span
          style={{
            gridArea: 'stack',
            transform: isHovered ? 'translateY(-100%)' : 'translateY(0%)',
            opacity: isHovered ? 0 : 1,
            transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {contributor.name}
        </span>
        <span
          style={{
            gridArea: 'stack',
            transform: isHovered ? 'translateY(0%)' : 'translateY(100%)',
            opacity: isHovered ? 1 : 0,
            transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
            whiteSpace: 'nowrap',
          }}
        >
          @{contributor.login}
        </span>
      </span>

      {/* External Link Arrow (Slides in on hover to indicate clickability, matching Contributors link) */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isHovered ? '12px' : '0px',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translate(0, 0) scale(1)' : 'translate(-4px, 4px) scale(0.6)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          color: '#86868b',
          flexShrink: 0,
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </span>
    </a>
  );
};

export const OpenSourceSection: React.FC = () => {
  const [contributors, setContributors] = useState<Contributor[]>(FALLBACK_CONTRIBUTORS);

  useEffect(() => {
    fetch('https://api.github.com/repos/romitmeher/veilora/contributors')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Contributor[] = data.map((c: any) => ({
            login: c.login,
            name: c.login === 'romitmeher' ? 'Romit Meher' : c.login === 'Harshit-patil56' ? 'Harshit Patil' : c.login,
            avatar_url: c.avatar_url || `https://github.com/${c.login}.png`,
            html_url: c.html_url || `https://github.com/${c.login}`,
          }));
          setContributors(mapped);
        }
      })
      .catch(() => {
        // Fallback default is already set
      });
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        padding: '60px 20px 0px',
        margin: '0 auto',
      }}
    >
      {/* FlickeringGrid Background Spanning Open Source and Footer to the End of the Page */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <FlickeringGrid
          className="absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_1100px_92%_at_50%_48%,transparent_16%,rgba(0,0,0,0.65)_55%,transparent_100%)]"
          squareSize={4}
          gridGap={6}
          color="#60A5FA"
          maxOpacity={0.45}
          flickerChance={0.1}
          hoverRadius={85}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            maskImage:
              'radial-gradient(ellipse 1100px 92% at 50% 48%, transparent 16%, rgba(0, 0, 0, 0.65) 55%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 1100px 92% at 50% 48%, transparent 16%, rgba(0, 0, 0, 0.65) 55%, transparent 100%)',
          }}
        />

        {/* Top Gradient Fade */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: 'linear-gradient(to bottom, #ffffff 20%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Bottom Gradient Fade: 140px smooth washout before fixed ProgressiveBlur at the very end of the page */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '140px',
            background: 'linear-gradient(to top, #ffffff 25%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Foreground Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '820px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
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
          Open Source
        </h2>

      <p
        style={{
          fontSize: 'clamp(15px, 1.8vw, 17px)',
          lineHeight: 1.65,
          color: '#6e6e73',
          letterSpacing: '-0.01em',
          maxWidth: '680px',
          margin: '0 auto 28px',
        }}
      >
        Veilora is 100% free and open-source under the MIT license. There are no paywalls, closed-source tracking blobs, or proprietary network locks. Every line of code is inspectable, auditable, and built for device privacy.
      </p>

      {/* Resource Action Pills (Matching Signature Apple HIG Pill Style) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '36px',
        }}
      >
        {RESOURCE_LINKS.map((link) => (
          <ResourcePill key={link.label} link={link} />
        ))}
      </div>

      {/* Contributors Section with Direct Link to Official GitHub Contributors Page */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <a
          href="https://github.com/romitmeher/veilora/graphs/contributors"
          target="_blank"
          rel="noreferrer noopener"
          style={{
            fontSize: '13px',
            color: '#86868b',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#86868b')}
        >
          <span>Contributors</span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>

        {/* Contributor Pills linking directly to their official GitHub profiles */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {contributors.map((c) => (
            <ContributorPill key={c.login} contributor={c} />
          ))}
        </div>
      </div>
      </div>

      {/* Footer rendered directly over the continuous FlickeringGrid until the end of the page */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <Footer />
      </div>
    </section>
  );
};
