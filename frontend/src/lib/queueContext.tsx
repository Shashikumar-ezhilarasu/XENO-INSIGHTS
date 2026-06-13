'use client';

/**
 * @file queueContext.tsx
 * @module lib/queueContext
 * @description
 * Global React context that polls the backend BullMQ stats endpoint every 5 seconds.
 * Exposes active queue processing states and accumulated totals to show pulsing lights
 * and progress bars.
 * 
 * JSDOC SECTION: 7
 * Follows strict function parameter and return type declarations.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface QueueContextType {
  isProcessing: boolean;
  totalProcessed: number;
  totalFailed: number;
}

const QueueContext = createContext<QueueContextType>({
  isProcessing: false,
  totalProcessed: 0,
  totalFailed: 0
});

export const useQueue = () => useContext(QueueContext);

/**
 * @function QueueProvider
 * @description Context provider that regularly polls BullMQ stats from the backend.
 * @param props {{ children: React.ReactNode }} component children
 * @returns {React.JSX.Element} Provider element
 */
export function QueueProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);

  const fetchStats = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/queue/stats`);
      if (res.ok) {
        const data = await res.json();
        setIsProcessing(data.isProcessing);
        setTotalProcessed(data.totals?.completed || 0);
        setTotalFailed(data.totals?.failed || 0);
      }
    } catch (err) {
      // Fail silently to avoid polluting console during offline development
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueueContext.Provider value={{ isProcessing, totalProcessed, totalFailed }}>
      {children}
    </QueueContext.Provider>
  );
}
