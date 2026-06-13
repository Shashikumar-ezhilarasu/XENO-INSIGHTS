'use client';

/**
 * @file page.tsx
 * @module app/(app)/nudge
 * @description
 * Customer Nudge Engine page.
 * Implements customer pool filtering, profile drawers, personalization previews,
 * Gemini-drafted batch campaign evaluations, and BullMQ enqueuing with active progress tracking.
 * 
 * JSDOC SECTION: 7
 * Compliant with strict React and TypeScript conventions.
 */

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, CheckSquare, Square, User, Mail, Phone, DollarSign, Award, Send, RefreshCw, Layers, CheckCircle2, ChevronRight, X, AlertCircle, Zap } from 'lucide-react';
import { trackedAiFetch } from '../../../lib/aiLogger';
import { cn } from '../../../utils/cn';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpends: number;
  lastVisitDate: string;
  loyaltyPoints: number;
  favoriteCategory: string;
  preferredCommunication: string;
  mostPurchasedCategory?: string;
  totalOrdersCount?: number;
}

interface DraftNudge {
  customerId: string;
  name: string;
  message: string;
  success: boolean;
  fallback: boolean;
}

/**
 * @function NudgePage
 * @description Customer Nudge Engine page component
 * @returns {React.JSX.Element} Nudge Page element
 */
export default function NudgePage(): React.JSX.Element {
  // Lists and filters state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  
  // Drawer states
  const [selectedProfile, setSelectedProfile] = useState<Customer | null>(null);
  
  // Nudge Composition state
  const [selectedChannel, setSelectedChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP' | 'RCS'>('SMS');
  const [nudgeContext, setNudgeContext] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGeminiKey(localStorage.getItem('xeno_gemini_api_key') || '');
    }
  }, []);
  const [isDrafting, setIsDrafting] = useState(false);
  const [drafts, setDrafts] = useState<DraftNudge[]>([]);
  
  // Dispatch Progress states
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchedJobIds, setDispatchedJobIds] = useState<string[]>([]);
  const [dispatchStatus, setDispatchStatus] = useState<string>('');

  // Brand onboarding categories
  const categories = [
    { key: 'all', label: 'All Brand Targets' },
    { key: 'coffee_cafe', label: 'Coffee & Cafe' },
    { key: 'retail', label: 'Retail' },
    { key: 'food_beverage', label: 'Food & Beverages' },
    { key: 'beauty_cosmetics', label: 'Beauty & Cosmetics' },
    { key: 'fashion_apparel', label: 'Fashion & Apparel' },
    { key: 'jewelry_accessories', label: 'Jewelry & Accessories' }
  ];

  // Load customers from backend
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      // Fetch up to 100 targets
      const res = await fetch(`${backendUrl}/api/customers?limit=100`);
      if (res.ok) {
        const data = await res.json();
        // Backend returns dual formats, read from customers array
        setCustomers(data.customers || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search and category affinity
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    
    const favCat = (c.favoriteCategory || '').toLowerCase();
    
    // Category mapping:
    if (selectedCategory === 'coffee_cafe') return matchesSearch && favCat.includes('coffee');
    if (selectedCategory === 'retail') return matchesSearch && (favCat.includes('retail') || favCat.includes('general') || favCat === '');
    if (selectedCategory === 'food_beverage') return matchesSearch && (favCat.includes('food') || favCat.includes('beverage') || favCat.includes('bakery'));
    if (selectedCategory === 'beauty_cosmetics') return matchesSearch && (favCat.includes('beauty') || favCat.includes('wellness') || favCat.includes('cosmetics'));
    if (selectedCategory === 'fashion_apparel') return matchesSearch && (favCat.includes('fashion') || favCat.includes('apparel'));
    if (selectedCategory === 'jewelry_accessories') return matchesSearch && (favCat.includes('accessories') || favCat.includes('jewelry'));
    
    return matchesSearch;
  });

  // Select/Deselect handlers
  const handleToggleCustomer = (id: string) => {
    if (selectedCustomers.includes(id)) {
      setSelectedCustomers(selectedCustomers.filter(cId => cId !== id));
    } else {
      setSelectedCustomers([...selectedCustomers, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredCustomers.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedCustomers.includes(id));
    if (allSelected) {
      setSelectedCustomers(selectedCustomers.filter(id => !filteredIds.includes(id)));
    } else {
      // Merge unique IDs
      const uniqueMerged = Array.from(new Set([...selectedCustomers, ...filteredIds]));
      setSelectedCustomers(uniqueMerged);
    }
  };

  // Trigger campaign drafting
  const handleGenerateNudges = async () => {
    if (selectedCustomers.length === 0) return;
    setIsDrafting(true);
    setDrafts([]);
    
    const selectedList = customers.filter(c => selectedCustomers.includes(c.id));
    const payload = {
      customers: selectedList,
      channel: selectedChannel,
      category: selectedCategory === 'all' ? 'retail' : selectedCategory,
      nudgeContext: nudgeContext || undefined
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      // Use tracked fetch to log token count in local storage!
      const res = await trackedAiFetch(`${backendUrl}/api/ai/nudge-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      } else {
        alert('Failed to draft nudges. Check backend API key configuration.');
      }
    } catch (err) {
      console.error('Nudge draft error:', err);
      alert('Network error drafting campaign nudges.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Dispatch approved nudges in bulk
  const handleDispatchNudges = async () => {
    if (drafts.length === 0) return;
    setIsDispatching(true);
    setDispatchProgress(5);
    setDispatchStatus('Initializing BullMQ session...');

    const payload = {
      nudges: drafts.map(d => ({
        customerId: d.customerId,
        message: d.message,
        channel: selectedChannel
      }))
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/queue/nudge-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const jobIds: string[] = data.jobIds || [];
        setDispatchedJobIds(jobIds);
        setDispatchProgress(30);
        setDispatchStatus(`Enqueued ${jobIds.length} nudge jobs. Monitoring queue...`);

        // Start polling job status
        if (jobIds.length > 0) {
          monitorQueueProgress(jobIds);
        } else {
          setDispatchProgress(100);
          setDispatchStatus('Dispatch finished.');
          setIsDispatching(false);
        }
      } else {
        setDispatchStatus('Failed to send nudges.');
        setIsDispatching(false);
      }
    } catch (err) {
      console.error('Nudge dispatch error:', err);
      setDispatchStatus('Dispatch network failure.');
      setIsDispatching(false);
    }
  };

  // Poll individual job statuses sequentially to calculate real-time completion percentage
  const monitorQueueProgress = (jobIds: string[]) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const total = jobIds.length;
    let completedCount = 0;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const checks = await Promise.all(
          jobIds.map(id => 
            fetch(`${backendUrl}/api/queue/job/${id}/status`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        const activeChecks = checks.filter(c => c !== null);
        const completedJobs = activeChecks.filter(c => c.state === 'completed' || c.state === 'failed');
        completedCount = completedJobs.length;

        // Calculate progress percentage between 30% and 100%
        const percent = Math.min(30 + Math.floor((completedCount / total) * 70), 100);
        setDispatchProgress(percent);
        setDispatchStatus(`Completed ${completedCount} of ${total} jobs. State: processing...`);

        if (completedCount === total || attempts > 20) {
          clearInterval(interval);
          setDispatchProgress(100);
          setDispatchStatus(`Dispatch complete. All ${total} communications enqueued & processed.`);
          
          // Reset states after 4 seconds
          setTimeout(() => {
            setIsDispatching(false);
            setDrafts([]);
            setSelectedCustomers([]);
          }, 4000);
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
          <Zap className="w-8 h-8 text-neutral-200" />
          Customer Nudge Engine
        </h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Run personalized conversational nudges to target pools of customers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Pool Pane */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-[680px]">
          {/* Filters Bar */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search targets by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-secondary/30 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            
            {/* Category Chips */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition duration-150",
                    selectedCategory === cat.key
                      ? "bg-foreground text-background border-foreground"
                      : "bg-secondary/20 text-neutral-400 border-border hover:text-foreground hover:bg-secondary/40"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selection Actions Header */}
          <div className="px-6 py-2.5 bg-secondary/10 border-b border-border flex justify-between items-center text-xs font-semibold text-neutral-400">
            <button 
              onClick={handleSelectAll}
              className="flex items-center gap-2 hover:text-foreground transition"
            >
              {filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomers.includes(c.id)) ? (
                <CheckSquare className="w-4 h-4 text-foreground" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select Filtered ({filteredCustomers.length})
            </button>
            <span>Selected: {selectedCustomers.length}</span>
          </div>

          {/* Customers Pool Grid List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {isLoadingCustomers ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map(c => {
                const isSelected = selectedCustomers.includes(c.id);
                return (
                  <div 
                    key={c.id} 
                    className={cn(
                      "flex items-center justify-between px-6 py-3.5 hover:bg-secondary/10 transition duration-150 cursor-pointer",
                      isSelected && "bg-secondary/20"
                    )}
                    onClick={() => handleToggleCustomer(c.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 rounded flex items-center justify-center">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-foreground" /> : <Square className="w-4 h-4 text-neutral-500" />}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground text-sm block">{c.name}</span>
                        <span className="text-xs text-neutral-500 block">{c.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-xs font-mono font-medium text-foreground block">${c.totalSpends.toFixed(2)} LTV</span>
                        <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider block">{c.favoriteCategory || 'General'}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfile(c);
                        }}
                        className="p-1 rounded hover:bg-secondary border border-transparent hover:border-border transition"
                      >
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                No matching target customers found
              </div>
            )}
          </div>
        </div>

        {/* Right Configuration Pane */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Nudge Compose Settings */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-foreground text-lg border-b border-border pb-3">Composition Panel</h3>
            
            {/* Channel Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Channel Touchpoint</label>
              <div className="grid grid-cols-4 gap-2">
                {(['SMS', 'EMAIL', 'WHATSAPP', 'RCS'] as const).map(chan => (
                  <button
                    key={chan}
                    onClick={() => setSelectedChannel(chan)}
                    className={cn(
                      "py-2 text-xs font-bold rounded-lg border transition duration-150",
                      selectedChannel === chan
                        ? "bg-foreground text-background border-foreground"
                        : "bg-secondary/10 border-border text-neutral-400 hover:text-foreground"
                    )}
                  >
                    {chan}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Context Brief */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Campaign Prompt/Brief (Optional)</label>
              <textarea
                value={nudgeContext}
                onChange={e => setNudgeContext(e.target.value)}
                placeholder="Brief details: 'Invite them to checkout our summer organic drip coffee drop...'"
                rows={3}
                className="w-full p-3 border border-border rounded-xl bg-secondary/20 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>

            {/* API Key Configure (Local Only) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex justify-between">
                <span>Gemini API Key (Client-side AI)</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Get Key</a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={e => {
                  setGeminiKey(e.target.value);
                  if (typeof window !== 'undefined') localStorage.setItem('xeno_gemini_api_key', e.target.value);
                }}
                placeholder="AIzaSy..."
                className="w-full p-2.5 border border-border rounded-xl bg-secondary/10 text-sm focus:outline-none focus:ring-1 focus:ring-foreground font-mono"
              />
              <p className="text-[10px] text-neutral-500">Enable direct client-side generation using Gemini when backend is unreachable.</p>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleGenerateNudges}
              disabled={selectedCustomers.length === 0 || isDrafting}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background hover:bg-neutral-200 transition py-2.5 rounded-xl font-bold disabled:opacity-50 text-sm"
            >
              {isDrafting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              Generate Personalized Nudges ({selectedCustomers.length})
            </button>
          </div>

          {/* Nudge Drafts and Dispatch Banner */}
          {drafts.length > 0 && (
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 max-h-[350px] overflow-y-auto relative">
              <h3 className="font-bold text-foreground text-lg border-b border-border pb-3 flex justify-between items-center">
                <span>Nudge Campaign Drafts</span>
                <span className="text-xs font-normal text-neutral-400">{drafts.length} targets</span>
              </h3>

              <div className="space-y-3">
                {drafts.map((d, index) => (
                  <div key={d.customerId} className="p-3 border border-border/80 rounded-xl bg-secondary/10 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-neutral-400">
                      <span>{d.name}</span>
                      {d.fallback && <span className="text-amber-500 font-normal text-[10px]">Local Fallback</span>}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">{d.message}</p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border">
                <button
                  onClick={handleDispatchNudges}
                  disabled={isDispatching}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 transition py-2.5 rounded-xl font-bold text-sm"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Bulk Nudges
                </button>
              </div>
            </div>
          )}

          {/* BullMQ Queue Dispatch Progress Banner */}
          {isDispatching && (
            <div className="bg-card border border-emerald-500/20 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                  Queue Dispatch active
                </h4>
                <span className="text-xs font-mono text-emerald-500 font-bold">{dispatchProgress}%</span>
              </div>
              {/* Progress bar background */}
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${dispatchProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 font-medium font-mono">{dispatchStatus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer 360 Slide-over Profile Drawer */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl relative">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-neutral-400" />
                  Customer Profile
                </h3>
                <p className="text-xs text-neutral-500 mt-1">360-degree loyalty and attribute mappings.</p>
              </div>
              <button 
                onClick={() => setSelectedProfile(null)}
                className="p-1 rounded hover:bg-secondary transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Details card */}
              <div className="p-4 border border-border/60 rounded-xl bg-secondary/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">{selectedProfile.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                    {selectedProfile.favoriteCategory || 'General'}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-neutral-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{selectedProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedProfile.phone}</span>
                  </div>
                </div>
              </div>

              {/* CRM Telemetry KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-xl bg-card flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Loyalty Points</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xl font-bold text-foreground">{selectedProfile.loyaltyPoints}</span>
                  </div>
                </div>

                <div className="p-4 border border-border rounded-xl bg-card flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">Lifetime Value</span>
                  <div className="flex items-center gap-1 mt-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-xl font-bold text-foreground">${selectedProfile.totalSpends.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Core attributes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">CDP Attribute Resolution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-border pb-2 text-xs">
                    <span className="text-neutral-500">Last Visited:</span>
                    <span className="text-foreground font-mono">{selectedProfile.lastVisitDate ? new Date(selectedProfile.lastVisitDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2 text-xs">
                    <span className="text-neutral-500">Communication Node:</span>
                    <span className="text-foreground font-bold">{selectedProfile.preferredCommunication}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2 text-xs">
                    <span className="text-neutral-500">Most Purchased:</span>
                    <span className="text-foreground font-semibold">{selectedProfile.mostPurchasedCategory || selectedProfile.favoriteCategory || 'None'}</span>
                  </div>
                  <div className="flex justify-between pb-2 text-xs">
                    <span className="text-neutral-500">Total Orders:</span>
                    <span className="text-foreground font-bold">{selectedProfile.totalOrdersCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
