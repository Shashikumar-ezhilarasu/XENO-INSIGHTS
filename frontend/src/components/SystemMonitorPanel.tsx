'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Loader2, Activity, Terminal, Database, Send, CheckCircle, Eye, MousePointerClick, RefreshCw, XCircle } from 'lucide-react';
import { Button } from './ui/button';

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
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isLive, setIsLive] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/queue/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.totals);
      }
    } catch (e) {
      console.error('Failed to fetch queue stats', e);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  useEffect(() => {
    if (!isLive) return;
    
    fetchStats();
    fetchEvents();

    const interval = setInterval(() => {
      fetchStats();
      fetchEvents();
    }, 1500);

    return () => clearInterval(interval);
  }, [isLive]);

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
    ? "flex flex-col h-screen bg-[#0A0A0A] text-gray-100 p-6 overflow-hidden" 
    : "flex flex-col text-gray-100 overflow-hidden rounded-xl border border-border bg-card mt-8 shadow-sm";

  return (
    <div className={containerClass}>
      <div className={`flex justify-between items-center mb-6 shrink-0 ${!fullScreen && 'p-6 pb-0'}`}>
        <div>
          <h1 className={`${fullScreen ? 'text-3xl' : 'text-xl'} font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500`}>
            System Monitor
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

      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0 ${!fullScreen && 'px-6'}`}>
        {[
          { label: 'Waiting', value: stats?.waiting ?? 0, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
          { label: 'Active', value: stats?.active ?? 0, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
          { label: 'Completed', value: stats?.completed ?? 0, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
          { label: 'Delayed', value: stats?.delayed ?? 0, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10' },
          { label: 'Failed', value: stats?.failed ?? 0, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' }
        ].map((metric) => (
          <Card key={metric.label} className={`border ${metric.border} ${metric.bg} bg-opacity-50`}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{metric.label}</span>
              <span className={`text-3xl md:text-4xl font-bold ${metric.color}`}>
                {stats ? metric.value : <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-gray-600" />}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0 ${!fullScreen && 'px-6'}`}>
        {/* Reliability Dashboard */}
        <Card className="border border-emerald-500/20 bg-emerald-500/5 bg-opacity-50 md:col-span-1">
          <CardHeader className="p-4 pb-2 border-b border-emerald-500/10">
            <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
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
              <span>Dead Letter Queue (DLQ):</span>
              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">Active & Routed</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Precedence Visualization */}
        <Card className="border border-purple-500/20 bg-purple-500/5 bg-opacity-50 md:col-span-2">
          <CardHeader className="p-4 pb-2 border-b border-purple-500/10 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-purple-400 flex items-center gap-2 uppercase tracking-wide">
              <Activity className="w-4 h-4" /> Webhook Idempotency (Status Precedence)
            </CardTitle>
            <span className="text-[10px] uppercase font-bold px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30">
              Out-of-order events safely dropped
            </span>
          </CardHeader>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between text-[10px] md:text-xs font-mono font-bold text-gray-400">
              <span className="text-blue-400 flex flex-col items-center">PENDING <span className="text-gray-600 font-normal">0</span></span>
              <span>→</span>
              <span className="text-purple-400 flex flex-col items-center">SENT <span className="text-gray-600 font-normal">1</span></span>
              <span>→</span>
              <span className="text-emerald-400 flex flex-col items-center">DELIVERED <span className="text-gray-600 font-normal">2</span></span>
              <span>→</span>
              <span className="text-amber-400 flex flex-col items-center">OPENED <span className="text-gray-600 font-normal">3</span></span>
              <span>→</span>
              <span className="text-rose-400 flex flex-col items-center">CLICKED <span className="text-gray-600 font-normal">4</span></span>
              <span>→</span>
              <span className="text-green-400 flex flex-col items-center border border-green-500/30 bg-green-500/10 px-2 py-1 rounded">CONVERTED <span className="text-gray-600 font-normal">5</span></span>
            </div>
            <div className="mt-3 text-center text-[10px] text-gray-500">
              Strict monotonically increasing state. Late arrivals of lower state (e.g. DELIVERED after OPENED) are rejected.
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className={`flex-1 border-gray-800 bg-[#121212] overflow-hidden flex flex-col ${!fullScreen && 'mx-6 mb-6 h-96 border rounded-lg'}`}>
        <CardHeader className="border-b border-gray-800 pb-3 shrink-0 bg-gray-900/50">
          <CardTitle className="text-sm font-mono flex items-center gap-2 text-gray-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            CommunicationEvent Audit Log
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Real-time webhook callback ingestion trace (Idempotent)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1 font-mono text-xs">
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
