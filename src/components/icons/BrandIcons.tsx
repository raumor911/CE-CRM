import React from 'react';
import logoUrl from '../../assets/logo.png';

export const CatalystLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <img 
      src={logoUrl} 
      alt="Catalyst Logo" 
      className="relative z-10 w-full h-full object-contain"
      style={{
        filter: 'contrast(1.1) saturate(1.2)'
      }}
    />
  </div>
);
