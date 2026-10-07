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
          y="595"
          textAnchor="middle"
          textLength="780"
          lengthAdjust="spacingAndGlyphs"
          fontFamily="'Arial Narrow', 'Liberation Sans Narrow', 'Impact', sans-serif"
          fontSize="340"
          fontWeight="700"
          fill="#FFFFFF"
        >
          BARISTA
        </text>

        {/* Brown underline beneath wordmark (#641B0B) */}
        <rect x="502" y="630" width="150" height="32" rx="2" fill="#641B0B"/>
      </svg>
    </div>
  );
};

