'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Bot, Database, Zap, Send, Cloud, Server, Activity, BarChart3, AlertCircle, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function SettingsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  // Simulated metrics
  const aiTokens = 1245000;
  const aiTokenLimit = 2000000;
  const aiPercent = (aiTokens / aiTokenLimit) * 100;

  const dbStorage = 4.2;
  const dbLimit = 10;
  const dbPercent = (dbStorage / dbLimit) * 100;

  const redisMemory = 145;
  const redisLimit = 256;
  const redisPercent = (redisMemory / redisLimit) * 100;

  const waSent = 8400;
  const waLimit = 10000;
  const waPercent = (waSent / waLimit) * 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8 text-neutral-400" />
            System Settings & Usage
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Monitor infrastructure health, API consumption, and AI token limits across all integrated XENO services.
          </p>
        </div>
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          className="border-neutral-700 bg-secondary/50 hover:bg-secondary text-foreground"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync Metrics'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Google Gemini AI Usage */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Bot className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-purple-500/20 rounded-lg"><Bot className="w-5 h-5 text-purple-400" /></div>
              Google Gemini Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-neutral-300">Token Consumption (Monthly)</span>
                <span className="text-purple-400 font-mono">{(aiTokens/1000000).toFixed(2)}M / {(aiTokenLimit/1000000).toFixed(1)}M</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden border border-border">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2.5 rounded-full" style={{ width: `${aiPercent}%` }}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Generations</p>
                <p className="text-lg font-mono font-bold text-foreground">1,432</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Avg Latency</p>
                <p className="text-lg font-mono font-bold text-foreground">1.12s</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Est. Cost</p>
                <p className="text-lg font-mono font-bold text-emerald-400">$8.45</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Storage */}
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Database className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-blue-500/20 rounded-lg"><Database className="w-5 h-5 text-blue-400" /></div>
              PostgreSQL (Supabase/Neon)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-neutral-300">Storage Used</span>
                <span className="text-blue-400 font-mono">{dbStorage} GB / {dbLimit} GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden border border-border">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2.5 rounded-full" style={{ width: `${dbPercent}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Queries</p>
                <p className="text-lg font-mono font-bold text-foreground">84.2K</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Active Conns</p>
                <p className="text-lg font-mono font-bold text-foreground">12 / 60</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Health</p>
                <p className="text-sm font-bold text-green-400 flex items-center gap-1 mt-1"><CheckCircle2 className="w-4 h-4"/> Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messaging Queues */}
        <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Activity className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-red-500/20 rounded-lg"><Zap className="w-5 h-5 text-red-400" /></div>
              Queue & Cache (BullMQ + Redis)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-neutral-300">Redis Memory Usage</span>
                <span className="text-red-400 font-mono">{redisMemory} MB / {redisLimit} MB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden border border-border">
                <div className="bg-gradient-to-r from-red-600 to-orange-500 h-2.5 rounded-full" style={{ width: `${redisPercent}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Jobs Processed</p>
                <p className="text-lg font-mono font-bold text-foreground">14,520</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Success Rate</p>
                <p className="text-lg font-mono font-bold text-foreground">99.8%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Workers</p>
                <p className="text-lg font-mono font-bold text-foreground">4 Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Deliveries */}
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Send className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><Send className="w-5 h-5 text-emerald-400" /></div>
              Channel APIs (WhatsApp & SMS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-neutral-300">WhatsApp API Quota</span>
                <span className="text-emerald-400 font-mono">{waSent.toLocaleString()} / {waLimit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden border border-border">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full" style={{ width: `${waPercent}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Total Webhooks</p>
                <p className="text-lg font-mono font-bold text-foreground">42.1K</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">SMS Sent</p>
                <p className="text-lg font-mono font-bold text-foreground">2,100</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Email Sent</p>
                <p className="text-lg font-mono font-bold text-foreground">40.2K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hosting & Infra */}
        <Card className="lg:col-span-2 border-neutral-700/50 bg-gradient-to-br from-neutral-800/20 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-neutral-800 rounded-lg"><Server className="w-5 h-5 text-neutral-300" /></div>
              Hosting & Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4 border-r-0 md:border-r border-border/50 pr-0 md:pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-4 h-4 text-neutral-400" />
                  <span className="font-bold text-foreground">Vercel (Frontend edge)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Bandwidth</span>
                  <span className="font-mono font-bold text-foreground">45 GB / 100 GB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Serverless Functions</span>
                  <span className="font-mono font-bold text-foreground">1.2M Invocations</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Image Optimization</span>
                  <span className="font-mono font-bold text-foreground">340 / 1000</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-neutral-400" />
                  <span className="font-bold text-foreground">Railway (Backend Node)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Compute Time</span>
                  <span className="font-mono font-bold text-foreground">140 Hrs / 500 Hrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Memory Usage</span>
                  <span className="font-mono font-bold text-foreground">128 MB / 512 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Network Egress</span>
                  <span className="font-mono font-bold text-foreground">12 GB / 100 GB</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
