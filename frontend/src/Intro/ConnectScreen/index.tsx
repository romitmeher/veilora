import { Button, Card } from '@blueprintjs/core';
import { Trans, useTranslation } from 'react-i18next';

import GithubIcon from '@/assets/icons/github.svg';
import { SOCIAL_LINKS } from '@/constants/urls';
import { BrowserOpenURL } from 'wails/runtime/runtime';

import './index.css';

export function ConnectScreen() {
  const { t } = useTranslation();

  return (
    <div className="intro-screen">
      <h3 className="bp6-heading intro-heading">{t('intro.connect.title')}</h3>
      <p className="intro-description bp6-running-text">{t('intro.connect.description')}</p>
      <p className="intro-description bp6-running-text">
        <Trans
          i18nKey="intro.connect.caNote"
          components={{
            strong: <strong />,
            br: <br />,
          }}
        />
      </p>

      <Card elevation={1} className="connect-card">
        <p className="bp6-heading">
          <strong>{t('intro.connect.socialText')}</strong>
        </p>

        <div className="social-links-grid">
          <div className="social-row">
            <Button fill onClick={() => BrowserOpenURL(SOCIAL_LINKS.GITHUB)} className="social-button">
              <img src={GithubIcon} className="social-icon" alt="GitHub" />
              GitHub
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
