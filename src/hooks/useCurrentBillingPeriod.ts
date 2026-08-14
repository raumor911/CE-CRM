import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';

export const getBillingPeriod = (now: Date) => {
  return format(startOfMonth(now), 'yyyy-MM-01');
};

export const useCurrentBillingPeriod = () => {
  const [currentPeriod, setCurrentPeriod] = useState(() => getBillingPeriod(new Date()));
  const [previousPeriod, setPreviousPeriod] = useState<string | null>(null);
  const [hasPeriodChanged, setHasPeriodChanged] = useState(false);

  const checkPeriod = useCallback(() => {
    const latestPeriod = getBillingPeriod(new Date());
    setCurrentPeriod((prevPeriod) => {
      if (prevPeriod !== latestPeriod) {
        setPreviousPeriod(prevPeriod);
        setHasPeriodChanged(true);
        return latestPeriod;
      }
      return prevPeriod;
    });
  }, []);

  const acknowledgePeriodChange = useCallback(() => {
    setHasPeriodChanged(false);
  }, []);

  useEffect(() => {
    const handleFocus = () => checkPeriod();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPeriod();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check
    checkPeriod();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkPeriod]);

  return {
    currentPeriod,
    previousPeriod,
    hasPeriodChanged,
    acknowledgePeriodChange
  };
};
