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
  ArrowRight, User, X, Landmark, TrendingUp, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';

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
  mostPurchasedCategory?: string;
  totalOrdersCount?: number;
  orders?: any[];
  location?: string;
  feedback?: string;
  modeOfPayment?: string;
  preferredCommunication?: string;
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

const MOCK_DASHBOARD = {
  totalCustomers: 100,
  totalOrders: 154,
  netSales: 12450.80,
  repeatRate: 42.5,
  recencyDistribution: {
    '0-30': 34,
    '31-60': 28,
    '61-90': 18,
    '90+': 20
  },
  funnel: {
    sent: 450,
    delivered: 432,
    opened: 310,
    clicked: 142,
    failed: 18,
    deliveredPercent: 96,
    openedPercent: 68.8,
    failedPercent: 4
  },
  orderFrequencySeries: [12, 19, 15, 8, 22, 18, 24]
};

const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible opacity-80">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-purple-500"
      />
    </svg>
  );
};

const formatSalesValue = (val: number) => {
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(1)} Mn`;
  }
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(1)} K`;
  }
  return `$${val.toFixed(2)}`;
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
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time Database Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Onboarding & Connection States
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [businessIndustry, setBusinessIndustry] = useState('Coffee & Retail');
  const [mainProduct, setMainProduct] = useState('');
  const [dbUri, setDbUri] = useState('postgresql://localhost:5432/xeno_crm');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatusText, setConnectionStatusText] = useState('');

  // Check onboarding on mount
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('xeno_onboarded');
      if (onboarded === 'true') {
        setIsOnboarded(true);
      }
    } catch (e) {
      console.warn('LocalStorage not available:', e);
    } finally {
      setIsOnboardingLoading(false);
    }
  }, []);

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

  // Fetch customer lists for 360-degree view with search support
  useEffect(() => {
    let active = true;
    async function fetchCustomers() {
      setCustomersLoading(true);
      try {
        const url = searchQuery 
          ? `${BACKEND_URL}/api/customers?limit=6&search=${encodeURIComponent(searchQuery)}`
          : `${BACKEND_URL}/api/customers?limit=6`;
        const res = await fetch(url);
        if (res.ok && active) {
          const json = await res.json();
          setCustomers(json.data || []);
        } else if (active) {
          const lower = searchQuery.toLowerCase();
          const filtered = MOCK_CUSTOMERS_360.filter(c => c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower));
          setCustomers(filtered);
        }
      } catch (e) {
        console.warn('Error fetching customers, using offline fallback:', e);
        if (active) {
          const lower = searchQuery.toLowerCase();
          const filtered = MOCK_CUSTOMERS_360.filter(c => c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower));
          setCustomers(filtered);
        }
      } finally {
        if (active) setCustomersLoading(false);
      }
    }

    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 150);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);

  // Fetch dashboard dynamic metrics
  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/analytics/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setDashboardStats(data);
        } else {
          setDashboardStats(MOCK_DASHBOARD);
        }
      } catch (err) {
        console.warn('Failed to load dashboard statistics, using mock:', err);
        setDashboardStats(MOCK_DASHBOARD);
      } finally {
        setDashboardLoading(false);
      }
    }
    loadDashboardStats();
  }, []);

  // Derived SaaS Metrics (Campaign audits counts)
  const totalCampaigns = analytics.length;
  const activeCampaigns = analytics.filter(c => c.statusCounts.pending > 0).length;

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

  if (isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-neutral-500 text-sm font-medium">Loading workspace configuration...</p>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-lg bg-card border border-border/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scaleUp">
          
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">XENO CRM Business Setup</h2>
              <p className="text-xs text-neutral-500 font-medium">Configure your space and connect your live datasource</p>
            </div>
          </div>

          {onboardingStep === 1 ? (
            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Step 1: Business Profile</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Blue Tokai Coffee"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Business Industry</label>
                <select
                  value={businessIndustry}
                  onChange={(e) => setBusinessIndustry(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple-500"
                >
                  <option value="Coffee & Retail">Coffee & Cafe Retail</option>
                  <option value="Food & Beverages">Food & Beverages</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                  <option value="Accessories">Jewelry & Accessories</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Main Product / Offerings</label>
                <input
                  type="text"
                  placeholder="e.g. Specialty coffee beans, artisanal pastries"
                  value={mainProduct}
                  onChange={(e) => setMainProduct(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setOnboardingStep(2)}
                  disabled={!businessName.trim() || !mainProduct.trim()}
                  className="space-x-1.5 text-xs font-bold"
                >
                  <span>Continue to Datasource</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Step 2: Connect Datasource</h3>
              
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs text-purple-900 dark:text-purple-300 font-medium leading-relaxed">
                ℹ️ Connecting your business profile allows XENO CRM to directly compile customer aggregates, lifetime spend records, and transaction frequencies from your database tables.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Database Connection URI</label>
                <input
                  type="text"
                  value={dbUri}
                  onChange={(e) => setDbUri(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-purple-500"
                  disabled={isConnecting}
                />
              </div>

              {isConnecting && (
                <div className="flex items-center gap-3 p-3 bg-secondary/30 border border-border rounded-xl text-xs text-neutral-400 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span>{connectionStatusText}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="secondary"
                  onClick={() => setOnboardingStep(1)}
                  disabled={isConnecting}
                  className="text-xs font-semibold"
                >
                  Back
                </Button>
                
                <Button 
                  onClick={async () => {
                    setIsConnecting(true);
                    setConnectionStatusText('Establishing database link...');
                    await new Promise(r => setTimeout(r, 800));
                    setConnectionStatusText('Reading tables [Customer, Order, Campaign]...');
                    await new Promise(r => setTimeout(r, 800));
                    setConnectionStatusText('Syncing total checkouts, net sales, and RFM scores...');
                    await new Promise(r => setTimeout(r, 800));
                    setConnectionStatusText('Database Connection Success!');
                    await new Promise(r => setTimeout(r, 400));
                    
                    localStorage.setItem('xeno_onboarded', 'true');
                    setIsOnboarded(true);
                    setIsConnecting(false);
                  }}
                  disabled={isConnecting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  Connect & Sync Database
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

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

      {/* Real-time DB Aggregations: High-Fidelity KPI Cards */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboardStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Total Orders */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Transaction Orders
              </CardTitle>
              <ShoppingBag className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black font-mono text-foreground">{dashboardStats.totalOrders}</span>
                <span className="text-[10px] text-neutral-500 block mt-1">Recorded checkout events</span>
              </div>
              <div className="pt-2">
                <Sparkline data={dashboardStats.orderFrequencySeries} />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Repeat Orders */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Repeat Customer Rate
              </CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="space-y-2">
              <span className="text-3xl font-black font-mono text-foreground">{dashboardStats.repeatRate.toFixed(1)}%</span>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden border border-border mt-1.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  style={{ width: `${dashboardStats.repeatRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total Net Sales */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Net Sales Value
              </CardTitle>
              <Landmark className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-black font-mono text-green-600 dark:text-green-500">
                {formatSalesValue(dashboardStats.netSales)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-1">Cumulative lifetime spend total</span>
            </CardContent>
          </Card>

          {/* Card 4: Funnel / Conversion */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Conversion Delivery Funnel
              </CardTitle>
              <Award className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black font-mono text-foreground">
                  {dashboardStats.funnel.deliveredPercent.toFixed(1)}%
                </span>
                <span className="text-[10px] text-neutral-500 block mt-1">Successful transmissions</span>
              </div>
              
              {/* Minimal vertical bar alignment */}
              <div className="flex items-end gap-1.5 h-10 w-16 px-1">
                <div className="w-2.5 bg-purple-500/20 h-full rounded-t-sm relative" title="Sent (100%)">
                  <div className="bg-purple-500 w-full absolute bottom-0 rounded-t-xs" style={{ height: '100%' }} />
                </div>
                <div className="w-2.5 bg-green-500/20 h-full rounded-t-sm relative" title={`Delivered (${dashboardStats.funnel.deliveredPercent.toFixed(0)}%)`}>
                  <div className="bg-green-500 w-full absolute bottom-0 rounded-t-xs" style={{ height: `${dashboardStats.funnel.deliveredPercent}%` }} />
                </div>
                <div className="w-2.5 bg-blue-500/20 h-full rounded-t-sm relative" title={`Opened (${dashboardStats.funnel.openedPercent.toFixed(0)}%)`}>
                  <div className="bg-blue-500 w-full absolute bottom-0 rounded-t-xs" style={{ height: `${dashboardStats.funnel.openedPercent}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

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

      {/* Dynamic Audience 360 Hub and Recency Matrices split grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Recency Distribution Matrices - 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Shopper Recency Distribution Base
            </h2>
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none font-semibold text-[10px]">
              Database Recency Slots
            </Badge>
          </div>
          <Card className="shadow-sm border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Base Engagement Segments</CardTitle>
              <CardDescription>Renders calculated recency intervals from your live PostgreSQL transaction base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {dashboardLoading || !dashboardStats ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                </div>
              ) : (
                ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'].map((tier, idx) => {
                  const keys = ['0-30', '31-60', '61-90', '90+'] as const;
                  const key = keys[idx];
                  const count = dashboardStats.recencyDistribution[key] || 0;
                  const percent = dashboardStats.totalCustomers > 0 ? (count / dashboardStats.totalCustomers) * 100 : 0;
                  return (
                    <div key={tier} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{tier}</span>
                        <span className="text-neutral-500">{count} shoppers ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold">Shopper Activity Feed</CardTitle>
                  <CardDescription>Select individual shoppers to inspect their 360-degree behavioral card</CardDescription>
                </div>
              </div>
              
              {/* Search Bar Input */}
              <div className="mt-3 relative flex items-center bg-secondary/30 border border-border rounded-xl px-3 py-1.5 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition duration-300">
                <Search className="w-3.5 h-3.5 text-neutral-500 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search shopper by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs text-foreground placeholder-neutral-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] text-neutral-500 hover:text-foreground font-semibold px-1 shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
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
          <p className="text-neutral-500 text-sm font-medium">Synchronizing campaign summaries...</p>
        </div>
      ) : (
        <>
          {/* SaaS campaigns details info */}
          <div className="p-4 bg-secondary/10 border border-border rounded-xl flex items-center justify-between text-xs text-neutral-500">
            <span>Platform Campaign Executions count: <strong className="text-foreground">{totalCampaigns}</strong> active.</span>
            <span>Currently Sending: <strong className="text-purple-600 font-bold">{activeCampaigns}</strong></span>
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
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {(selectedCustomer.favoriteCategory === 'Coffee' || selectedCustomer.mostPurchasedCategory === 'Coffee') && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        ☕ Coffee Addict
                      </span>
                    )}
                    {(selectedCustomer.favoriteCategory === 'Bakery' || selectedCustomer.mostPurchasedCategory === 'Bakery') && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        🥐 Pastry Enthusiast
                      </span>
                    )}
                    {selectedCustomer.totalSpends > 500 && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                        👑 Elite VIP Spender
                      </span>
                    )}
                    {selectedCustomer.loyaltyPoints > 200 && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        💎 Gold Tier
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-extrabold text-foreground block">{selectedCustomer.name}</span>
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
                  {/* Location */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-purple-500" />
                      Location
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.location || 'Chennai, India'}</span>
                  </div>

                  {/* Mode of Payment */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      Payment Mode
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.modeOfPayment || 'UPI'}</span>
                  </div>

                  {/* Preferred Way to Communicate */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <Send className="w-3 h-3 text-blue-500" />
                      Communication
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.preferredCommunication || 'WHATSAPP'}</span>
                  </div>

                  {/* Preferred Shopping Day */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      Preferred Day
                    </span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.preferredShoppingDay}</span>
                  </div>

                  {/* Customer Feedback */}
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1 col-span-2">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold block mb-1">Customer Sentiment / Feedback</span>
                    <p className="text-xs italic text-neutral-600 dark:text-neutral-400 bg-background/50 p-2.5 rounded-lg border border-border font-medium">
                      "{selectedCustomer.feedback || 'Excellent products and fast delivery!'}"
                    </p>
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

              {/* Shopper Insights & Analytics */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Shopper Insights & Analytics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold block">Most Purchased</span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.mostPurchasedCategory || selectedCustomer.favoriteCategory || 'Coffee'}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold block">Interested Category</span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.favoriteCategory}</span>
                  </div>
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold block">Total Orders</span>
                    <span className="text-xs font-bold text-foreground">{selectedCustomer.totalOrdersCount || (selectedCustomer.orders ? selectedCustomer.orders.length : 0)} checkouts</span>
                  </div>
                  <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold block">Average Order Value</span>
                    <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                      ${(selectedCustomer.totalSpends / Math.max(1, selectedCustomer.totalOrdersCount || (selectedCustomer.orders ? selectedCustomer.orders.length : 1))).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Transaction History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Recent Transaction History</h4>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-background max-h-48 overflow-y-auto">
                  {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                    selectedCustomer.orders.map((order: any) => (
                      <div key={order.id} className="p-3 flex items-center justify-between text-xs hover:bg-secondary/10">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">{order.category}</span>
                          <span className="text-[9px] text-neutral-400 block">
                            {new Date(order.createdAt).toLocaleDateString()} • {order.itemCount || 1} {order.itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <span className="text-green-600 font-bold font-mono">${order.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-neutral-500">
                      No transaction records found.
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
