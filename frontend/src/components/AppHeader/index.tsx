import { Button } from '@blueprintjs/core';

import logo from '@/assets/veilora.png';
import { ThemeType, useTheme } from '@/common/ThemeManager';
import { BrowserOpenURL } from 'wails/runtime/runtime';

import './index.css';

export function AppHeader() {
  const { effectiveTheme, setTheme } = useTheme();
  return (
    <div className="heading">
      <div className="heading__branding">
        <img className="heading__logo" src={logo} alt="" />
        <div>
          <span className="heading__name">Veilora</span>
        </div>
      </div>
      <div className="heading__tools">
        <Button
          icon={effectiveTheme === ThemeType.DARK ? 'flash' : 'moon'}
          variant="minimal"
          aria-label={effectiveTheme === ThemeType.DARK ? 'Switch to light theme' : 'Switch to dark theme'}
          title={effectiveTheme === ThemeType.DARK ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(effectiveTheme === ThemeType.DARK ? ThemeType.LIGHT : ThemeType.DARK)}
        />
        <Button
          icon="git-branch"
          variant="minimal"
          aria-label="Veilora on GitHub"
          title="Veilora on GitHub"
          onClick={() => BrowserOpenURL('https://github.com/romitmeher/veilora')}
        />
      </div>
    </div>
  );
}
