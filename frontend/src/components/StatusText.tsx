import type { ElementType } from 'react';
import { TextMorph } from 'torph/react';

interface StatusTextProps {
  children: string | number;
  numbers?: boolean;
  as?: ElementType;
  className?: string;
}

/** Only real status changes animate; reduced-motion users get immediate updates. */
export function StatusText({ children, numbers = false, as, className }: StatusTextProps) {
  return (
    <TextMorph duration={160} scale={false} numbers={numbers} as={as} className={className} respectReducedMotion>
      {children}
    </TextMorph>
  );
}
