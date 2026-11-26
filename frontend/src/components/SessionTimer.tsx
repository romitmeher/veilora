import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

interface SessionTimerProps {
  seconds: number;
  className?: string;
}

export function SessionTimer({ seconds, className = '' }: SessionTimerProps) {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  return (
    <NumberFlowGroup>
      <span className={`session-timer ${className}`}>
        <NumberFlow value={hrs} trend={1} format={{ minimumIntegerDigits: 2 }} />
        <span className="session-timer__sep">:</span>
        <NumberFlow value={mins} trend={1} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
        <span className="session-timer__sep">:</span>
        <NumberFlow value={secs} trend={1} format={{ minimumIntegerDigits: 2 }} digits={{ 1: { max: 5 } }} />
      </span>
    </NumberFlowGroup>
  );
}
