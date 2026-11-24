import React from 'react';

export interface FlagProps {
  countryCode: 'IN' | 'CH' | 'IS' | 'JP' | 'NL' | 'SE' | 'DE' | 'SG';
  className?: string;
  style?: React.CSSProperties;
}

export const CountryFlag: React.FC<FlagProps> = ({ countryCode, style }) => {
  const code = countryCode.toLowerCase();

  return (
    <img
      src={`./flags/${code}.svg`}
      alt={countryCode}
      style={{
        width: '24px',
        height: '17px',
        borderRadius: '3px',
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        ...style,
      }}
    />
  );
};
