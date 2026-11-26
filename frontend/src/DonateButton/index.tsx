import { Button, Icon } from '@blueprintjs/core';

import { BrowserOpenURL } from 'wails/runtime/runtime';

import './index.css';

const LINK = 'https://github.com/romitmeher/veilora';

export function DonateButton() {
  return (
    <Button
      icon={<Icon icon="heart" className="donate-button__icon" />}
      variant="outlined"
      onClick={() => BrowserOpenURL(LINK)}
    >
      Support Veilora
    </Button>
  );
}
