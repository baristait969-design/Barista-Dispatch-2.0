import React from 'react';

interface BaristaLogoProps {
  className?: string;
  size?: number;
  variant?: 'circle' | 'horizontal' | 'text';
}

export const BaristaLogo: React.FC<BaristaLogoProps> = ({ 
  className = 'w-9 h-9', 
  size,
  variant = 'circle'
}) => {
  const dimension = size || (className.includes('w-13') ? 52 : className.includes('w-10') ? 40 : 36);

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-[#EF6340] ${className}`}
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
        backgroundColor: '#EF6340',
        borderRadius: '50%',
        boxSizing: 'border-box'
      }}
      title="Barista Coffee Lanka"
    >
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Coral Orange Circular Base (#EF6340) */}
        <circle cx="500" cy="500" r="500" fill="#EF6340"/>
        
        {/* BARISTA wordmark - Centered with optimal font geometry */}
        <text
          x="500"
          y="560"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="240"
          fontWeight="900"
          letterSpacing="12"
          fill="#FFFFFF"
        >
          BARISTA
        </text>

        {/* Brown underline beneath wordmark (#641B0B) */}
        <rect x="420" y="660" width="160" height="24" rx="4" fill="#641B0B"/>
      </svg>
    </div>
  );
};

