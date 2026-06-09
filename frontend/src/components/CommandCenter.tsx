'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Users, Send, CheckCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpends: number;
}

interface CommandCenterProps {
  backendUrl: string;
  onCampaignLaunched: (campaignId: string) => void;
}

export default function CommandCenter({ backendUrl, onCampaignLaunched }: CommandCenterProps) {
  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Segment parsing state
  const [segmentData, setSegmentData] = useState<{
    audienceSize: number;
    customers: Customer[];
    explanation: string;
    generatedQuery: string;
  } | null>(null);

  // Campaign drafting state
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState('WHATSAPP');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState(false);

  // 1. Submit prompt to AI Segment parser
  const handleParsePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setError(null);
    setSegmentData(null);
    setLaunchSuccess(false);

    try {
      const response = await fetch(`${backendUrl}/api/ai/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse prompt.');
      }

      setSegmentData({
        audienceSize: data.audienceSize,
        customers: data.customers || [],
        explanation: data.explanation || '',
        generatedQuery: data.generatedQuery || '',
      });

      // Populate default campaign details based on segment
      setCampaignName(`Campaign for: ${prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}`);
      setMessageTemplate(`Hey {{name}}! Exclusive offer based on your shopping profile. Use code BrandNEW for 15% off!`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during query generation.');
    } finally {
      setIsParsing(false);
    }
  };

  // 2. Launch campaign
  const handleLaunchCampaign = async () => {
    if (!segmentData || !campaignName.trim() || !messageTemplate.trim()) return;

    setIsLaunching(true);
    setError(null);

    try {
      // Step A: Create campaign metadata
      const createResponse = await fetch(`${backendUrl}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          promptText: prompt,
          channel: channel,
          messageTemplate: messageTemplate,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to save campaign metadata.');
      }

      const campaignId = createData.campaign.id;

      // Step B: Trigger asynchronous send
      const sendResponse = await fetch(`${backendUrl}/api/campaigns/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          customerIds: segmentData.customers.map(c => c.id),
        }),
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        throw new Error(sendData.error || 'Failed to launch transmission loop.');
      }

      setLaunchSuccess(true);
      onCampaignLaunched(campaignId);
      
      // Reset after brief delay
      setTimeout(() => {
        setPrompt('');
        setSegmentData(null);
        setLaunchSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to execute campaign dispatch.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 1. Prompt Bar */}
      <form onSubmit={handleParsePrompt} className="relative">
        <div className="relative flex items-center bg-card border border-border rounded-xl px-4 py-3 shadow-md focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition duration-300">
          <Sparkles className="text-purple-500 dark:text-purple-400 w-5 h-5 mr-3 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to filter targets (e.g., 'Find customers who spent more than $50 in Coffee')"
            className="w-full bg-transparent outline-none text-foreground text-base placeholder-neutral-500"
            disabled={isParsing || isLaunching}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isParsing || isLaunching}
            className="flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 transition shrink-0"
          >
            {isParsing ? (
              <Loader2 className="w-5 h-5 animate-spin text-foreground" />
            ) : (
              <ArrowRight className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </form>

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading Animation Placeholder */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-card border border-border rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-neutral-400 text-sm animate-pulse">Gemini is translating prompt to database query filters...</p>
        </div>
      )}

      {/* 2. Dynamic Preview & Draft Panel */}
      {segmentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-xl p-6 shadow-xl animate-fadeIn">
          
          {/* Left Hand: Audience details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-neutral-400" />
                <span className="font-semibold text-foreground">Target Audience Size</span>
              </div>
              <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-sm font-medium border border-border">
                {segmentData.audienceSize} customers
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">AI Translation Logic</span>
              <p className="text-foreground text-sm bg-secondary p-3 rounded-lg border border-border">
                {segmentData.explanation}
              </p>
            </div>

            {/* Target Sample list */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">Audience Sample Preview</span>
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-neutral-400">
                  <thead className="bg-secondary text-neutral-500 uppercase text-[10px] tracking-wider sticky top-0 border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Total Spends</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {segmentData.customers.slice(0, 5).map((customer) => (
                      <tr key={customer.id} className="hover:bg-secondary/40">
                        <td className="px-3 py-2 font-medium text-foreground">{customer.name}</td>
                        <td className="px-3 py-2 text-neutral-500">{customer.email}</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400 font-mono">${customer.totalSpends.toFixed(2)}</td>
                      </tr>
                    ))}
                    {segmentData.customers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-neutral-600">No matching customers in segment.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Hand: Campaign dispatch config */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center border-b border-border pb-3">
              <span className="font-semibold text-foreground">Draft Campaign Setup</span>
            </div>

            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                placeholder="Enter campaign name"
              />
            </div>

            {/* Messaging Channel */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block">Channel Provider</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
              >
                <option value="WHATSAPP">WhatsApp (Mock)</option>
                <option value="EMAIL">Email (Mock)</option>
                <option value="SMS">SMS (Mock)</option>
                <option value="RCS">RCS (Mock)</option>
              </select>
            </div>

            {/* Template Body */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block">Message Content Template</label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 resize-none font-sans"
                placeholder="Message body..."
              />
              <span className="text-[10px] text-neutral-600 block font-medium">Use {"{{name}}"} to interpolate customer profile names dynamically.</span>
            </div>

            {/* Execute Launch Button */}
            <button
              onClick={handleLaunchCampaign}
              disabled={isLaunching || segmentData.customers.length === 0 || !campaignName.trim()}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg text-sm transition"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Queueing Communications...</span>
                </>
              ) : launchSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Campaign Active & Sending!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
