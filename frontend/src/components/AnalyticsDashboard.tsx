'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { ShieldCheck, MessageSquare, AlertCircle, Users2, Sparkles, CheckCircle2, ArrowRightCircle, Image as ImageIcon, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface VariantStats {
  totalMessages: number;
  statusCounts: {
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  rates: {
    deliveryRatePercent: number;
    openRatePercent: number;
    clickRatePercent: number;
    failRatePercent: number;
  };
}

interface CampaignAnalyticItem {
  campaignId: string;
  campaignName: string;
  channel: string;
  totalMessages: number;
  messageTemplate: string | null;
  messageTemplateB: string | null;
  imageUrl: string | null;
  buttons: string | null;
  statusCounts: {
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  rates: {
    deliveryRatePercent: number;
    openRatePercent: number;
    clickRatePercent: number;
    failRatePercent: number;
  };
  variants?: {
    A: VariantStats;
    B: VariantStats;
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
  let totalClicked = 0;
  let totalFailed = 0;

  for (const item of analytics) {
    totalAudience += item.totalMessages;
    totalDelivered += item.statusCounts.delivered + item.statusCounts.opened + item.statusCounts.clicked;
    totalOpened += item.statusCounts.opened + item.statusCounts.clicked;
    totalClicked += item.statusCounts.clicked || 0;
    totalFailed += item.statusCounts.failed;
  }

  const deliveryRate = totalAudience > 0 ? (totalDelivered / totalAudience) * 100 : 0;
  const openRate = totalAudience > 0 ? (totalOpened / totalAudience) * 100 : 0;
  const clickRate = totalAudience > 0 ? (totalClicked / totalAudience) * 100 : 0;
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

  // Find A/B testing campaigns (i.e. campaigns with Variant B messages)
  const abCampaigns = analytics.filter(item => Boolean(item.messageTemplateB) && item.variants && item.variants.B.totalMessages > 0);

  // 3. Format data for Recharts
  const chartData = analytics.map(item => ({
    name: item.campaignName.length > 12 ? item.campaignName.substring(0, 12) + '...' : item.campaignName,
    'Delivery %': item.rates.deliveryRatePercent,
    'Open %': item.rates.openRatePercent,
    'Click %': item.rates.clickRatePercent,
    'Fail %': item.rates.failRatePercent,
  })).reverse();

  // 4. Funnel Area Chart Data
  const funnelData = [
    { name: 'Targeted', count: totalAudience },
    { name: 'Delivered', count: totalDelivered },
    { name: 'Opened', count: totalOpened },
    { name: 'Clicked', count: totalClicked },
  ];

  return (
    <div className="space-y-6">
      {/* Cumulative Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Audience */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Audience Size</span>
            <Users2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{totalAudience.toLocaleString()}</p>
          <span className="text-[9px] text-neutral-500 block font-medium">Accumulated contacts targeted</span>
        </div>

        {/* Card 2: Delivery */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Delivered Rate</span>
            <ShieldCheck className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{deliveryRate.toFixed(1)}%</p>
          <span className="text-[9px] text-green-600 dark:text-green-500 font-semibold block">✔ Successful transmissions</span>
        </div>

        {/* Card 3: Open Rate */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Open Rate</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{openRate.toFixed(1)}%</p>
          <span className="text-[9px] text-neutral-500 block font-medium">Opened or read indicators</span>
        </div>

        {/* Card 4: Click Rate */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Interaction CTR</span>
            <ArrowRightCircle className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold font-mono text-foreground">{clickRate.toFixed(1)}%</p>
          <span className="text-[9px] text-yellow-600 dark:text-yellow-500 font-semibold block">★ Action button responses</span>
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
          
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${activeProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* A/B Split Testing Performance Section */}
      {abCampaigns.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">A/B Testing Engine Breakdown</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {abCampaigns.map((camp) => {
              const varA = camp.variants!.A;
              const varB = camp.variants!.B;
              
              // Determine winner based on CTR (click rate), falling back to open rate
              let winner = 'Variant A';
              let winnerMsg = 'Higher click rate';
              const ctrA = varA.rates.clickRatePercent;
              const ctrB = varB.rates.clickRatePercent;

              if (ctrB > ctrA) {
                winner = 'Variant B';
              } else if (ctrA === ctrB) {
                const openA = varA.rates.openRatePercent;
                const openB = varB.rates.openRatePercent;
                if (openB > openA) {
                  winner = 'Variant B';
                  winnerMsg = 'Higher open rate';
                } else if (openA === openB) {
                  winner = 'Tie';
                  winnerMsg = 'Identical conversion ratios';
                } else {
                  winner = 'Variant A';
                  winnerMsg = 'Higher open rate';
                }
              }

              return (
                <Card key={camp.campaignId} className="border border-border relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    {winner !== 'Tie' ? (
                      <Badge variant="success" className="space-x-1 py-1 px-3">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Winner: {winner} ({winnerMsg})</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="py-1 px-3">Performance Tie</Badge>
                    )}
                  </div>

                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{camp.campaignName}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <span>Channel: {camp.channel}</span>
                      {camp.imageUrl && (
                        <span className="flex items-center space-x-1 text-xs text-blue-500 font-semibold border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-500/5">
                          <ImageIcon className="w-3 h-3" />
                          <span>Rich Media Attached</span>
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Variant A Stats */}
                      <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">Variant A</span>
                          <span className="text-xs text-neutral-500">{varA.totalMessages} sent</span>
                        </div>
                        <div className="text-xs text-neutral-500 truncate italic bg-background/50 p-2 rounded border border-border">
                          "{camp.messageTemplate}"
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Delivery</span>
                            <span className="text-sm font-bold font-mono text-green-600 dark:text-green-400">{varA.rates.deliveryRatePercent}%</span>
                          </div>
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Open</span>
                            <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">{varA.rates.openRatePercent}%</span>
                          </div>
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Click (CTR)</span>
                            <span className="text-sm font-bold font-mono text-yellow-600 dark:text-yellow-400">{varA.rates.clickRatePercent}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Variant B Stats */}
                      <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">Variant B</span>
                          <span className="text-xs text-neutral-500">{varB.totalMessages} sent</span>
                        </div>
                        <div className="text-xs text-neutral-500 truncate italic bg-background/50 p-2 rounded border border-border">
                          "{camp.messageTemplateB}"
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Delivery</span>
                            <span className="text-sm font-bold font-mono text-green-600 dark:text-green-400">{varB.rates.deliveryRatePercent}%</span>
                          </div>
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Open</span>
                            <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">{varB.rates.openRatePercent}%</span>
                          </div>
                          <div className="bg-background/45 p-2 rounded border border-border">
                            <span className="text-[9px] text-neutral-500 block uppercase font-bold">Click (CTR)</span>
                            <span className="text-sm font-bold font-mono text-yellow-600 dark:text-yellow-400">{varB.rates.clickRatePercent}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* A/B Visual Comparison */}
                    <div className="mt-6 p-4 bg-background/50 border border-border rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Conversion Impact (CTR)</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Visualizing the click-through-rate distribution between Variant A and Variant B. 
                          The winning variant is automatically assigned more traffic volume.
                        </p>
                      </div>
                      <div className="w-full md:w-1/2 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Variant A', value: ctrA },
                                { name: 'Variant B', value: ctrB }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={50}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#8b5cf6" />
                              <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip 
                              formatter={(value) => `${value}%`}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                            />
                            <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Funnel Area Chart */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Global Funnel Drop-off
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFunnel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Conversion Analysis */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Campaign Conversion Analysis
          </h3>
          <div className="w-full h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconSize={8} />
                  <Bar dataKey="Delivery %" fill="url(#colorDelivery)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Open %" fill="url(#colorOpen)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Click %" fill="url(#colorClick)" radius={[4, 4, 0, 0]} barSize={12} />
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
    </div>
  );
}
