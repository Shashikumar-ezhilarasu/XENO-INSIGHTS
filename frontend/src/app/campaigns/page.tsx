'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../../hooks/useSharedState';
import { Send, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
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
  const [isABTest, setIsABTest] = useState(false);
  const [templateB, setTemplateB] = useState('Hey {{name}}! Enjoy 15% off our products today! Buy Now!');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonsInput, setButtonsInput] = useState('Buy Now, Opt Out');
  
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill campaign name if there is an active segment selection
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
              To run a marketing campaign, you must first define a target customer segment using AI or RFM tiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button onClick={() => router.push('/segments')} className="w-full">
              Go to Segments Search
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

    // Convert comma-separated buttons into array
    const buttonsArray = buttonsInput
      .split(',')
      .map(b => b.trim())
      .filter(Boolean);

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
          messageTemplateB: isABTest ? templateB : null,
          imageUrl: imageUrl.trim() || null,
          buttons: buttonsArray.length > 0 ? buttonsArray : null
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
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Back link */}
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
          Define templates, A/B variants, image media, and custom interactive buttons targeting selected customers.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Target summary panel */}
      <Card className="shadow-md bg-secondary/10 border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Segment Group:</span>
              <span className="font-semibold text-foreground">"{selectedAudience.query}"</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Shopper Count:</span>
              <span className="px-2 py-0.5 bg-foreground text-background rounded-md text-xs font-semibold">
                {selectedAudience.audienceSize} target shoppers
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleLaunchCampaign} className="space-y-6">
        {/* Campaign Settings Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Message Templates & A/B testing Card */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Campaign Message Copy</CardTitle>
              <CardDescription>Draft templates for campaign copy</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsABTest(!isABTest)}
              className="flex items-center text-sm font-semibold space-x-1.5 focus:outline-none text-purple-600 dark:text-purple-400 hover:opacity-90"
              disabled={isLaunching || success}
            >
              {isABTest ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              <span>A/B Split Test</span>
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variant A Template */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">
                {isABTest ? 'Variant A Message Template' : 'Message Content Template'}
              </label>
              <textarea
                value={campaignTemplate}
                onChange={(e) => setCampaignTemplate(e.target.value)}
                required
                rows={3}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 resize-none font-sans"
                placeholder="Type your main message copy..."
                disabled={isLaunching || success}
              />
            </div>

            {/* Variant B Template */}
            {isABTest && (
              <div className="space-y-1 animate-slideDown">
                <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">
                  Variant B Message Template
                </label>
                <textarea
                  value={templateB}
                  onChange={(e) => setTemplateB(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 resize-none font-sans"
                  placeholder="Type variant B message copy..."
                  disabled={isLaunching || success}
                />
              </div>
            )}

            {/* Personalized Variable tags helpers */}
            <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-2">
              <div className="flex items-center space-x-1 text-purple-500 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hyper-Personalization Variable Codes</span>
              </div>
              <ul className="text-xs text-neutral-500 space-y-1">
                <li><code>{'{'}{'{'}name{'}'}{'}'}</code> &mdash; Recipient shopper's full name.</li>
                <li><code>{'{'}{'{'}last_purchased_item{'}'}{'}'}</code> &mdash; Category of customer's latest order.</li>
                <li><code>{'{'}{'{'}favorite_category{'}'}{'}'}</code> &mdash; Most frequently ordered category.</li>
                <li><code>{'{'}{'{'}total_loyalty_points{'}'}{'}'}</code> &mdash; Customer's loyalty point rewards balance.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Rich Media & interactive Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Rich Media & Interactions</CardTitle>
            <CardDescription>Attach visual assets and interactive quick-reply actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image URL */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Mock Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                placeholder="https://example.com/asset-ad.jpg"
                disabled={isLaunching || success}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Interactive Action Buttons (Comma-separated)</label>
              <input
                type="text"
                value={buttonsInput}
                onChange={(e) => setButtonsInput(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                placeholder="Buy Now, Opt Out, View Details"
                disabled={isLaunching || success}
              />
              <span className="text-[10px] text-neutral-600 block font-semibold">
                Simulates quick-reply action buttons on channels like WhatsApp and RCS.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Action */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLaunching || success || !campaignName.trim() || !campaignTemplate.trim()}
            className="space-x-2"
          >
            {isLaunching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Campaign splits...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Launched Successfully!</span>
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
    </div>
  );
}
