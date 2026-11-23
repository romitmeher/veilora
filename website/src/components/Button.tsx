import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  target?: string;
  rel?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  href,
  target,
  rel,
  size = 'md',
  icon,
  children,
  className = '',
  ...rest
}) => {
  const sizeClass = size === 'sm' ? 'btn-primary-sm' : size === 'lg' ? 'btn-primary-lg' : '';
  const combinedClass = `btn-primary ${sizeClass} ${className}`.trim();

  const content = (
    <>
      <span className="btn-shine" aria-hidden="true" />
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? (rel ?? 'noreferrer noopener') : rel}
        className={combinedClass}
      >
        {content}
      </a>
    );
  }

  return (
    <button className={combinedClass} {...rest}>
      {content}
    </button>
  );
};
