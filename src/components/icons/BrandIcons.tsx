import React from 'react';
const logoUrl = '/media/branding/CATALYST-logo-transparent.svg';

export const CatalystLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center ${className}`}>
    <img 
      src={logoUrl} 
      alt="Catalyst Logo" 
      className="w-full h-auto object-contain"
    />
  </div>
);

export const RentasIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none"
    className={className}
  >
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="11" rx="2"/>
      <path d="M7 7.5v4M10.5 7.5v4M14 7.5v4M17.5 7.5v4"/>
      <path d="M6 20h10.5a3.5 3.5 0 0 0 3.5-3.5"/>
      <path d="m17.5 18.5 2.5-2 2 2.5"/>
    </g>
  </svg>
);

export const ContainerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none"
    className={className}
  >
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="19" height="12.5" rx="1.5"/>
      <path d="M6 8.5v6.5M9 8.5v6.5M12 8.5v6.5M15 8.5v6.5"/>
      <path d="M18 5.5V18M18 11.75h1.25"/>
      <path d="M5 18v1M19 18v1"/>
    </g>
  </svg>
);
