interface FluidSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function FluidSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  pending = false,
  className = '',
  'aria-label': ariaLabel,
}: FluidSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`fluid-switch ${checked ? 'is-checked' : ''} ${pending ? 'is-pending' : ''} ${className}`}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="fluid-switch__thumb" aria-hidden="true" />
    </button>
  );
}
