'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CommandCenter from '../components/CommandCenter';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import CampaignList from '../components/CampaignList';
import { Loader2, RefreshCw, Sun, Moon } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface CampaignAnalyticItem {
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

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<CampaignAnalyticItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Client-side theme loader (hydration-safe)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Fetch metrics and campaign lists in one unified endpoint query
  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analytics`);
      if (!response.ok) {
        throw new Error('Failed to retrieve analytics logs.');
      }
      const data = await response.json();
      setAnalytics(data.analytics || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard analytics:', err);
      setError('Could not connect to CRM backend. Verify server status on port 3000.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Initial mount load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 2. React state polling loop
  // Triggers polling EVERY 2 seconds ONLY when at least one campaign is transmitting (pending > 0)
  useEffect(() => {
    const isTransmitting = analytics.some(item => item.statusCounts.pending > 0);
    
    if (!isTransmitting) return;

    console.log('[Polling Engine] Active campaign detected. Enabling 2-second metric synchronization.');
    const pollInterval = setInterval(() => {
      loadDashboardData();
    }, 2000);

    return () => {
      console.log('[Polling Engine] Disabling metric synchronization.');
      clearInterval(pollInterval);
    };
  }, [analytics, loadDashboardData]);

  // Derive campaign summary for Audit table
  const campaigns = analytics.map(item => {
    let status = 'COMPLETED';
    if (item.statusCounts.pending > 0) {
      status = 'SENDING';
    } else if (item.totalMessages === 0) {
      status = 'DRAFT';
    }
    return {
      id: item.campaignId,
      name: item.campaignName,
      promptText: item.promptText,
      messageTemplate: item.messageTemplate,
      channel: item.channel,
      status,
      createdAt: item.createdAt,
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 transition-colors duration-200">
      
      {/* Premium Navigation Bar */}
      <header className="border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">
              X
            </div>
            <div>
              <span className="font-semibold text-foreground tracking-tight">XENO</span>
              <span className="text-[10px] text-neutral-500 block -mt-1 font-medium">AI Marketing CRM</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-neutral-500 hover:text-foreground rounded-lg hover:bg-secondary transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Refresh Button */}
            <button 
              onClick={() => {
                setIsLoading(true);
                loadDashboardData();
              }}
              className="p-2 text-neutral-500 hover:text-foreground rounded-lg hover:bg-secondary transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 border-l border-border pl-4 h-5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-neutral-500 font-mono font-semibold">STABLE API</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core Dashboard Layout */}
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-10">
        
        {/* Hero Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
            AI-Native Marketing Campaign Manager
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl font-medium">
            Type natural language goals to filter customers, draft automated offers, and monitor real-time delivery funnels.
          </p>
        </div>

        {/* 1. CommandCenter (AI Query Input) */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">AI Command bar</h2>
          <CommandCenter 
            backendUrl={BACKEND_URL} 
            onCampaignLaunched={() => loadDashboardData()} 
          />
        </section>

        {/* Connection Error Message */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && analytics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <p className="text-neutral-500 text-sm font-medium">Synchronizing live CRM analytics database...</p>
          </div>
        ) : (
          <>
            {/* 2. Analytics Dashboard */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Performance Metrics</h2>
              <AnalyticsDashboard analytics={analytics} />
            </section>

            {/* 3. Campaign List Audit */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Audits & logs</h2>
              <CampaignList campaigns={campaigns} />
            </section>
          </>
        )}
        
      </main>
    </div>
  );
}
