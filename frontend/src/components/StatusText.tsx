import { TextMorph } from 'torph/react';

/** Only real status changes animate; reduced-motion users get immediate updates. */
export function StatusText({ children }: { children: string }) {
  return (
    <TextMorph duration={160} scale={false} respectReducedMotion>
      {children}
    </TextMorph>
  );
}
