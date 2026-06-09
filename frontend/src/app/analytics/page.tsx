'use client';

import React from 'react';
import { useLivePolling } from '../../hooks/useLivePolling';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function AnalyticsPage() {
  const { analytics, isLoading, error, refetch } = useLivePolling(BACKEND_URL);

  const activeSending = analytics.some(item => item.statusCounts.pending > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
            Campaign Analytics Monitor
          </h1>
          <p className="text-sm text-neutral-500 font-medium">
            Monitor real-time message delivery flows, open ratios, and transmission trends.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeSending && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md animate-pulse">
              Live Polling Active (2s)
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {isLoading && analytics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-neutral-500 text-sm font-medium">Synchronizing delivery streams...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnalyticsDashboard analytics={analytics} />
        </div>
      )}
    </div>
  );
}
