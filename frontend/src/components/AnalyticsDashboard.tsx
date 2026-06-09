'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ShieldCheck, MessageSquare, AlertCircle, Users2 } from 'lucide-react';

interface CampaignAnalyticItem {
  campaignId: string;
  campaignName: string;
  channel: string;
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

interface AnalyticsDashboardProps {
  analytics: CampaignAnalyticItem[];
}

export default function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  // 1. Calculate cumulative metrics
  let totalAudience = 0;
  let totalDelivered = 0;
  let totalOpened = 0;
  let totalFailed = 0;

  for (const item of analytics) {
    totalAudience += item.totalMessages;
    totalDelivered += item.statusCounts.delivered + item.statusCounts.opened;
    totalOpened += item.statusCounts.opened;
    totalFailed += item.statusCounts.failed;
  }

  const deliveryRate = totalAudience > 0 ? (totalDelivered / totalAudience) * 100 : 0;
  const openRate = totalAudience > 0 ? (totalOpened / totalAudience) * 100 : 0;
  const failRate = totalAudience > 0 ? (totalFailed / totalAudience) * 100 : 0;

  // 2. Identify the active campaign that is sending (i.e. has pending logs)
  const activeCampaign = analytics.find(item => item.statusCounts.pending > 0);
  let activeProgress = 0;
  let activeProcessed = 0;
  if (activeCampaign) {
    activeProcessed = activeCampaign.totalMessages - activeCampaign.statusCounts.pending;
    activeProgress = activeCampaign.totalMessages > 0 
      ? (activeProcessed / activeCampaign.totalMessages) * 100 
      : 0;
  }

  // 3. Format data for Recharts
  const chartData = analytics.map(item => ({
    name: item.campaignName.length > 15 ? item.campaignName.substring(0, 15) + '...' : item.campaignName,
    'Delivery %': item.rates.deliveryRatePercent,
    'Open %': item.rates.openRatePercent,
    'Fail %': item.rates.failRatePercent,
  })).reverse(); // Oldest to newest left-to-right

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Audience */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Audience Size</span>
            <Users2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{totalAudience.toLocaleString()}</p>
          <span className="text-[9px] text-neutral-500 block font-medium">Accumulated contacts targeted</span>
        </div>

        {/* Card 2: Delivery */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Delivered Rate</span>
            <ShieldCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{deliveryRate.toFixed(1)}%</p>
          <span className="text-[9px] text-green-600 dark:text-green-500 font-semibold block">✔ Successful transmissions</span>
        </div>

        {/* Card 3: Open Rate */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Open Rate</span>
            <MessageSquare className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{openRate.toFixed(1)}%</p>
          <span className="text-[9px] text-neutral-500 block font-medium">Opened or read indicators</span>
        </div>

        {/* Card 4: Failed */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bounce/Fail Rate</span>
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{failRate.toFixed(1)}%</p>
          <span className="text-[9px] text-red-600 dark:text-red-500 font-semibold block">✘ Rejected or network errors</span>
        </div>
      </div>

      {/* Live Progress Bar for Active Campaign */}
      {activeCampaign && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-md relative overflow-hidden animate-pulse">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 text-[9px] tracking-wider font-bold rounded uppercase">
                Sending Active
              </span>
              <h4 className="text-sm font-semibold text-foreground mt-1">
                Executing Campaign: <span className="font-mono text-neutral-600 dark:text-neutral-300">{activeCampaign.campaignName}</span>
              </h4>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              {activeProcessed} of {activeCampaign.totalMessages} logs processed ({Math.round(activeProgress)}%)
            </span>
          </div>
          
          {/* Progress Slider */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${activeProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Campaign Conversion Analysis</h3>
        <div className="w-full h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]} 
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))', 
                    color: 'hsl(var(--foreground))', 
                    fontSize: '12px',
                    borderRadius: '8px'
                  }} 
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
                  iconSize={8}
                />
                <Bar dataKey="Delivery %" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Open %" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Fail %" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500 text-sm font-medium">
              Launch campaigns to see visual performance charts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
