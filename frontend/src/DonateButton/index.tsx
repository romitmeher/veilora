import { Button, Icon } from '@blueprintjs/core';

import { BrowserOpenURL } from 'wails/runtime/runtime';

import './index.css';

const LINK = 'https://opencollective.com/zen-privacy';

export function DonateButton() {
  return (
    <Button
      icon={<Icon icon="heart" className="donate-button__icon" />}
      variant="outlined"
      onClick={() => BrowserOpenURL(LINK)}
    >
      Support upstream Zen
    </Button>
  );
}
