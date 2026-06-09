'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../../hooks/useSharedState';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Users, 
  ArrowRightCircle, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  Coffee, 
  Crown, 
  Utensils, 
  AlertCircle, 
  Bot, 
  Layers, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface CampaignDraftData {
  success: boolean;
  campaign: {
    id: string;
    name: string;
    promptText: string | null;
    messageTemplate: string | null;
    channel: string;
    status: string;
  };
  customerCount: number;
  customerIds: string[];
  explanation: string;
  copywriteSuite: {
    notificationHeader: string;
    messageTemplate: string;
    creativeQuote: string;
  };
  bannerConfig: {
    themeGradient: string;
    stickerEmoji: string;
    primaryCallToAction: string;
  };
}

const LOADING_STEPS = [
  "Assembling segment...",
  "Brewing engaging copy...",
  "Generating ad banners..."
];

const CAMPAIGN_PRESETS = [
  {
    id: 'coffee-90d',
    title: '☕ Coffee Win-Back (90d)',
    description: 'Re-engage coffee lovers missing for 90 days with witty copy and discount voucher.',
    promptText: 'Bring back coffee lovers missing for 90 days (Witty & Emotional)',
    channel: 'WHATSAPP',
    gradient: 'from-amber-500 to-orange-600',
    emoji: '☕'
  },
  {
    id: 'vip-spenders',
    title: '👑 Luxury VIP Gift (+$500)',
    description: 'Surprise loyal high-spenders over $500 with a luxury VIP gift package.',
    promptText: 'Surprise high-spenders over $500 with a luxury VIP gift',
    channel: 'EMAIL',
    gradient: 'from-yellow-600 to-amber-900',
    emoji: '🎁'
  },
  {
    id: 'bakery-nudge',
    title: '🥐 Bakery Nudge (Hungry Mode)',
    description: 'Nudge recent bakery buyers who haven\'t ordered this week with fresh pastry offers.',
    promptText: 'Nudge bakery buyers who haven\'t ordered this week (Hungry mode)',
    channel: 'RCS',
    gradient: 'from-orange-400 to-rose-600',
    emoji: '🥐'
  }
];

export default function SegmentsPage() {
  const router = useRouter();
  const { setSelectedAudience } = useSharedState();

  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAgenticMode, setIsAgenticMode] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Manual Segmentation Output
  const [segmentData, setSegmentData] = useState<{
    audienceSize: number;
    customers: any[];
    explanation: string;
    generatedQuery: string;
  } | null>(null);

  // Agentic Draft Output
  const [draftCampaign, setDraftCampaign] = useState<CampaignDraftData | null>(null);

  // Editable Campaign Review Fields
  const [editCampaignName, setEditCampaignName] = useState('');
  const [editMessageTemplate, setEditMessageTemplate] = useState('');
  const [editChannel, setEditChannel] = useState('WHATSAPP');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Multi-state loading screen text cycler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isParsing && isAgenticMode) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isParsing, isAgenticMode]);

  // Execute standard customer segment parser
  const handleParsePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setIsAgenticMode(false);
    setError(null);
    setSegmentData(null);
    setDraftCampaign(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/segment`, {
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

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during query generation.');
    } finally {
      setIsParsing(false);
    }
  };

  // Execute True Agentic Draft Campaign Orchestration
  const handleDraftCampaign = async (promptText: string) => {
    if (!promptText.trim()) return;

    setIsParsing(true);
    setIsAgenticMode(true);
    setLoadingStep(0);
    setError(null);
    setSegmentData(null);
    setDraftCampaign(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/draft-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText }),
      });

      const data: CampaignDraftData = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to generate campaign draft.');
      }

      setDraftCampaign(data);
      setEditCampaignName(data.campaign.name);
      setEditMessageTemplate(data.copywriteSuite.messageTemplate);
      setEditChannel(data.campaign.channel);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during campaign drafting.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Action Button: Approve & Broadcast Campaign
  const handleApproveAndBroadcast = async () => {
    if (!draftCampaign) return;

    setIsBroadcasting(true);
    setError(null);

    try {
      // Step 1: Update Campaign with edited name, copy, channel and status='PENDING'
      const updateRes = await fetch(`${BACKEND_URL}/api/campaigns/${draftCampaign.campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCampaignName,
          messageTemplate: editMessageTemplate,
          channel: editChannel,
          status: 'PENDING'
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to save updated campaign details.');
      }

      // Step 2: Dispatch Campaign broadcast using existing send endpoint
      const sendRes = await fetch(`${BACKEND_URL}/api/campaigns/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: draftCampaign.campaign.id,
          customerIds: draftCampaign.customerIds
        }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendData.error || 'Failed to broadcast campaign.');
      }

      setBroadcastSuccess(true);
      
      // Redirect to Analytics Monitor
      setTimeout(() => {
        router.push('/analytics');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while broadcasting the campaign.');
      setIsBroadcasting(false);
    }
  };

  // Helper to interpolate vars in notification preview
  const interpolatePreview = (templateText: string) => {
    if (!templateText) return '';
    return templateText
      .replace(/\{\{\s*name\s*\}\}/gi, 'Alice')
      .replace(/\{\{\s*last_purchased_item\s*\}\}/gi, 'Coffee')
      .replace(/\{\{\s*favorite_category\s*\}\}/gi, 'Coffee')
      .replace(/\{\{\s*total_loyalty_points\s*\}\}/gi, '150');
  };

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    handleDraftCampaign(chipPrompt);
  };

  const handleProceedToCampaign = () => {
    if (!segmentData) return;
    setSelectedAudience({
      audienceSize: segmentData.audienceSize,
      customers: segmentData.customers,
      query: prompt,
      explanation: segmentData.explanation
    });
    router.push('/campaigns');
  };

  const handleResetWorkspace = () => {
    setDraftCampaign(null);
    setSegmentData(null);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans flex items-center gap-2">
            <Bot className="w-8 h-8 text-purple-500" />
            AI Marketing Agent Workspace
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl font-medium">
            Type target requests or choose from one of the active templates below to instantly draft copy and launch campaigns.
          </p>
        </div>
        {draftCampaign && (
          <Button onClick={handleResetWorkspace} variant="secondary" className="space-x-2 shrink-0 border border-border">
            <RefreshCw className="w-4 h-4" />
            <span>Reset Workspace</span>
          </Button>
        )}
      </div>

      {/* Input Form & Chips Container */}
      {!draftCampaign && (
        <div className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          {/* Prompt input bar */}
          <form onSubmit={handleParsePrompt} className="relative space-y-4">
            <div className="relative flex items-center bg-secondary/30 border border-border rounded-xl px-4 py-3 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition duration-300">
              <Sparkles className="text-purple-500 dark:text-purple-400 w-5 h-5 mr-3 shrink-0" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Bring back customer segments... (e.g. 'Coffee lovers missing for 90 days')"
                className="w-full bg-transparent outline-none text-foreground text-base placeholder-neutral-500"
                disabled={isParsing}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="submit"
                disabled={!prompt.trim() || isParsing}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 hover:bg-secondary disabled:opacity-50 transition font-medium text-sm text-foreground bg-background"
              >
                <Layers className="w-4 h-4 text-neutral-500" />
                <span>Search Segment Only</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleDraftCampaign(prompt)}
                disabled={!prompt.trim() || isParsing}
                className="flex items-center justify-center space-x-1.5 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition font-semibold text-sm shadow-md shadow-purple-600/10"
              >
                <Sparkles className="w-4 h-4" />
                <span>Orchestrate Campaign Draft</span>
              </button>
            </div>
          </form>

          {/* Quick Action Chips */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Quick Action Chips</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleChipClick("Bring back coffee lovers missing for 90 days (Witty & Emotional)")}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-purple-100 dark:hover:bg-purple-950/30 hover:text-purple-600 rounded-full text-xs font-semibold border border-border transition text-neutral-600 dark:text-neutral-300"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                <span>☕ Coffee Win-Back (90d)</span>
              </button>
              
              <button
                onClick={() => handleChipClick("Surprise high-spenders over $500 with a luxury VIP gift")}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-yellow-100 dark:hover:bg-yellow-950/30 hover:text-yellow-600 rounded-full text-xs font-semibold border border-border transition text-neutral-600 dark:text-neutral-300"
              >
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                <span>👑 Luxury VIP Gift (+$500)</span>
              </button>

              <button
                onClick={() => handleChipClick("Nudge bakery buyers who haven't ordered this week (Hungry mode)")}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-orange-100 dark:hover:bg-orange-950/30 hover:text-orange-600 rounded-full text-xs font-semibold border border-border transition text-neutral-600 dark:text-neutral-300"
              >
                <Utensils className="w-3.5 h-3.5 text-orange-500" />
                <span>🥐 Bakery Nudge (Hungry Mode)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Presets Gallery Section (Always Present by Default) */}
      {!draftCampaign && !isParsing && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-500" />
            Featured Campaign Presets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CAMPAIGN_PRESETS.map((preset) => (
              <Card 
                key={preset.id} 
                className="hover:border-purple-500/50 hover:shadow-md transition duration-300 flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <span className="text-3xl select-none">{preset.emoji}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary uppercase text-neutral-500 tracking-wider">
                      {preset.channel}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-2">{preset.title}</CardTitle>
                  <CardDescription className="text-xs mt-1 leading-relaxed">
                    {preset.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button 
                    onClick={() => handleChipClick(preset.promptText)}
                    className="w-full space-x-1.5 text-xs font-semibold"
                    variant="outline"
                  >
                    <Zap className="w-3 h-3 text-purple-500" />
                    <span>Activate Workspace Preset</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-card border border-border rounded-xl shadow-inner animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          <div className="space-y-1 text-center">
            <p className="text-foreground text-base font-semibold">
              {isAgenticMode ? LOADING_STEPS[loadingStep] : "Analyzing database fields..."}
            </p>
            <p className="text-xs text-neutral-500">Preparing segments and personalized deliverables.</p>
          </div>
        </div>
      )}

      {/* AI Draft Workspace & Ad Canvas Panel */}
      {draftCampaign && !isParsing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-scaleUp">
          
          {/* Left Column: The Ad Canvas (Rich Media Preview) - Takes 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
              Left Column: The Ad Canvas
            </h3>

            {/* Smartphone Lock Screen */}
            <div className="w-full max-w-[320px] mx-auto rounded-[38px] border-8 border-neutral-800 bg-gradient-to-b from-slate-900 via-indigo-950 to-neutral-950 aspect-[9/18.5] shadow-2xl relative overflow-hidden flex flex-col justify-start pt-12 pb-6 px-4">
              {/* Speaker Bar & Camera Pill */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full flex items-center justify-end px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
              </div>

              {/* Date & Clock */}
              <div className="text-center text-white/90 space-y-0.5 select-none mb-10">
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Tuesday, June 9</p>
                <h2 className="text-4xl font-light font-sans tracking-tight">11:51</h2>
              </div>

              {/* Glassmorphic Notification bubble */}
              <div className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg select-none hover:bg-white/15 transition duration-200">
                <div className="flex items-center justify-between text-[10px] text-neutral-300 font-bold mb-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-md bg-purple-500 flex items-center justify-center text-[7px] text-white">X</div>
                    <span>XENO CRM</span>
                  </div>
                  <span>now</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5 line-clamp-1">
                  {draftCampaign.copywriteSuite.notificationHeader}
                </h4>
                <p className="text-[10px] text-neutral-200 leading-snug line-clamp-3">
                  {interpolatePreview(editMessageTemplate)}
                </p>
              </div>

              {/* Swipe Up Helper */}
              <div className="mt-auto text-center space-y-1.5 select-none">
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto" />
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">Swipe up to unlock</p>
              </div>
            </div>

            {/* Rich Media Ad Banner Card */}
            <div className="w-full max-w-[320px] mx-auto space-y-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block text-center">Rich Card Banner Ad</span>
              <div className={`w-full rounded-2xl p-6 text-white bg-gradient-to-br ${draftCampaign.bannerConfig.themeGradient} shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px] hover:shadow-2xl transition duration-300 group`}>
                
                {/* Floating Large Sticker Emoji */}
                <div className="text-7xl absolute right-2 bottom-2 opacity-80 group-hover:scale-110 group-hover:rotate-12 transition duration-300 transform select-none">
                  {draftCampaign.bannerConfig.stickerEmoji}
                </div>

                {/* Creative Quote */}
                <div className="relative z-10 max-w-[85%] bg-black/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <p className="text-sm font-serif italic font-medium leading-relaxed">
                    {draftCampaign.copywriteSuite.creativeQuote}
                  </p>
                </div>

                {/* Styled Call To Action Button */}
                <button className="relative z-10 mt-6 self-start px-5 py-2 bg-white text-neutral-900 rounded-full font-bold text-xs shadow-md hover:bg-neutral-100 hover:shadow-lg active:scale-95 transition-all duration-200">
                  {draftCampaign.bannerConfig.primaryCallToAction}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Review & Execution Panel - Takes 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-500" />
              Right Column: Review & Execution Panel
            </h3>

            {/* Strategic AI Explanation Insight box */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-900 dark:text-purple-300 text-sm font-medium flex items-start gap-3 shadow-inner">
              <Bot className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">Agent Campaign Strategy</span>
                <p className="leading-relaxed">{draftCampaign.explanation}</p>
              </div>
            </div>

            {/* Campaign Config Review Form */}
            <Card className="shadow-lg border border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Campaign Editor</CardTitle>
                  <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-xs font-semibold border border-border flex items-center gap-1">
                    <Users className="w-3 h-3 text-neutral-400" />
                    {draftCampaign.customerCount} customers targeted
                  </span>
                </div>
                <CardDescription>Fine-tune the draft details generated by the growth assistant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Name */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Campaign Name</label>
                  <input
                    type="text"
                    value={editCampaignName}
                    onChange={(e) => setEditCampaignName(e.target.value)}
                    required
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    placeholder="Campaign Name"
                    disabled={isBroadcasting}
                  />
                </div>

                {/* Suggested Channel Selection */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Communication Channel</label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    disabled={isBroadcasting}
                  >
                    <option value="WHATSAPP">WhatsApp (Simulated)</option>
                    <option value="EMAIL">Email (Simulated)</option>
                    <option value="SMS">SMS (Simulated)</option>
                    <option value="RCS">RCS (Simulated)</option>
                  </select>
                </div>

                {/* Message Template Textarea */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Personalized Copywriter Template</label>
                    <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider animate-pulse">Growth Mode</span>
                  </div>
                  <textarea
                    value={editMessageTemplate}
                    onChange={(e) => setEditMessageTemplate(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none font-sans"
                    placeholder="Draft copy..."
                    disabled={isBroadcasting}
                  />
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-neutral-500 font-medium">
                    <span>Variables available:</span>
                    <code>{"{{name}}"}</code>
                    <code>{"{{last_purchased_item}}"}</code>
                    <code>{"{{favorite_category}}"}</code>
                    <code>{"{{total_loyalty_points}}"}</code>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button 
                    onClick={handleApproveAndBroadcast} 
                    disabled={isBroadcasting || broadcastSuccess || !editCampaignName.trim() || !editMessageTemplate.trim()}
                    className="space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md shadow-purple-600/10"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Broadcasting to targets...</span>
                      </>
                    ) : broadcastSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>Campaign Launched!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Approve & Broadcast Campaign</span>
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* Original Manual Target Segment Results Preview Panel */}
      {segmentData && !isParsing && (
        <Card className="shadow-xl animate-scaleUp">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-lg">Segment Results</CardTitle>
              <CardDescription>Previewing matching customers in target group</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-xs font-semibold border border-border">
                {segmentData.audienceSize} customers found
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Logic explanation */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">AI Translation Logic</span>
              <p className="text-foreground text-sm bg-secondary p-3 rounded-lg border border-border font-medium">
                {segmentData.explanation}
              </p>
            </div>

            {/* Preview table */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">Audience Sample List</span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Spends</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentData.customers.slice(0, 8).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold text-foreground">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-mono font-semibold">
                        ${customer.totalSpends.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {segmentData.customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No matching customers found. Try a different query.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Action button */}
            {segmentData.audienceSize > 0 && (
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleProceedToCampaign} className="space-x-2">
                  <span>Proceed to Campaign Setup</span>
                  <ArrowRightCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
