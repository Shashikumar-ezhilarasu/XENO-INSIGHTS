'use client';

import React from 'react';
import { useLivePolling } from '../hooks/useLivePolling';
import CampaignList from '../components/CampaignList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Send, CheckCircle2, Eye, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function OverviewPage() {
  const { analytics, isLoading, error } = useLivePolling(BACKEND_URL);

  // Derived SaaS Metrics
  const totalCampaigns = analytics.length;
  const activeCampaigns = analytics.filter(c => c.statusCounts.pending > 0).length;
  
  const totalAudienceEngaged = analytics.reduce((sum, c) => sum + c.totalMessages, 0);
  const totalDelivered = analytics.reduce((sum, c) => sum + c.statusCounts.delivered + c.statusCounts.opened, 0);
  const totalOpened = analytics.reduce((sum, c) => sum + c.statusCounts.opened, 0);

  const avgDeliveryRate = totalAudienceEngaged > 0
    ? Math.round((totalDelivered / totalAudienceEngaged) * 10000) / 100
    : 0;
    
  const avgOpenRate = totalAudienceEngaged > 0
    ? Math.round((totalOpened / totalAudienceEngaged) * 10000) / 100
    : 0;

  // Format campaigns for audit table listing
  const campaignsList = analytics.map(item => {
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
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
          Dashboard Overview
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl font-medium">
          Monitor your customer outreach campaigns, check historical status metrics, and review execution logs.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {isLoading && analytics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-neutral-500 text-sm font-medium">Synchronizing dynamic dashboard analytics...</p>
        </div>
      ) : (
        <>
          {/* SaaS KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Total Campaigns
                </CardTitle>
                <Send className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCampaigns}</div>
                <p className="text-xs text-neutral-500 mt-1">
                  {activeCampaigns} currently executing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Audience Reach
                </CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAudienceEngaged}</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Total target customers reached
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Avg Delivery Rate
                </CardTitle>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500 inline-block" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgDeliveryRate}%</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Delivery success funnel ratio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Avg Open Rate
                </CardTitle>
                <Eye className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgOpenRate}%</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Message open rate success
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Campaign Audits & logs</h2>
            <CampaignList campaigns={campaignsList} />
          </section>
        </>
      )}
    </div>
  );
}
