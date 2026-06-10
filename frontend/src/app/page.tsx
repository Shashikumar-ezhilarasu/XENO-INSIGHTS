'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../hooks/useSharedState';
import { useLivePolling } from '../hooks/useLivePolling';
import CampaignList from '../components/CampaignList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Users, Send, CheckCircle2, Eye, Loader2, Sparkles, 
  AlertTriangle, Moon, Award, Calendar, ShoppingBag, 
  ArrowRight, User, X, Landmark, TrendingUp
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface RFMCluster {
  count: number;
  customers: any[];
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpends: number;
  loyaltyPoints: number;
  favoriteCategory: string;
  discountSeekingBehavior: string;
  preferredShoppingDay: string;
  referrerId: string | null;
  referrer?: { name: string; email: string } | null;
  referred?: { id: string; name: string }[];
}

const MOCK_CUSTOMERS_360: CustomerProfile[] = [
  {
    id: 'cust-1',
    name: 'Emma Smith',
    email: 'emma.smith@example.com',
    phone: '+14155552671',
    totalSpends: 480.50,
    loyaltyPoints: 120.5,
    favoriteCategory: 'Coffee',
    discountSeekingBehavior: 'HIGH',
    preferredShoppingDay: 'Saturday',
    referrerId: 'cust-3',
  },
  {
    id: 'cust-2',
    name: 'Liam Johnson',
    email: 'liam.johnson@example.com',
    phone: '+14155558192',
    totalSpends: 90.00,
    loyaltyPoints: 45.0,
    favoriteCategory: 'Bakery',
    discountSeekingBehavior: 'MID',
    preferredShoppingDay: 'Sunday',
    referrerId: null,
  },
  {
    id: 'cust-3',
    name: 'Olivia Williams',
    email: 'olivia.williams@example.com',
    phone: '+12025550143',
    totalSpends: 1250.00,
    loyaltyPoints: 310.2,
    favoriteCategory: 'Apparel',
    discountSeekingBehavior: 'LOW',
    preferredShoppingDay: 'Friday',
    referrerId: null,
  },
  {
    id: 'cust-4',
    name: 'Noah Brown',
    email: 'noah.brown@example.com',
    phone: '+13125559812',
    totalSpends: 35.00,
    loyaltyPoints: 15.0,
    favoriteCategory: 'Coffee',
    discountSeekingBehavior: 'HIGH',
    preferredShoppingDay: 'Monday',
    referrerId: 'cust-1',
  },
  {
    id: 'cust-5',
    name: 'Ava Jones',
    email: 'ava.jones@example.com',
    phone: '+16175550183',
    totalSpends: 680.00,
    loyaltyPoints: 240.0,
    favoriteCategory: 'Beauty',
    discountSeekingBehavior: 'MID',
    preferredShoppingDay: 'Wednesday',
    referrerId: null,
  }
];

const MOCK_RFM = {
  champions: {
    count: 2,
    customers: [MOCK_CUSTOMERS_360[0], MOCK_CUSTOMERS_360[2]]
  },
  atRisk: {
    count: 1,
    customers: [MOCK_CUSTOMERS_360[4]]
  },
  hibernating: {
    count: 2,
    customers: [MOCK_CUSTOMERS_360[1], MOCK_CUSTOMERS_360[3]]
  }
};

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

  // Customer Hub States
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        } else {
          setRfmData(MOCK_RFM);
        }
      } catch (e) {
        console.warn('Error fetching RFM data, using offline fallback:', e);
        setRfmData(MOCK_RFM);
      } finally {
        setRfmLoading(false);
      }
    }
    loadRfm();
  }, []);

  // Fetch customer lists for 360-degree view
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/customers?limit=6`);
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || MOCK_CUSTOMERS_360);
        } else {
          setCustomers(MOCK_CUSTOMERS_360);
        }
      } catch (e) {
        console.warn('Error fetching customers, using offline fallback:', e);
        setCustomers(MOCK_CUSTOMERS_360);
      } finally {
        setCustomersLoading(false);
      }
    }
    fetchCustomers();
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

  const handleOpenDrawer = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  // Simulated Lifecycle Journeys performance metrics
  const lifecycleJourneys = [
    {
      name: "New Customer Welcome Track",
      activeUsers: 48,
      avgDelivery: "96.4%",
      revenueGain: "$450.00",
      status: "Active",
      channelSplit: "Email & SMS"
    },
    {
      name: "90-Day Churn Prevention",
      activeUsers: 84,
      avgDelivery: "92.1%",
      revenueGain: "$1,280.00",
      status: "Active",
      channelSplit: "WhatsApp & SMS"
    },
    {
      name: "Loyalty Tier Birthday Surprise",
      activeUsers: 14,
      avgDelivery: "98.2%",
      revenueGain: "$320.00",
      status: "Active",
      channelSplit: "RCS Push"
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn relative pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
          Dashboard Overview
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl font-medium">
          Monitor campaign outcomes, execute RFM target win-backs, track behavioral customer personas, and manage lifecycle automation.
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

      {/* Dynamic Audience 360 Hub and Lifecycle Journeys split grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Lifecycle Journeys Track - 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Automated Lifecycle Journeys & Revenue Gains
            </h2>
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none font-semibold text-[10px]">
              Platform Growth Engines
            </Badge>
          </div>
          <Card className="shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {lifecycleJourneys.map((journey, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-secondary/15 transition duration-200">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{journey.name}</span>
                        <span className="px-1.5 py-0.2 bg-green-500/10 border border-green-500/20 text-green-600 text-[9px] font-bold rounded-full uppercase">
                          {journey.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-medium">Split Strategy: {journey.channelSplit}</p>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">Active Cohorts</span>
                        <span className="text-sm font-semibold font-mono">{journey.activeUsers} profiles</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">Deliv Rate</span>
                        <span className="text-sm font-semibold font-mono text-purple-600 dark:text-purple-400">{journey.avgDelivery}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block text-green-600">Net Revenue</span>
                        <span className="text-sm font-bold font-mono text-green-600">{journey.revenueGain}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: 360 Audience Hub - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-500" />
            360-Degree Audience Persona Hub
          </h2>
          <Card className="shadow-sm border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Shopper Activity Feed</CardTitle>
              <CardDescription>Select individual shoppers to inspect their 360-degree behavioral card</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customersLoading ? (
                <div className="flex items-center justify-center py-6 space-x-2 text-sm text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading profiles...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {customers.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => handleOpenDrawer(c)}
                      className="p-3 bg-secondary/20 hover:bg-purple-500/5 hover:border-purple-500/20 border border-border rounded-xl flex items-center justify-between cursor-pointer transition duration-300"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-foreground block">{c.name}</span>
                        <span className="text-[10px] text-neutral-500 font-medium">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Loyalty Balance</span>
                          <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">⚡ {c.loyaltyPoints} pts</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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

      {/* Sliding 360 Profile Drawer */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay background */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Sliding Panel */}
          <div className="relative w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between z-10 animate-slideLeft">
            
            {/* Header info */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  <User className="w-5 h-5 text-purple-600" />
                  Shopper Persona Profile
                </h3>
                <p className="text-xs text-neutral-500 font-medium">Customer ID: {selectedCustomer.id}</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-800 transition duration-200 text-neutral-500 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Card Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-neutral-900 border border-purple-500/20 space-y-3 relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-15">
                  <Landmark className="w-24 h-24 text-purple-500" />
                </div>
                <div className="space-y-1">
                  <span className="text-xl font-extrabold text-foreground">{selectedCustomer.name}</span>
                  <span className="text-xs text-neutral-400 block font-medium">{selectedCustomer.email}</span>
                  <span className="text-xs text-neutral-400 block font-mono font-medium">{selectedCustomer.phone}</span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Lifetime spend</span>
                    <span className="text-lg font-black text-green-600 block">${selectedCustomer.totalSpends.toFixed(2)}</span>
                  </div>
                  
                  {/* Loyalty Points Badge */}
                  <div className="bg-purple-600/15 border border-purple-600/35 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-bold block flex items-center gap-1 justify-center">
                      <Award className="w-3 h-3" />
                      Loyalty points
                    </span>
                    <span className="text-base font-black text-purple-600 dark:text-purple-400 font-mono block">⚡ {selectedCustomer.loyaltyPoints}</span>
                  </div>
                </div>
              </div>

              {/* Persona Attributes Block */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Behavioral Persona Attributes</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Favorite Category */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-amber-500" />
                      Favorite Category
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.favoriteCategory}</span>
                  </div>

                  {/* Shopping Day */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      Preferred Day
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.preferredShoppingDay}</span>
                  </div>

                  {/* Discount seeking Behavior */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1 col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-red-500" />
                        Discount Seeking Behavior
                      </span>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Affinity Level</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        selectedCustomer.discountSeekingBehavior === 'HIGH' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                        selectedCustomer.discountSeekingBehavior === 'MID' ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' :
                        'bg-green-500/10 text-green-600 border border-green-500/20'
                      }`}>
                        {selectedCustomer.discountSeekingBehavior}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {selectedCustomer.discountSeekingBehavior === 'HIGH' ? 'Highly sensitive to deals & clearance coupons.' :
                         selectedCustomer.discountSeekingBehavior === 'MID' ? 'Normal shopper; responds well to seasonal promos.' :
                         'Value shopper; focus is on high-quality full price products.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Tree Tracking */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Referral Network Tree</h4>
                <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-500">Referrer Status:</span>
                    <span className="text-foreground">
                      {selectedCustomer.referrerId ? 'Referred by Friend' : 'Direct Organic Acquisition'}
                    </span>
                  </div>
                  {selectedCustomer.referrerId && (
                    <div className="p-2 bg-background/50 border border-border rounded-lg text-[10px] text-neutral-400 font-mono">
                      Referrer ID: {selectedCustomer.referrerId}
                    </div>
                  )}
                </div>
              </div>

              {/* Coupon Usage Track */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Coupon & Promo Code History</h4>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-background">
                  <div className="p-3 flex items-center justify-between text-xs hover:bg-secondary/10">
                    <div className="space-y-0.5">
                      <code className="text-purple-600 font-bold">COMEBACK20</code>
                      <span className="text-[9px] text-neutral-400 block">Used during checkout #order-92b</span>
                    </div>
                    <span className="text-green-600 font-bold font-mono">-$20.00</span>
                  </div>
                  <div className="p-3 flex items-center justify-between text-xs hover:bg-secondary/10">
                    <div className="space-y-0.5">
                      <code className="text-purple-600 font-bold">SPIN_WHEEL_50</code>
                      <span className="text-[9px] text-neutral-400 block">Earned via Loyalty Milestones</span>
                    </div>
                    <span className="text-green-600 font-bold font-mono">-$5.50</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-border bg-secondary/10">
              <button 
                onClick={() => {
                  setSelectedAudience({
                    audienceSize: 1,
                    customers: [{ 
                      id: selectedCustomer.id, 
                      name: selectedCustomer.name, 
                      email: selectedCustomer.email,
                      phone: selectedCustomer.phone,
                      totalSpends: selectedCustomer.totalSpends
                    }],
                    query: `Direct target: ${selectedCustomer.name}`,
                    explanation: `Individual manual campaign targeting ${selectedCustomer.name} based on behavioral profile.`
                  });
                  router.push('/campaigns');
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-purple-600/10 flex items-center justify-center gap-1.5 transition duration-200"
              >
                <Send className="w-4 h-4" />
                <span>Target this Shopper Directly</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
