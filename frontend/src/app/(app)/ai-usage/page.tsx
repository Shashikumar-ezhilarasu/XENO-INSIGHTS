'use client';

/**
 * @file page.tsx
 * @module app/(app)/ai-usage
 * @description
 * AI Marketplace and Usage dashboard.
 * Provides live metrics (total calls, tokens, latency, cost),
 * a dynamic SVG sparkline of token consumption, a registry of AI capabilities,
 * and a searchable data grid of local storage logs with CSV exporting capabilities.
 * 
 * JSDOC SECTION: 7
 * Follows strict parameter and component annotations.
 */

import React, { useState, useEffect } from 'react';
import { Bot, Cpu, Activity, ShieldCheck, Database, FileText, Trash2, Download, RefreshCw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { AiLogRecord } from '../../../lib/aiLogger';
import { cn } from '../../../utils/cn';
import { useTenant } from '../../../lib/authContext';

interface SparklinePoint {
  x: number;
  y: number;
}

/**
 * @function AiUsagePage
 * @description AI Marketplace dashboard page component
 * @returns {React.JSX.Element} AI Usage Page element
 */
export default function AiUsagePage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'registry' | 'logs'>('overview');
  
  const { tenant, token } = useTenant();
  
  // Local telemetry states
  const [logs, setLogs] = useState<AiLogRecord[]>([]);
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [tokenLog, setTokenLog] = useState<{ timestamp: string; tokens: number }[]>([]);
  const [healthStatus, setHealthStatus] = useState<{ status: string; latencyMs: number; model: string } | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load telemetry from browser local storage
  const loadTelemetry = () => {
    if (typeof window === 'undefined') return;
    try {
      const rawLogs = localStorage.getItem('xeno_ai_logs');
      const loadedLogs: AiLogRecord[] = rawLogs ? JSON.parse(rawLogs) : [];
      setLogs(loadedLogs);

      const loadedCalls = parseInt(localStorage.getItem('xeno_ai_call_count') || '0', 10);
      setTotalCalls(loadedCalls);

      const loadedTokens = parseInt(localStorage.getItem('xeno_token_total') || '0', 10);
      setTotalTokens(loadedTokens);

      const rawTokenLog = localStorage.getItem('xeno_token_log');
      const loadedTokenLog = rawTokenLog ? JSON.parse(rawTokenLog) : [];
      setTokenLog(loadedTokenLog);
    } catch (e) {
      console.error('Failed to load local storage telemetry:', e);
    }
  };

  // Poll Gemini backend health
  const checkHealth = async () => {
    setIsHealthLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/ai/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          status: data.status,
          latencyMs: data.latencyMs,
          model: data.model
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setHealthStatus({
          status: data.status || 'UNHEALTHY',
          latencyMs: data.latencyMs || 0,
          model: data.model || 'gemini-2.5-flash'
        });
      }
    } catch (err: any) {
      setHealthStatus({
        status: 'UNAVAILABLE',
        latencyMs: 0,
        model: 'gemini-2.5-flash'
      });
    } finally {
      setIsHealthLoading(false);
    }
  };

  const loadDbLogs = async () => {
    if (!token) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/tenant/ai-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbLogs(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load DB logs', e);
    }
  };

  useEffect(() => {
    loadTelemetry();
    checkHealth();
    loadDbLogs();
  }, [token]);

  // Clear logs action
  const handleClearLogs = () => {
    if (typeof window === 'undefined') return;
    if (confirm('Are you sure you want to clear your local AI activity logs?')) {
      localStorage.removeItem('xeno_ai_logs');
      localStorage.removeItem('xeno_ai_call_count');
      localStorage.removeItem('xeno_token_total');
      localStorage.removeItem('xeno_token_log');
      setLogs([]);
      setTotalCalls(0);
      setTotalTokens(0);
      setTokenLog([]);
    }
  };

  // Export CSV action
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = 'ID,Timestamp,Endpoint,Status,Latency (ms),Tokens Used\n';
    const csvContent = logs.map(l => 
      `"${l.id}","${l.timestamp}","${l.endpoint}",${l.status},${l.latencyMs},${l.tokensUsed}`
    ).join('\n');
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `xeno_ai_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated properties
  const estimatedCost = (totalTokens / 1000000) * 0.075; // pricing model proxy: $0.075 per million tokens

  // Render dynamic SVG sparkline of tokens used
  const renderSparkline = () => {
    if (tokenLog.length < 2) {
      return (
        <div className="h-full flex items-center justify-center text-neutral-500 text-sm font-medium">
          Generate more AI actions to construct token charts
        </div>
      );
    }

    const width = 500;
    const height = 140;
    const padding = 20;

    // Get limits
    const maxTokens = Math.max(...tokenLog.map(d => d.tokens), 1);
    const points: SparklinePoint[] = tokenLog.map((d, index) => {
      const x = padding + (index / (tokenLog.length - 1)) * (width - 2 * padding);
      const y = height - padding - (d.tokens / maxTokens) * (height - 2 * padding);
      return { x, y };
    });

    const pathData = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
          <defs>
            <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
          
          {/* Chart area and path */}
          <path d={areaData} fill="url(#sparklineGrad)" />
          <path d={pathData} fill="none" stroke="rgb(245, 158, 11)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Endpoint markers */}
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="3" fill="rgb(245, 158, 11)" stroke="var(--card)" strokeWidth="1" />
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-neutral-500 px-2 mt-1">
          <span>{new Date(tokenLog[0].timestamp).toLocaleTimeString()}</span>
          <span>Max: {maxTokens} tokens/call</span>
          <span>{new Date(tokenLog[tokenLog.length - 1].timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    );
  };

  const filteredLogs = logs.filter(log => 
    log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(log.status).includes(searchQuery)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
            <Bot className="w-8 h-8 text-neutral-200" />
            AI Marketplace & Usage Monitor
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Configure system capabilities, verify Gemini API latency, and monitor token budget allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={checkHealth}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-card hover:bg-secondary/40 text-sm font-semibold transition"
          >
            <RefreshCw className={cn("w-4 h-4", isHealthLoading && "animate-spin")} />
            Ping AI Health
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        {(['overview', 'registry', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-semibold border-b-2 -mb-[2px] capitalize transition duration-200",
              activeTab === tab 
                ? "border-foreground text-foreground" 
                : "border-transparent text-neutral-500 hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Metric Card 1 */}
              <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Total AI Calls</span>
                    <span className="text-3xl font-bold text-foreground mt-2 block">{totalCalls}</span>
                  </div>
                  <Cpu className="w-8 h-8 text-neutral-600" />
                </div>
                <div className="mt-4 text-[10px] text-neutral-500 font-medium">Accumulated from browser local storage session</div>
              </div>

              {/* Metric Card 2 */}
              <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Estimated Cost</span>
                    <span className="text-3xl font-bold text-emerald-500 mt-2 block">${estimatedCost.toFixed(5)}</span>
                  </div>
                  <Database className="w-8 h-8 text-emerald-600/60" />
                </div>
                <div className="mt-4 text-[10px] text-neutral-500 font-medium">Based on local model pricing matrices</div>
              </div>

              {/* Metric Card 3 */}
              <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Accumulated Token Volume</span>
                    <span className="text-3xl font-bold text-foreground mt-2 block">{totalTokens.toLocaleString()} tokens</span>
                  </div>
                  <Activity className="w-8 h-8 text-amber-500/60" />
                </div>
                {renderSparkline()}
              </div>
            </div>
          </div>

          {/* Gemini Health Card */}
          <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Gemini Connection Health</h3>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                  healthStatus?.status === 'HEALTHY' ? 'bg-green-500/10 text-green-500' :
                  healthStatus?.status === 'UNAVAILABLE' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                )}>
                  {healthStatus?.status === 'HEALTHY' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {healthStatus?.status || 'UNKNOWN'}
                </span>
              </div>

              <div className="py-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Active model:</span>
                  <span className="font-mono text-foreground font-medium">{healthStatus?.model || 'gemini-2.5-flash'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Response Latency:</span>
                  <span className="font-mono text-foreground font-medium">{healthStatus?.latencyMs ? `${healthStatus.latencyMs}ms` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Core Provider:</span>
                  <span className="text-foreground font-medium">Google Generative AI</span>
                </div>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-xl p-4 border border-border/60 text-xs text-neutral-500 leading-relaxed">
              <span className="font-bold text-neutral-400 block mb-1">PRO-TIP:</span>
              When the Gemini API key is missing or encounters limitations, the system automatically falls back to secure, pre-seeded local simulation presets so campaign workflows never halt.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'registry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tool Card 1 */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Database className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Segment Query Parser</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Translates natural language segmentation briefs (e.g. "spent over $100 on coffee") into optimized Prisma findMany arguments and read-only PostgreSQL queries.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Class: QueryValidator</span>
              <span>Model: gemini-2.5-flash</span>
            </div>
          </div>

          {/* Tool Card 2 */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Bot className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Campaign Orchestrator</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Evaluates marketer campaign intent, targets optimal segments, generates localized copywriting variants, selects channels, and suggests A/B splits.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Class: WorkspaceAgent</span>
              <span>Model: gemini-2.5-flash</span>
            </div>
          </div>

          {/* Tool Card 3 */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Customer Nudge Engine</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Generates personalized retention messages for customers based on their favorite category and spend profiles, enqueuing them via BullMQ.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Class: NudgeWorker</span>
              <span>Model: gemini-2.5-flash</span>
            </div>
          </div>

          {/* WhatsApp MCP Server */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#25D366' }}>
                <span className="font-bold text-lg">W</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Live</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">WhatsApp MCP Server</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Standalone MCP server simulating WhatsApp Business API delivery. Exposes send_whatsapp_message, get_delivery_status, and get_channel_health tools. Fires async delivery callbacks (sent→delivered→opened→clicked) to the CRM receipt endpoint.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Provider: MCP (Streamable HTTP)</span>
            </div>
          </div>

          {/* SMS MCP Server */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#6366F1' }}>
                <span className="font-bold text-lg">S</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Live</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">SMS MCP Server</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Standalone MCP server simulating an SMS gateway. Validates message length, warns on multi-part SMS, and fires delivery callbacks. Deployed as an independent Railway service.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Provider: MCP (Streamable HTTP)</span>
            </div>
          </div>

          {/* Email + RCS MCP Server */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: '#0EA5E9' }}>
                <span className="font-bold text-lg">E</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">Live</span>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Email + RCS MCP Server</h3>
              <p className="text-neutral-500 text-xs mt-1 leading-relaxed">
                Unified MCP server handling both Email and RCS channels. Email tool accepts subject lines; RCS tool supports rich media metadata. Separate delivery probability profiles per channel.
              </p>
            </div>
            <div className="pt-2 border-t border-border flex justify-between text-[10px] text-neutral-500">
              <span>Provider: MCP (Streamable HTTP)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Log Table Toolbar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:max-w-xs relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs (e.g. POST, 200, ID)..."
                className="w-full px-4 py-2 border border-border rounded-lg bg-secondary/30 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold disabled:opacity-50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button 
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 text-xs font-semibold disabled:opacity-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Local Logs
              </button>
            </div>
          </div>

          {/* Logs Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/10 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Log ID</th>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Endpoint</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Latency</th>
                  <th className="py-3.5 px-6 text-right">Tokens Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-neutral-300">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-secondary/10 transition duration-150">
                      <td className="py-4 px-6 font-mono text-xs text-neutral-400">{log.id.slice(0, 8)}...</td>
                      <td className="py-4 px-6 text-xs text-neutral-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-4 px-6 font-medium text-foreground">{log.endpoint}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          log.status === 200 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-neutral-400">{log.latencyMs}ms</td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-foreground">{log.tokensUsed.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500 text-sm">
                      No local logs found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-y border-border flex justify-between items-center bg-secondary/10">
            <h3 className="font-bold text-foreground">Historical DB Logs (Tenant Data)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/10 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Endpoint</th>
                  <th className="py-3.5 px-6">Prompt Snippet</th>
                  <th className="py-3.5 px-6 text-right">Tokens Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-neutral-300">
                {dbLogs.length > 0 ? (
                  dbLogs.map(log => (
                    <tr key={log.id} className="hover:bg-secondary/10 transition duration-150">
                      <td className="py-4 px-6 font-mono text-xs text-neutral-400">{log.id.slice(0, 8)}</td>
                      <td className="py-4 px-6 text-xs text-neutral-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-6 font-medium text-foreground">{log.endpoint}</td>
                      <td className="py-4 px-6 text-xs text-neutral-500 truncate max-w-[200px]">{log.promptExcerpt || '-'}</td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-foreground">{log.tokensOut}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                      No historical logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
