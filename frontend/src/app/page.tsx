'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../hooks/useSharedState';
import { useLivePolling } from '../hooks/useLivePolling';
import CampaignList from '../components/CampaignList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Send, CheckCircle2, Eye, Loader2, Sparkles, AlertTriangle, Moon } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface RFMCluster {
  count: number;
  customers: any[];
}

export default function OverviewPage() {
  const router = useRouter();
  const { setSelectedAudience } = useSharedState();
  const { analytics, isLoading, error } = useLivePolling(BACKEND_URL);

  const [rfmData, setRfmData] = useState<{
    champions: RFMCluster;
    atRisk: RFMCluster;
    hibernating: RFMCluster;
  } | null>(null);
  const [rfmLoading, setRfmLoading] = useState(true);

  // Fetch RFM customer clusters
  useEffect(() => {
    async function loadRfm() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/customers/rfm`);
        if (res.ok) {
          const data = await res.json();
          setRfmData({
            champions: data.champions,
            atRisk: data.atRisk,
            hibernating: data.hibernating
          });
        }
      } catch (e) {
        console.error('Error fetching RFM data:', e);
      } finally {
        setRfmLoading(false);
      }
    }
    loadRfm();
  }, []);

  // Derived SaaS Metrics
  const totalCampaigns = analytics.length;
  const activeCampaigns = analytics.filter(c => c.statusCounts.pending > 0).length;
  
  const totalAudienceEngaged = analytics.reduce((sum, c) => sum + c.totalMessages, 0);
  const totalDelivered = analytics.reduce((sum, c) => sum + c.statusCounts.delivered + c.statusCounts.opened + c.statusCounts.clicked, 0);
  const totalOpened = analytics.reduce((sum, c) => sum + c.statusCounts.opened + c.statusCounts.clicked, 0);
  const totalClicked = analytics.reduce((sum, c) => sum + (c.statusCounts.clicked || 0), 0);

  const avgDeliveryRate = totalAudienceEngaged > 0
    ? Math.round((totalDelivered / totalAudienceEngaged) * 10000) / 100
    : 0;
    
  const avgOpenRate = totalAudienceEngaged > 0
    ? Math.round((totalOpened / totalAudienceEngaged) * 10000) / 100
    : 0;

  const avgClickRate = totalAudienceEngaged > 0
    ? Math.round((totalClicked / totalAudienceEngaged) * 10000) / 100
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

  // RFM Tile Click Handler
  const handleRfmTileClick = (clusterName: string, cluster: RFMCluster, description: string) => {
    if (cluster.count === 0) return;

    setSelectedAudience({
      audienceSize: cluster.count,
      customers: cluster.customers,
      query: `RFM Cluster: ${clusterName}`,
      explanation: description
    });

    router.push('/campaigns');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
          Dashboard Overview
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl font-medium">
          Monitor campaign outcomes, execute RFM target win-backs, and view communication logs.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* RFM AI Clustering Tiles */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Pre-emptive RFM Clustering (Click to Target)</h2>
        {rfmLoading ? (
          <div className="flex items-center space-x-2 text-sm text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calculating RFM matrices...</span>
          </div>
        ) : rfmData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Champions Tile */}
            <Card
              className="cursor-pointer hover:border-green-500/50 dark:hover:border-green-500/30 hover:bg-green-50/5 dark:hover:bg-green-950/5 transition duration-300"
              onClick={() => handleRfmTileClick('Champions', rfmData.champions, 'Targeting Champions segment: High-spending loyal shoppers with active visits in the last 30 days.')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-400">Champions</CardTitle>
                <Sparkles className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{rfmData.champions.count}</div>
                <p className="text-xs text-neutral-500 mt-1">High spends, visited within last 30d</p>
              </CardContent>
            </Card>

            {/* At Risk Tile */}
            <Card
              className="cursor-pointer hover:border-amber-500/50 dark:hover:border-amber-500/30 hover:bg-amber-50/5 dark:hover:bg-amber-950/5 transition duration-300"
              onClick={() => handleRfmTileClick('At Risk', rfmData.atRisk, 'Targeting At Risk segment: High-spending shoppers who have not purchased in over 60 days.')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">At Risk</CardTitle>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{rfmData.atRisk.count}</div>
                <p className="text-xs text-neutral-500 mt-1">High spends, no purchase for 60d+</p>
              </CardContent>
            </Card>

            {/* Hibernating Tile */}
            <Card
              className="cursor-pointer hover:border-neutral-400/50 hover:bg-neutral-50/5 dark:hover:bg-neutral-950/5 transition duration-300"
              onClick={() => handleRfmTileClick('Hibernating', rfmData.hibernating, 'Targeting Hibernating segment: Low spends and no visits in the last 60 days.')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-neutral-500">Hibernating</CardTitle>
                <Moon className="w-4 h-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{rfmData.hibernating.count}</div>
                <p className="text-xs text-neutral-500 mt-1">Low spends, no purchase for 60d+</p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      {isLoading && analytics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-neutral-500 text-sm font-medium">Synchronizing dashboard metrics...</p>
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
                  Total Reach
                </CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAudienceEngaged}</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Total messages sent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Avg Delivery Rate
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgDeliveryRate}%</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Delivery success ratio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Avg Click Rate
                </CardTitle>
                <Eye className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgClickRate}%</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Interaction click-through rate
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
