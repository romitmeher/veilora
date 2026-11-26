interface FluidSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function FluidSwitch({
  id,
  checked,
  onChange,
  disabled = false,
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
      className={`fluid-switch ${checked ? 'is-checked' : ''} ${className}`}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="fluid-switch__thumb" aria-hidden="true" />
    </button>
  );
}
