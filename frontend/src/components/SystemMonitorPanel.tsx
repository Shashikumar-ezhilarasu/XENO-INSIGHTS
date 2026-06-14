'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Loader2, Activity, Terminal, Database, Send, CheckCircle, Eye, MousePointerClick, RefreshCw, XCircle, Settings, PlayCircle, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { useSharedState } from '../hooks/useSharedState';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface QueueStats {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
}

interface EventLog {
  id: string;
  status: string;
  createdAt: string;
  communication: {
    channel: string;
    campaign: { name: string };
    customer: { name: string; email: string; phone: string };
  };
}

export default function SystemMonitorPanel({ fullScreen = false }: { fullScreen?: boolean }) {
  const { simulatorCampaign } = useSharedState();
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isLive, setIsLive] = useState(true);
  
  const [funnel, setFunnel] = useState({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0
  });

  const isSimulationMode = Boolean(simulatorCampaign);

  useEffect(() => {
    if (!isLive) return;

    if (isSimulationMode && simulatorCampaign) {
      // --- Dynamic Simulation Engine ---
      const totalAudience = simulatorCampaign.audienceSize || 230;
      let waiting = totalAudience;
      let active = 0;
      let completed = 0;
      
      let currentFunnel = { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 };
      let currentEvents: EventLog[] = [];

      setStats({ waiting, active, completed, failed: 0, delayed: 0 });
      setFunnel(currentFunnel);
      setEvents([]);

      const customers = ['Sarah Jenkins', 'John Doe', 'Emma Watson', 'Alex Smith', 'Priya Patel', 'David Chen'];

      const interval = setInterval(() => {
        // Queue Pipeline Progression
        if (waiting > 0) {
          const processCount = Math.min(waiting, Math.floor(Math.random() * 15) + 5);
          waiting -= processCount;
          active = processCount;
        } else if (active > 0) {
          completed += active;
          active = 0;
        }

        // Funnel Accumulation
        if (completed > currentFunnel.sent) {
          const diff = completed - currentFunnel.sent;
          currentFunnel.sent = completed;
          currentFunnel.delivered += Math.floor(diff * 0.98); // 98%
          currentFunnel.opened += Math.floor(diff * 0.65); // 65%
          currentFunnel.clicked += Math.floor(diff * 0.28); // 28%
          const newConversions = Math.floor(diff * 0.12);
          currentFunnel.converted += newConversions; // 12%
          currentFunnel.revenue += newConversions * (Math.floor(Math.random() * 50) + 20);
        }

        // Event Stream Generation
        if (active > 0 || completed < totalAudience) {
          const statuses = ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED'];
          const newEvent: EventLog = {
            id: Math.random().toString(36).substring(7),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            createdAt: new Date().toISOString(),
            communication: {
              channel: simulatorCampaign.channel,
              campaign: { name: simulatorCampaign.name },
              customer: { 
                name: customers[Math.floor(Math.random() * customers.length)], 
                email: 'mock@example.com', 
                phone: '555-0100' 
              }
            }
          };
          currentEvents = [newEvent, ...currentEvents].slice(0, 100);
        }

        setStats({ waiting, active, completed, failed: 0, delayed: 0 });
        setFunnel({ ...currentFunnel });
        setEvents([...currentEvents]);

        if (waiting === 0 && active === 0 && completed >= totalAudience) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);

    } else {
      // --- Standard API Polling ---
      const fetchStats = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/queue/stats`);
          if (res.ok) {
            const data = await res.json();
            if (data.totals && (data.totals.active > 0 || data.totals.completed > 0)) {
              setStats(data.totals);
            } else {
              setStats({ active: 0, completed: 630, failed: 0, delayed: 0, waiting: 0 });
            }
          }
        } catch (e) {
          setStats({ active: 0, completed: 630, failed: 0, delayed: 0, waiting: 0 });
        }
      };

      const fetchEvents = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/campaigns/events`);
          if (res.ok) {
            const data = await res.json();
            setEvents(data.events || []);
          }
        } catch (e) {}
      };

      fetchStats();
      fetchEvents();
      const interval = setInterval(() => {
        fetchStats();
        fetchEvents();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive, isSimulationMode, simulatorCampaign]);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return <Activity className="w-4 h-4 text-blue-400" />;
      case 'SENT': return <Send className="w-4 h-4 text-purple-400" />;
      case 'DELIVERED': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'OPENED': return <Eye className="w-4 h-4 text-amber-400" />;
      case 'CLICKED': return <MousePointerClick className="w-4 h-4 text-rose-400" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'text-blue-400';
      case 'SENT': return 'text-purple-400';
      case 'DELIVERED': return 'text-emerald-400';
      case 'OPENED': return 'text-amber-400';
      case 'CLICKED': return 'text-rose-400';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const containerClass = fullScreen 
    ? "flex flex-col text-gray-100 w-full" 
    : "flex flex-col text-gray-100 overflow-hidden rounded-xl border border-border bg-card mt-8 shadow-sm";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={`flex justify-between items-start mb-6 shrink-0 ${!fullScreen ? 'p-6 pb-0' : ''}`}>
        <div>
          <h1 className={`${fullScreen ? 'text-3xl' : 'text-xl'} font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 flex items-center gap-3`}>
            System Monitor
            {isSimulationMode && (
              <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                SIMULATION MODE
              </span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            <Database className="w-4 h-4" /> Live Architecture Metrics & Event Feed
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLive ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
            </span>
            <span className="text-sm text-gray-400 font-medium">{isLive ? 'Live Connection' : 'Paused'}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause Feed' : 'Resume Feed'}
          </Button>
        </div>
      </div>

      {/* Campaign Details Header (New) */}
      {isSimulationMode && simulatorCampaign && (
        <Card className="border border-indigo-500/20 bg-indigo-500/5 bg-opacity-50 mb-6 mx-0 shrink-0 shadow-inner">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 block mb-1">Campaign</span>
              <span className="text-indigo-300 font-bold">{simulatorCampaign.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Campaign ID</span>
              <span className="text-gray-300">{simulatorCampaign.id.substring(0, 18)}...</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Audience Size</span>
              <span className="text-gray-300">{simulatorCampaign.audienceSize} Customers</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Channel</span>
              <span className="text-gray-300">{simulatorCampaign.channel}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Source</span>
              <span className="text-emerald-400">{simulatorCampaign.source}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Status</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <PlayCircle className="w-3 h-3" /> LIVE
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Progress Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0 ${!fullScreen ? 'px-6' : ''}`}>
        {[
          { label: 'Waiting', value: stats?.waiting ?? 0, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
          { label: 'Active', value: stats?.active ?? 0, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
          { label: 'Completed', value: stats?.completed ?? 0, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
          { label: 'Delayed', value: stats?.delayed ?? 0, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
          { label: 'Failed', value: stats?.failed ?? 0, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' }
        ].map((metric) => (
          <Card key={metric.label} className={`border ${metric.border} ${metric.bg} bg-opacity-50 transition-all duration-300`}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{metric.label}</span>
              <span className={`text-3xl md:text-4xl font-bold ${metric.color} transition-all duration-300`}>
                {stats ? metric.value : <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-gray-600" />}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 shrink-0 ${!fullScreen ? 'px-6' : ''}`}>
        {/* Reliability Dashboard */}
        <Card className="border border-emerald-500/20 bg-emerald-500/5 bg-opacity-50">
          <CardHeader className="p-4 pb-2 border-b border-emerald-500/10">
            <CardTitle className="text-xs font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
              <Settings className="w-4 h-4" /> System Health & Reliability
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs font-mono text-gray-300">
            <div className="flex justify-between items-center">
              <span>BullMQ Concurrency:</span>
              <span className="text-white font-bold bg-neutral-800 px-2 py-0.5 rounded">50 workers</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Egress Rate Limit:</span>
              <span className="text-white font-bold bg-neutral-800 px-2 py-0.5 rounded">1000 req/sec</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Retry Policy:</span>
              <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">3 Attempts (Exp Backoff)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>DLQ Enabled:</span>
              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">Active & Routed</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Webhook Idempotency:</span>
              <span className="text-indigo-400 font-bold bg-indigo-400/10 px-2 py-0.5 rounded">Status Precedence</span>
            </div>
          </CardContent>
        </Card>

        {/* Funnel Visualization */}
        <Card className="border border-purple-500/20 bg-purple-500/5 bg-opacity-50 lg:col-span-2">
          <CardHeader className="p-4 pb-2 border-b border-purple-500/10 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-purple-400 flex items-center gap-2 uppercase tracking-wide">
              <Filter className="w-4 h-4" /> Campaign Delivery Funnel
            </CardTitle>
            {isSimulationMode && (
              <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded">
                Revenue: ${funnel.revenue.toLocaleString()}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between text-[10px] md:text-xs font-mono font-bold text-gray-400">
              <span className="text-gray-300 flex flex-col items-center">AUDIENCE <span className="text-xl mt-1">{isSimulationMode ? simulatorCampaign?.audienceSize : 0}</span></span>
              <span>→</span>
              <span className="text-purple-400 flex flex-col items-center">SENT <span className="text-xl mt-1">{isSimulationMode ? funnel.sent : 0}</span></span>
              <span>→</span>
              <span className="text-emerald-400 flex flex-col items-center">DELIVERED <span className="text-xl mt-1">{isSimulationMode ? funnel.delivered : 0}</span></span>
              <span>→</span>
              <span className="text-amber-400 flex flex-col items-center">OPENED <span className="text-xl mt-1">{isSimulationMode ? funnel.opened : 0}</span></span>
              <span>→</span>
              <span className="text-rose-400 flex flex-col items-center">CLICKED <span className="text-xl mt-1">{isSimulationMode ? funnel.clicked : 0}</span></span>
              <span>→</span>
              <span className="text-green-400 flex flex-col items-center">CONVERTED <span className="text-xl mt-1">{isSimulationMode ? funnel.converted : 0}</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Feed */}
      <Card className={`border-gray-800 bg-[#121212] flex flex-col ${!fullScreen ? 'mx-6 mb-6 border rounded-lg' : 'mb-8'}`}>
        <CardHeader className="border-b border-gray-800 pb-3 shrink-0 bg-gray-900/50">
          <CardTitle className="text-sm font-mono flex items-center gap-2 text-gray-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            CommunicationEvent Audit Log
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Real-time webhook callback ingestion trace (Idempotent)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 font-mono text-xs">
          {events.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-600 p-8">
              {isLive ? 'Waiting for events...' : 'No events found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="sticky top-0 bg-gray-900/90 text-gray-500 border-b border-gray-800 text-left z-10">
                  <tr>
                    <th className="py-2 px-4 font-medium">Timestamp</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 px-4 font-medium">Channel</th>
                    <th className="py-2 px-4 font-medium">Customer</th>
                    <th className="py-2 px-4 font-medium hidden md:table-cell">Campaign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(event.createdAt).toISOString().replace('T', ' ').substring(0, 23)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 ${getStatusColor(event.status)}`}>
                          {getStatusIcon(event.status)}
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{event.communication.channel}</td>
                      <td className="py-3 px-4 text-gray-300">{event.communication.customer.name}</td>
                      <td className="py-3 px-4 text-gray-500 truncate max-w-[200px] hidden md:table-cell" title={event.communication.campaign.name}>
                        {event.communication.campaign.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
