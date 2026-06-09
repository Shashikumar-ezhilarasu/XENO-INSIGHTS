'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../../hooks/useSharedState';
import { Send, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function CampaignsPage() {
  const router = useRouter();
  const {
    selectedAudience,
    setSelectedAudience,
    campaignTemplate,
    setCampaignTemplate,
    campaignChannel,
    setCampaignChannel
  } = useSharedState();

  const [campaignName, setCampaignName] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill campaign name if there is an active query
  useEffect(() => {
    if (selectedAudience) {
      setCampaignName(`Campaign for: ${selectedAudience.query.length > 30 ? selectedAudience.query.substring(0, 30) + '...' : selectedAudience.query}`);
    }
  }, [selectedAudience]);

  if (!selectedAudience) {
    return (
      <div className="max-w-md mx-auto py-12 animate-fadeIn">
        <Card className="text-center">
          <CardHeader className="flex flex-col items-center space-y-2 pb-4">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
            <CardTitle className="text-xl">No Target Segment Selected</CardTitle>
            <CardDescription>
              To run a marketing campaign, you must first define a target customer segment using AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button onClick={() => router.push('/segments')} className="w-full">
              Create AI Segment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !campaignTemplate.trim()) return;

    setIsLaunching(true);
    setError(null);

    try {
      // Step A: Save campaign metadata to the backend
      const createRes = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          promptText: selectedAudience.query,
          channel: campaignChannel,
          messageTemplate: campaignTemplate,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to save campaign configuration.');
      }

      const campaignId = createData.campaign.id;

      // Step B: Trigger asynchronous send
      const sendRes = await fetch(`${BACKEND_URL}/api/campaigns/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          customerIds: selectedAudience.customers.map(c => c.id),
        }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendData.error || 'Failed to queue campaign transmission.');
      }

      setSuccess(true);
      
      // Clear selected audience upon successful launch
      setSelectedAudience(null);

      // Redirect user directly to Analytics Monitor page
      setTimeout(() => {
        router.push('/analytics');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during campaign setup.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
      {/* Back to segments link */}
      <button
        onClick={() => router.push('/segments')}
        className="flex items-center text-sm text-neutral-500 hover:text-foreground transition space-x-1 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Adjust Target Segment</span>
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
          Draft Campaign Setup
        </h1>
        <p className="text-sm text-neutral-500 font-medium">
          Define name, template bodies, and delivery channels targeting your selected customer segment.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <Card className="shadow-xl">
        <CardHeader className="border-b border-border pb-4 bg-secondary/10">
          <CardTitle className="text-base font-semibold">Active Target Segment Summary</CardTitle>
          <div className="flex flex-col space-y-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">AI Prompt Query:</span>
              <span className="font-semibold text-foreground">"{selectedAudience.query}"</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Audience Group:</span>
              <span className="px-2 py-0.5 bg-foreground text-background rounded-md text-xs font-semibold">
                {selectedAudience.audienceSize} target shoppers
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLaunchCampaign} className="space-y-5">
            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                required
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                placeholder="Enter campaign name"
                disabled={isLaunching || success}
              />
            </div>

            {/* Messaging Channel */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Messaging Provider Channel</label>
              <select
                value={campaignChannel}
                onChange={(e) => setCampaignChannel(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                disabled={isLaunching || success}
              >
                <option value="WHATSAPP">WhatsApp (Simulated Callback)</option>
                <option value="EMAIL">Email (Simulated Callback)</option>
                <option value="SMS">SMS (Simulated Callback)</option>
                <option value="RCS">RCS (Simulated Callback)</option>
              </select>
            </div>

            {/* Template Body */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Message Content Template</label>
              <textarea
                value={campaignTemplate}
                onChange={(e) => setCampaignTemplate(e.target.value)}
                required
                rows={4}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 resize-none font-sans"
                placeholder="Type your message body..."
                disabled={isLaunching || success}
              />
              <span className="text-[10px] text-neutral-600 block font-semibold">
                Use {'{{name}}'} to interpolate customer names dynamically (e.g. "Hey {'{{name}}'}, check out this discount!").
              </span>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                type="submit"
                disabled={isLaunching || success || !campaignName.trim() || !campaignTemplate.trim()}
                className="space-x-2"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Queueing Campaign...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Active & Sending!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Launch Campaign</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
