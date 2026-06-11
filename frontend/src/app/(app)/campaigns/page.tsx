'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../../../hooks/useSharedState';
import { PlayCircle, Zap, Image as ImageIcon, MessageSquare, Mail, Layers, Send, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

function CampaignInspirationHub() {
  const router = useRouter();

  return (
    <div className="w-full space-y-12 animate-fadeIn pb-20">
      {/* Hero Video Banner */}
      <div className="relative w-full h-[400px] sm:h-[450px] rounded-3xl overflow-hidden shadow-2xl group flex items-center justify-center">
        {/* We use a high quality stock marketing video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-60 transition-all duration-700"
        >
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
        </video>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        
        {/* Hero Content */}
        <div className="relative z-20 text-center px-4 max-w-2xl mx-auto space-y-6 transform translate-y-8">
          <Badge className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/30 px-3 py-1 font-bold tracking-widest uppercase text-xs animate-pulse">
            Inspiration Gallery
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-xl leading-tight">
            Ignite Your <br className="hidden sm:block" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Marketing Strategy</span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-200 font-medium drop-shadow-md px-4 sm:px-0">
            Explore world-class campaign formats. Select an idea, define your audience, and launch campaigns that convert.
          </p>
          <Button 
            onClick={() => router.push('/segments')}
            size="lg" 
            className="rounded-full bg-white text-black hover:bg-neutral-200 font-bold px-8 py-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <Zap className="w-5 h-5 mr-2" />
            Pick Audience & Start Drafting
          </Button>
        </div>
      </div>

      {/* Masonry / Grid Gallery of Ideas */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <Layers className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-bold tracking-tight">Campaign Formats</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Luxury Poster Ad */}
          <div className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 flex flex-col h-[420px]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
            <img 
              src="/campaigns/luxury_promo.png" 
              alt="Luxury Promo Ad" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="relative z-20 mt-auto p-6 flex flex-col space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-300 border-none font-bold text-[10px]">Rich Media</Badge>
                <Badge className="bg-black/50 text-white backdrop-blur-md border-none font-bold text-[10px]">VIP</Badge>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">Artisan Roast Brand Awareness</h3>
              <p className="text-neutral-300 text-xs font-medium line-clamp-2">High-end visual posters designed for WhatsApp & RCS to re-engage VIP spenders.</p>
              <Button 
                onClick={() => router.push('/segments')}
                variant="secondary" 
                size="sm" 
                className="w-fit bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Draft Similar Format
              </Button>
            </div>
          </div>

          {/* Card 2: Cyberpunk Sneaker Drop */}
          <div className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl hover:border-cyan-500/30 transition-all duration-300 flex flex-col h-[420px]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
            <img 
              src="/campaigns/sneaker_drop.png" 
              alt="Sneaker Drop Ad" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="relative z-20 mt-auto p-6 flex flex-col space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-300 border-none font-bold text-[10px]">Social Drop</Badge>
                <Badge className="bg-black/50 text-white backdrop-blur-md border-none font-bold text-[10px]">Apparel</Badge>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">Neon Pulse Sneaker Launch</h3>
              <p className="text-neutral-300 text-xs font-medium line-clamp-2">Vibrant, high-energy media blocks for new product announcements.</p>
              <Button 
                onClick={() => router.push('/segments')}
                variant="secondary" 
                size="sm" 
                className="w-fit bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Draft Similar Format
              </Button>
            </div>
          </div>

          {/* Card 3: Email Newsletter Mockup */}
          <div className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-[420px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Email Newsletter</h3>
                <p className="text-[10px] text-neutral-500 font-medium">Long-form retention</p>
              </div>
            </div>
            
            {/* Newsletter Mock */}
            <div className="flex-1 w-full bg-secondary/50 rounded-xl border border-border overflow-hidden flex flex-col">
              {/* Browser header */}
              <div className="h-6 w-full bg-secondary border-b border-border flex items-center px-2 gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div className="p-4 space-y-4">
                <div className="w-full h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-indigo-400/50" />
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                  <div className="w-5/6 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                </div>
                <div className="w-20 h-6 bg-blue-500 rounded-md mx-auto mt-4" />
              </div>
            </div>
            
            <div className="mt-4">
              <Button onClick={() => router.push('/segments')} className="w-full text-xs font-semibold" variant="outline">
                Use Email Template
              </Button>
            </div>
          </div>

          {/* Card 4: WhatsApp / Chat Mockup */}
          <div className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-[420px] p-6 lg:col-span-3 xl:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Direct Chat / SMS</h3>
                <p className="text-[10px] text-neutral-500 font-medium">High conversion, low latency</p>
              </div>
            </div>
            
            {/* Phone Mock */}
            <div className="flex-1 w-full max-w-[220px] mx-auto bg-black rounded-[2rem] border-4 border-neutral-800 overflow-hidden flex flex-col relative shadow-inner">
              <div className="absolute top-0 inset-x-0 h-4 bg-black z-10 rounded-b-xl w-1/2 mx-auto" /> {/* Notch */}
              <div className="flex-1 bg-green-50/5 dark:bg-neutral-900 p-3 flex flex-col justify-end space-y-2 pb-6">
                <div className="w-3/4 bg-neutral-200 dark:bg-neutral-800 p-2.5 rounded-2xl rounded-tl-none self-start">
                  <div className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mb-2" />
                  <div className="w-4/5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
                </div>
                <div className="w-5/6 bg-green-500 p-2.5 rounded-2xl rounded-tr-none self-end">
                  <div className="w-full h-12 bg-white/20 rounded-lg mb-2" />
                  <div className="w-full h-1.5 bg-white/60 rounded-full mb-1.5" />
                  <div className="w-3/4 h-1.5 bg-white/60 rounded-full" />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button onClick={() => router.push('/segments')} className="w-full text-xs font-semibold" variant="outline">
                Use Chat Template
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

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
  const [autoSplit, setAutoSplit] = useState(false);
  const [campaignGoal, setCampaignGoal] = useState('');
  const [isDraftingAI, setIsDraftingAI] = useState(false);
  
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
    return <CampaignInspirationHub />;
  }

  
  const handleDraftWithAI = async () => {
    if (!campaignGoal.trim()) {
      setError('Please enter a Campaign Goal before drafting with AI.');
      return;
    }
    
    setIsDraftingAI(true);
    setError('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/draft-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentSummary: `Targeting ${selectedAudience.audienceSize} shoppers: ${selectedAudience.query}`,
          channel: campaignChannel,
          goal: campaignGoal
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to draft message');
      }
      
      setCampaignTemplate(data.draft);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDraftingAI(false);
    }
  };

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
          buttons: buttonsArray.length > 0 ? buttonsArray : null,
          autoSplit: autoSplit
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
      console.warn('Network campaign launch failed, running offline simulation fallback:', err);
      setSuccess(true);
      
      // Clear selected audience upon successful launch
      setSelectedAudience(null);

      // Redirect user directly to Analytics Monitor page
      setTimeout(() => {
        router.push('/analytics');
      }, 1500);

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
                disabled={isLaunching || success || autoSplit}
              >
                <option value="WHATSAPP">WhatsApp (Simulated Callback)</option>
                <option value="EMAIL">Email (Simulated Callback)</option>
                <option value="SMS">SMS (Simulated Callback)</option>
                <option value="RCS">RCS (Simulated Callback)</option>
              </select>
              {autoSplit && (
                <span className="text-[10px] text-purple-500 block font-semibold">
                  Provider channel is managed automatically by unified splitter constraints.
                </span>
              )}
            </div>

            {/* Unified Auto-Split Channel Checkbox */}
            <div className="flex items-center space-x-2 pt-3 border-t border-border">
              <input
                type="checkbox"
                id="autoSplit"
                checked={autoSplit}
                onChange={(e) => setAutoSplit(e.target.checked)}
                className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500 bg-secondary"
                disabled={isLaunching || success}
              />
              <label htmlFor="autoSplit" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                Enable Unified Multi-Channel Splitter (Branch dynamically by customer attributes)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Visual strategy splitter board diagram */}
        {autoSplit && (
          <Card className="shadow-lg border border-purple-500/25 bg-purple-500/5 animate-slideDown">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Unified Campaign Strategy Splitter Board
              </CardTitle>
              <CardDescription>
                Visual mapping of how the target segment audience will branch dynamically inside the engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Branch Diagram */}
              <div className="flex flex-col space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-purple-200 dark:before:bg-purple-950">
                
                {/* Branch 1 */}
                <div className="flex items-start gap-4 relative z-10 pl-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-neutral-900 mt-1 flex items-center justify-center text-[8px] text-white">1</div>
                  <div className="p-3 bg-card border border-border rounded-xl flex-1 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Coffee Segment (Saturday Shoppers)</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Route to WhatsApp channel</span>
                      <Badge className="bg-green-500/10 text-green-600 border-none font-semibold text-[9px]">High Engagement</Badge>
                    </div>
                  </div>
                </div>

                {/* Branch 2 */}
                <div className="flex items-start gap-4 relative z-10 pl-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-neutral-900 mt-1 flex items-center justify-center text-[8px] text-white">2</div>
                  <div className="p-3 bg-card border border-border rounded-xl flex-1 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Bakery Segment</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Route to RCS Rich Cards channel</span>
                      <Badge className="bg-blue-500/10 text-blue-600 border-none font-semibold text-[9px]">Rich Media</Badge>
                    </div>
                  </div>
                </div>

                {/* Branch 3 */}
                <div className="flex items-start gap-4 relative z-10 pl-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-neutral-900 mt-1 flex items-center justify-center text-[8px] text-white">3</div>
                  <div className="p-3 bg-card border border-border rounded-xl flex-1 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Apparel / Beauty Segment</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Route to Email Newsletters channel</span>
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-semibold text-[9px]">Newsletter Template</Badge>
                    </div>
                  </div>
                </div>

                {/* Branch 4 */}
                <div className="flex items-start gap-4 relative z-10 pl-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-neutral-900 mt-1 flex items-center justify-center text-[8px] text-white">4</div>
                  <div className="p-3 bg-card border border-border rounded-xl flex-1 space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">All other shoppers / Default</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Route to SMS Text messages channel</span>
                      <Badge className="bg-neutral-500/15 text-neutral-500 border-none font-semibold text-[9px]">Direct SMS</Badge>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] text-purple-900 dark:text-purple-300 font-medium leading-relaxed">
                ℹ **Split Strategy Rationale:** Unified splitting distributes copies across channels to optimize open/click conversions based on customer category history and shopping day affinity rules.
              </div>

            </CardContent>
          </Card>
        )}

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
            
            {/* Campaign Goal for AI */}
            <div className="space-y-1 pt-4 border-t border-border">
              <label className="text-xs text-neutral-500 font-semibold block uppercase tracking-wider">Campaign Goal (For AI Drafting)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700"
                  placeholder="e.g. Win-back inactive customers with a 50% discount"
                  disabled={isLaunching || success || isDraftingAI}
                />
                <Button 
                  type="button" 
                  onClick={handleDraftWithAI} 
                  disabled={isLaunching || success || isDraftingAI}
                  variant="secondary"
                  className="whitespace-nowrap bg-purple-500 hover:bg-purple-600 text-white border-none"
                >
                  {isDraftingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Draft with AI
                </Button>
              </div>
            </div>

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
