import React from 'react';

export const CatalystLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <defs>
      <linearGradient id="catalyst-gradient" x1="0" y1="120" x2="120" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    {/* Stylized Hexagonal Icon based on the provided image */}
    <path 
      d="M30 40L60 22L90 40L105 31L60 5L15 31V89L60 115L105 89V70L90 79V89L60 106L30 89V40Z" 
      fill="url(#catalyst-gradient)" 
    />
    <path 
      d="M40 55L60 43L80 55L60 67L40 55Z" 
      fill="url(#catalyst-gradient)" 
      fillOpacity="0.6"
    />
    <path 
      d="M40 75L60 63L80 75L60 87L40 75Z" 
      fill="url(#catalyst-gradient)" 
      fillOpacity="0.8"
    />
    {/* Growth Arrow */}
    <path 
      d="M90 40L115 15M115 15H100M115 15V30" 
      stroke="url(#catalyst-gradient)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);
