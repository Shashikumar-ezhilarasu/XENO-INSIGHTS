'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CampaignAnalyticItem {
  campaignId: string;
  campaignName: string;
  channel: string;
  promptText: string | null;
  messageTemplate: string | null;
  createdAt: string;
  totalMessages: number;
  statusCounts: {
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    failed: number;
  };
  rates: {
    deliveryRatePercent: number;
    openRatePercent: number;
    failRatePercent: number;
  };
}

export function useLivePolling(backendUrl: string) {
  const [analytics, setAnalytics] = useState<CampaignAnalyticItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/analytics`);
      if (!res.ok) {
        throw new Error('Failed to retrieve analytics logs.');
      }
      const data = await res.json();
      setAnalytics(data.analytics || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError('Could not connect to CRM backend. Verify server status on port 3000.');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Dynamic 2s interval polling - active ONLY when pending > 0
  useEffect(() => {
    const isTransmitting = analytics.some(item => item.statusCounts.pending > 0);
    if (!isTransmitting) return;

    console.log('[Polling Engine] Active campaign detected. Enabling 2-second metric synchronization.');
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 2000);

    return () => {
      console.log('[Polling Engine] Disabling metric synchronization.');
      clearInterval(interval);
    };
  }, [analytics, fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
}
