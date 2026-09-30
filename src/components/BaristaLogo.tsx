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
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full shadow-md overflow-hidden bg-[#EF6340] transition-transform hover:scale-105 ${className}`}
      style={size ? { width: size, height: size } : undefined}
      title="Barista Coffee Lanka"
    >
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* Coral Orange Circular Base (#EF6340) */}
        <circle cx="500" cy="500" r="500" fill="#EF6340"/>
        
        {/* BARISTA wordmark */}
        <text
          x="500"
          y="672"
          textAnchor="middle"
          textLength="780"
          lengthAdjust="spacingAndGlyphs"
          fontFamily="Arial Narrow, Liberation Sans Narrow, Impact, sans-serif"
          fontSize="345"
          fontWeight="700"
          fill="#FFFFFF"
        >
          BARISTA
        </text>

        {/* Brown underline beneath the I/S (#641B0B) */}
        <rect x="502" y="640" width="150" height="32" rx="1" fill="#641B0B"/>
      </svg>
    </div>
  );
};
