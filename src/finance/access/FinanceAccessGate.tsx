import React, { useState, useEffect } from 'react';
import { FinancePasswordGate } from './FinancePasswordGate';

interface FinanceAccessGateProps {
  children: React.ReactNode;
}

export const FinanceAccessGate: React.FC<FinanceAccessGateProps> = ({ children }) => {
  // Inicialización síncrona para evitar parpadeos
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('catalyst_finance_unlocked') === 'true';
  });

  useEffect(() => {
    const handleLock = () => setIsUnlocked(false);
    window.addEventListener('finance:lock', handleLock);
    
    return () => {
      window.removeEventListener('finance:lock', handleLock);
    };
  }, []);

  const handleUnlock = () => {
    sessionStorage.setItem('catalyst_finance_unlocked', 'true');
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return <FinancePasswordGate onUnlock={handleUnlock} />;
  }

  return <>{children}</>;
};
