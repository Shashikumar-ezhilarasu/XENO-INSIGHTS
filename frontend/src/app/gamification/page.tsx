'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Sparkles, Share2, Users, Award, 
  HelpCircle, CheckCircle2, Loader2, RefreshCw, AlertCircle,
  Copy, Check, Send, Smartphone, Landmark, Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface CustomerProfile {
  id: string;
  name: string;
  loyaltyPoints: number;
}

const MOCK_CUSTOMERS = [
  { id: 'cust-1', name: 'Emma Smith', loyaltyPoints: 120.5 },
  { id: 'cust-2', name: 'Liam Johnson', loyaltyPoints: 45.0 },
  { id: 'cust-3', name: 'Olivia Williams', loyaltyPoints: 310.2 },
  { id: 'cust-4', name: 'Noah Brown', loyaltyPoints: 15.0 },
  { id: 'cust-5', name: 'Ava Jones', loyaltyPoints: 240.0 }
];

export default function GamificationPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [referredCustomerId, setReferredCustomerId] = useState('');
  
  const [campaignType, setCampaignType] = useState('Loyalty Milestone');
  const [hookStrategy, setHookStrategy] = useState('SPIN_WHEEL');
  const [customPrizeInput, setCustomPrizeInput] = useState('Free Coffee, 50 Pts, 10% Off, Try Again');

  // Interactive Spin Wheel States
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  // Scratch Card Canvas Reference & States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [isScratchedRevealed, setIsScratchedRevealed] = useState(false);
  const [scratchReward, setScratchReward] = useState('BAKERYFREE');

  // Social Challenge States
  const [socialStep, setSocialStep] = useState<'IDLE' | 'SHARING' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [socialPlatform, setSocialPlatform] = useState('X (Twitter)');

  // Referral states
  const [copiedCode, setCopiedCode] = useState(false);
  const [referring, setReferring] = useState(false);
  const [referralSuccessMsg, setReferralSuccessMsg] = useState<string | null>(null);

  // General Notification Alert States
  const [syncStatus, setSyncStatus] = useState<'ONLINE' | 'OFFLINE_FALLBACK'>('ONLINE');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Load customer profiles for targeting dropdown
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/customers?limit=10`);
        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || []);
          if (json.data && json.data.length > 0) {
            setSelectedCustomerId(json.data[0].id);
            setReferredCustomerId(json.data[Math.min(1, json.data.length - 1)].id);
          }
          setSyncStatus('ONLINE');
        } else {
          setCustomers(MOCK_CUSTOMERS);
          setSelectedCustomerId(MOCK_CUSTOMERS[0].id);
          setReferredCustomerId(MOCK_CUSTOMERS[1].id);
          setSyncStatus('OFFLINE_FALLBACK');
        }
      } catch (err) {
        console.error('Failed to load customers, fallback active:', err);
        setCustomers(MOCK_CUSTOMERS);
        setSelectedCustomerId(MOCK_CUSTOMERS[0].id);
        setReferredCustomerId(MOCK_CUSTOMERS[1].id);
        setSyncStatus('OFFLINE_FALLBACK');
      }
    }
    loadCustomers();
  }, []);

  // Initialize Scratch Card Canvas
  useEffect(() => {
    if (hookStrategy === 'SCRATCH_CARD') {
      initScratchCanvas();
    }
  }, [hookStrategy, scratchReward]);

  const initScratchCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset states
    setScratchPercent(0);
    setIsScratchedRevealed(false);

    // Set canvas dimensions matching container
    canvas.width = canvas.parentElement?.clientWidth || 250;
    canvas.height = 140;

    // Fill canvas with premium metallic gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#c0c0c0');
    grad.addColorStop(0.3, '#e0e0e0');
    grad.addColorStop(0.5, '#a0a0a0');
    grad.addColorStop(0.7, '#d8d8d8');
    grad.addColorStop(1, '#909090');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise for silver scratch card look
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, 1, 1);
    }

    // Write Scratch Overlay Guide text
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DRAG MOUSE OR SWIPE TO SCRATCH', canvas.width / 2, canvas.height / 2);
  };

  // Canvas Scratch Event Handlers
  const handleScratchStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    scratch(e);
  };

  const handleScratchMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isScratching) return;
    scratch(e);
  };

  const handleScratchEnd = () => {
    setIsScratching(false);
    checkScratchPercentage();
  };

  const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas || isScratchedRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const totalPixels = imgData.width * imgData.height;
    let transparentPixels = 0;

    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] === 0) {
        transparentPixels++;
      }
    }

    const percentage = Math.round((transparentPixels / totalPixels) * 100);
    setScratchPercent(percentage);

    if (percentage > 45) {
      setIsScratchedRevealed(true);
      // clear entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      creditPoints('SCRATCH_CARD', scratchReward);
    }
  };

  // Credit points API callback
  const creditPoints = async (type: string, prizeName?: string) => {
    if (!selectedCustomerId) return;
    setActionLoading(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    const targetCustomer = customers.find(c => c.id === selectedCustomerId);
    const name = targetCustomer?.name || 'Shopper';

    try {
      const res = await fetch(`${BACKEND_URL}/api/loyalty/gamify-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          eventType: 'SPIN_WHEEL'
        })
      });

      if (res.ok) {
        const json = await res.json();
        setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? { ...c, loyaltyPoints: json.currentPoints } : c));
        setActionSuccessMsg(`Success! Credited +50 loyalty points to ${name}. New balance: ${json.currentPoints} pts. ${prizeName ? `(Won: ${prizeName})` : ''}`);
      } else {
        throw new Error('Failed to synchronize point increase.');
      }
    } catch (err) {
      console.warn('Backend connection failed, crediting points locally:', err);
      // Local fallback credit
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerId) {
          const newPoints = c.loyaltyPoints + 50.0;
          return { ...c, loyaltyPoints: Math.round(newPoints * 10) / 10 };
        }
        return c;
      }));
      const updatedCustomer = customers.find(c => c.id === selectedCustomerId);
      const approxPoints = (updatedCustomer?.loyaltyPoints || 0) + 50;
      setActionSuccessMsg(`[Simulation Mode] Credited +50 loyalty points locally to ${name}. Balance: ${approxPoints} pts. ${prizeName ? `(Revealed: ${prizeName})` : ''}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Interactive Spin Wheel Trigger
  const handleSpinWheel = () => {
    if (isSpinning) return;

    setWheelResult(null);
    setActionSuccessMsg(null);

    const prizes = customPrizeInput.split(',').map(p => p.trim()).filter(Boolean);
    if (prizes.length === 0) return;

    const winnerIndex = Math.floor(Math.random() * prizes.length);
    const sectorDegree = 360 / prizes.length;
    // Rotate 5 full turns then land on the prize center
    const targetDeg = 1800 + (360 - (winnerIndex * sectorDegree)) - (sectorDegree / 2);

    setSpinDeg(targetDeg);
    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
      const wonPrize = prizes[winnerIndex];
      setWheelResult(wonPrize);
      
      // credit points to active customer
      creditPoints('SPIN_WHEEL', wonPrize);
    }, 3000);
  };

  // Interactive Social Share Sim
  const handleSocialShare = () => {
    setSocialStep('SHARING');
    setActionSuccessMsg(null);

    setTimeout(() => {
      setSocialStep('VERIFYING');
      
      setTimeout(() => {
        setSocialStep('SUCCESS');
        creditPoints('SOCIAL_SHARE', `Social Share & Comment on ${socialPlatform}`);
      }, 1500);
    }, 1500);
  };

  // Interactive Referral Simulation
  const handleSimulateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !referredCustomerId || selectedCustomerId === referredCustomerId) {
      setActionErrorMsg('Please select two different shoppers to simulate a referral link.');
      return;
    }

    setReferring(true);
    setReferralSuccessMsg(null);
    setActionErrorMsg(null);

    const referrer = customers.find(c => c.id === selectedCustomerId);
    const referred = customers.find(c => c.id === referredCustomerId);

    try {
      const res = await fetch(`${BACKEND_URL}/api/loyalty/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: selectedCustomerId,
          referredId: referredCustomerId
        })
      });

      if (res.ok) {
        const json = await res.json();
        // Update both customer balances in local display list
        setCustomers(prev => prev.map(c => {
          if (c.id === selectedCustomerId) return { ...c, loyaltyPoints: json.referrerPoints };
          if (c.id === referredCustomerId) return { ...c, loyaltyPoints: json.referredPoints };
          return c;
        }));
        setReferralSuccessMsg(`Referral registered! Referrer ${referrer?.name} credited +100pts (Total: ${json.referrerPoints}). Referred friend ${referred?.name} credited +50pts (Total: ${json.referredPoints}).`);
      } else {
        throw new Error('Transaction failed.');
      }
    } catch (err) {
      console.warn('Referral sync failed, simulating locally:', err);
      // Local fallback referral crediting
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerId) return { ...c, loyaltyPoints: Math.round((c.loyaltyPoints + 100) * 10) / 10 };
        if (c.id === referredCustomerId) return { ...c, loyaltyPoints: Math.round((c.loyaltyPoints + 50) * 10) / 10 };
        return c;
      }));
      setReferralSuccessMsg(`[Simulation Mode] Referral link approved! Referrer ${referrer?.name} gets +100pts. Referred friend ${referred?.name} gets +50pts.`);
    } finally {
      setReferring(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText('XENO-REFP-2026');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Gamification & Engagement Studio
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl font-medium">
            Design milestone rewards, spin-to-win widgets, scratch-off vouchers, and social/referral challenges.
          </p>
        </div>

        {/* Sync Badge */}
        <div className="shrink-0 flex items-center space-x-2">
          {syncStatus === 'ONLINE' ? (
            <span className="text-[10px] font-bold px-3 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              CRM Backend Live
            </span>
          ) : (
            <span className="text-[10px] font-bold px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Offline Simulator Mode
            </span>
          )}
        </div>
      </div>

      {/* API Action feedback alerts */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl border border-green-200 dark:border-green-950 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-2 animate-scaleUp">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-2 animate-scaleUp">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Main Grid: Customizer Forms (Left) vs Smartphone Game Live Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form & Hook Customization - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-purple-500" />
                1. Campaign & Engagement Context
              </CardTitle>
              <CardDescription>Determine what segment is targeted and what the engagement target is</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Select */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Target Shopper Profile</label>
                  <select 
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Balance: {c.loyaltyPoints} pts)</option>
                    ))}
                  </select>
                </div>

                {/* Campaign Goal Select */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Campaign Goal</label>
                  <select 
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Loyalty Milestone">Loyalty Milestone (Boost Points)</option>
                    <option value="Churn Win-Back">Churn Win-Back (Gift Vouchers)</option>
                    <option value="Social Buzz & Comment">Social Buzz (Repost and Win)</option>
                    <option value="Viral Referral invite">Viral Referral (Friend Rewards)</option>
                  </select>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                2. Design Hook Strategy Template
              </CardTitle>
              <CardDescription>Select and configure the visual hook mechanics for checkout or messaging channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Hook Selection tabs */}
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Hook Mechanism Type</label>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => { setHookStrategy('SPIN_WHEEL'); setWheelResult(null); }}
                    className={`py-2 px-1 text-center font-bold text-[10px] rounded-lg border transition ${
                      hookStrategy === 'SPIN_WHEEL' 
                        ? 'bg-purple-600/10 text-purple-600 border-purple-500' 
                        : 'bg-secondary border-border text-neutral-400 hover:text-foreground'
                    }`}
                  >
                    🎯 Spin Wheel
                  </button>

                  <button 
                    onClick={() => { setHookStrategy('SCRATCH_CARD'); initScratchCanvas(); }}
                    className={`py-2 px-1 text-center font-bold text-[10px] rounded-lg border transition ${
                      hookStrategy === 'SCRATCH_CARD' 
                        ? 'bg-purple-600/10 text-purple-600 border-purple-500' 
                        : 'bg-secondary border-border text-neutral-400 hover:text-foreground'
                    }`}
                  >
                    🎫 Scratch Card
                  </button>

                  <button 
                    onClick={() => { setHookStrategy('SOCIAL_SHARE'); setSocialStep('IDLE'); }}
                    className={`py-2 px-1 text-center font-bold text-[10px] rounded-lg border transition ${
                      hookStrategy === 'SOCIAL_SHARE' 
                        ? 'bg-purple-600/10 text-purple-600 border-purple-500' 
                        : 'bg-secondary border-border text-neutral-400 hover:text-foreground'
                    }`}
                  >
                    💬 Social Repost
                  </button>

                  <button 
                    onClick={() => { setHookStrategy('REFERRAL'); setReferralSuccessMsg(null); }}
                    className={`py-2 px-1 text-center font-bold text-[10px] rounded-lg border transition ${
                      hookStrategy === 'REFERRAL' 
                        ? 'bg-purple-600/10 text-purple-600 border-purple-500' 
                        : 'bg-secondary border-border text-neutral-400 hover:text-foreground'
                    }`}
                  >
                    🔗 Referral Node
                  </button>
                </div>
              </div>

              {/* Strategy Configuration Forms */}
              {hookStrategy === 'SPIN_WHEEL' && (
                <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3 animate-slideDown">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Configure Spin Wheel Prizes</span>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-medium">Prizes List (Comma-separated)</label>
                    <input 
                      type="text" 
                      value={customPrizeInput}
                      onChange={(e) => setCustomPrizeInput(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                    ℹ The circular wheel UI dynamically segments itself to divide degrees equally among elements.
                  </p>
                </div>
              )}

              {hookStrategy === 'SCRATCH_CARD' && (
                <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3 animate-slideDown">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Configure Scratch Reward</span>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-medium">Underlay Promo Coupon Code</label>
                    <select 
                      value={scratchReward}
                      onChange={(e) => setScratchReward(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="BAKERYFREE">BAKERYFREE (100% off Bakery)</option>
                      <option value="COMEBACK20">COMEBACK20 (20% off Order)</option>
                      <option value="COFFEE_LOVER">COFFEE_LOVER ($5 Flat off Coffee)</option>
                      <option value="SPIN_WHEEL_50">SPIN_WHEEL_50 (50% off Order)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
                    ℹ Drag or swipe over the silver card overlay in the simulator. Revealing {'>'}45% of the card automatically claims the code.
                  </p>
                </div>
              )}

              {hookStrategy === 'SOCIAL_SHARE' && (
                <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3 animate-slideDown">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Configure Social Sharing Target</span>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-medium">Selected Social Platform</label>
                    <select 
                      value={socialPlatform}
                      onChange={(e) => setSocialPlatform(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="X (Twitter)">X (formerly Twitter)</option>
                      <option value="Instagram">Instagram Story</option>
                      <option value="WhatsApp Status">WhatsApp Status Share</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">
                    ℹ Users will share pre-configured marketing graphics. Our AI agent verifies the link structure to unlock points.
                  </p>
                </div>
              )}

              {hookStrategy === 'REFERRAL' && (
                <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3 animate-slideDown">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Configure Friend Referral Network</span>
                  
                  <form onSubmit={handleSimulateReferral} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-medium block">Referrer Shopper (+100 Pts)</label>
                        <select 
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
                        >
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-medium block">Referred Friend (+50 Pts)</label>
                        <select 
                          value={referredCustomerId}
                          onChange={(e) => setReferredCustomerId(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
                        >
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={referring || selectedCustomerId === referredCustomerId}
                      className="w-full text-xs font-semibold py-1.5"
                    >
                      {referring ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Simulating referral link transaction...</span>
                        </>
                      ) : (
                        <span>Simulate Referral Relationship Signup</span>
                      )}
                    </Button>
                  </form>

                  {referralSuccessMsg && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg text-[10px] font-semibold">
                      {referralSuccessMsg}
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* Export Configurations block */}
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Gamification Hook Metadata
            </h4>
            <div className="text-[10px] text-neutral-500 font-mono bg-background p-3 rounded-lg border border-border overflow-x-auto leading-relaxed">
              {JSON.stringify({
                strategy: hookStrategy,
                campaignGoal: campaignType,
                targetCustomer: selectedCustomerId,
                params: hookStrategy === 'SPIN_WHEEL' ? { prizes: customPrizeInput.split(',') } : 
                        hookStrategy === 'SCRATCH_CARD' ? { rewardCode: scratchReward } :
                        hookStrategy === 'SOCIAL_SHARE' ? { platform: socialPlatform } : 
                        { referredFriend: referredCustomerId }
              }, null, 2)}
            </div>
            <p className="text-[10px] text-neutral-500 leading-relaxed pt-1">
              ✔ Metadata configuration is prepared. You can launch these hooks inside campaign templates to boost click rates.
            </p>
          </div>

        </div>

        {/* Right Column: Smartphone Mock Simulator - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-purple-500" />
            SaaS Live Sandbox Simulator
          </h3>

          {/* iPhone Wrapper */}
          <div className="w-full max-w-[310px] mx-auto rounded-[38px] border-8 border-neutral-800 bg-gradient-to-b from-slate-900 via-indigo-950 to-neutral-950 aspect-[9/18.5] shadow-2xl relative overflow-hidden flex flex-col justify-start pt-12 pb-6 px-4">
            
            {/* Dynamic Island Speaker pill */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full flex items-center justify-end px-4 z-30">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
            </div>

            {/* Game Screen Content */}
            <div className="flex-1 flex flex-col justify-between py-4 select-none relative z-10 text-white">
              
              {/* Game Header */}
              <div className="text-center space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 rounded-full inline-block">
                  XENO REWARDS CLUB
                </span>
                <h3 className="text-lg font-black tracking-tight font-sans">
                  {hookStrategy === 'SPIN_WHEEL' ? 'Lucky Spin Wheel' :
                   hookStrategy === 'SCRATCH_CARD' ? 'Grab a Treat! 🍪' :
                   hookStrategy === 'SOCIAL_SHARE' ? 'Buzz & Repost' :
                   'Refer Friends'}
                </h3>
                <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                  {hookStrategy === 'SPIN_WHEEL' ? 'Spin the dial below to earn free gifts!' :
                   hookStrategy === 'SCRATCH_CARD' ? 'Scratch the card to reveal your custom discount!' :
                   hookStrategy === 'SOCIAL_SHARE' ? `Post on ${socialPlatform} to unlock point multipliers.` :
                   'Earn rewards for each friend who registers!'}
                </p>
              </div>

              {/* Game Play Area */}
              <div className="flex-1 flex items-center justify-center my-6">
                
                {/* 1. Spin the Wheel Game */}
                {hookStrategy === 'SPIN_WHEEL' && (
                  <div className="flex flex-col items-center space-y-5 relative">
                    {/* Dial pointer indicator */}
                    <div className="absolute top-[-8px] z-20 w-3.5 h-5 bg-red-500" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                    
                    {/* Circular dial */}
                    <div 
                      className="w-36 h-36 rounded-full border-4 border-neutral-800 shadow-xl relative overflow-hidden flex items-center justify-center transition-transform"
                      style={{ 
                        backgroundImage: 'conic-gradient(from 0deg, #f59e0b 0deg 90deg, #3b82f6 90deg 180deg, #10b981 180deg 270deg, #8b5cf6 270deg 360deg)',
                        transform: `rotate(${spinDeg}deg)`,
                        transition: isSpinning ? 'transform 3000ms cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                      }}
                    >
                      {/* Inner Pin */}
                      <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-white z-10 flex items-center justify-center text-[10px] text-white font-bold">
                        ⚡
                      </div>
                    </div>

                    {/* Trigger Button */}
                    <button 
                      onClick={handleSpinWheel}
                      disabled={isSpinning}
                      className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs rounded-full shadow-lg hover:shadow-purple-500/20 active:scale-95 disabled:opacity-50 transition-all duration-200"
                    >
                      {isSpinning ? 'Spinning Dial...' : 'Tap to Spin Wheel'}
                    </button>
                  </div>
                )}

                {/* 2. Scratch Card Game */}
                {hookStrategy === 'SCRATCH_CARD' && (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    
                    {/* Underlying reward wrapper */}
                    <div className="w-full relative aspect-[1.8/1] rounded-2xl overflow-hidden border border-white/10 bg-secondary/45 flex flex-col justify-center items-center p-4">
                      
                      {/* Underlay Content */}
                      <div className="text-center space-y-2 z-0">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Your Revealed Code</span>
                        <code className="text-lg font-black text-purple-400 font-mono tracking-widest block bg-purple-950/40 px-3 py-1 rounded border border-purple-800/30 animate-pulse">
                          {scratchReward}
                        </code>
                        <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest block">
                          ✔ Credited to Shopper!
                        </span>
                      </div>

                      {/* Silver overlay canvas */}
                      <canvas 
                        ref={canvasRef}
                        onMouseDown={handleScratchStart}
                        onMouseMove={handleScratchMove}
                        onMouseUp={handleScratchEnd}
                        onMouseLeave={handleScratchEnd}
                        onTouchStart={handleScratchStart}
                        onTouchMove={handleScratchMove}
                        onTouchEnd={handleScratchEnd}
                        className={`absolute inset-0 cursor-pointer z-10 touch-none rounded-2xl transition-opacity duration-300 ${
                          isScratchedRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        }`}
                      />

                    </div>

                    {/* Refresh Scratch button */}
                    <button 
                      onClick={() => { initScratchCanvas(); setActionSuccessMsg(null); }}
                      className="text-[10px] font-semibold text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Scratch Card</span>
                    </button>
                  </div>
                )}

                {/* 3. Social Buzz Challenge */}
                {hookStrategy === 'SOCIAL_SHARE' && (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    
                    {/* Social Post Graphic */}
                    <div className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold">X</div>
                        <div className="leading-none">
                          <span className="text-[10px] font-bold block text-white">Xeno CRM Cafe</span>
                          <span className="text-[8px] text-neutral-400">@xenocafe</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-neutral-200 leading-normal italic bg-slate-950 p-2.5 border border-white/5 rounded-xl">
                        "Just grabbed my fresh Saturday morning brew at Xeno Cafe! ☕ Use code COFFEE_LOVER for points! #repostToWin"
                      </p>
                    </div>

                    {/* Verification Actions */}
                    <div className="w-full space-y-2">
                      {socialStep === 'IDLE' && (
                        <button 
                          onClick={handleSocialShare}
                          className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Repost & Comment</span>
                        </button>
                      )}

                      {socialStep === 'SHARING' && (
                        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 py-1 font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span>Simulating post redirect...</span>
                        </div>
                      )}

                      {socialStep === 'VERIFYING' && (
                        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 py-1 font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          <span>Verifying buzz engagement...</span>
                        </div>
                      )}

                      {socialStep === 'SUCCESS' && (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-bold text-green-500 block uppercase">✔ Repost Verified!</span>
                          <button 
                            onClick={() => setSocialStep('IDLE')}
                            className="text-[9px] text-neutral-400 underline hover:text-white"
                          >
                            Verify Another Share
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Referral Tree Game */}
                {hookStrategy === 'REFERRAL' && (
                  <div className="flex flex-col items-center space-y-4 w-full text-center">
                    
                    {/* Share Invitation card */}
                    <div className="p-4 bg-secondary/45 border border-white/10 rounded-2xl w-full max-w-[240px] space-y-2 relative overflow-hidden">
                      <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest block">YOUR INVITE CODE</span>
                      <code className="text-sm font-black text-white font-mono tracking-widest block py-1 bg-slate-900 border border-white/5 rounded-lg select-all">
                        XENO-REFP-2026
                      </code>
                      <button 
                        onClick={copyReferralCode}
                        className="py-1 px-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full text-[9px] font-semibold flex items-center justify-center gap-1 mx-auto"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied Link' : 'Copy invite code'}</span>
                      </button>
                    </div>

                    <p className="text-[9px] text-neutral-400 max-w-[200px] leading-relaxed">
                      💡 Invite a friend! Once they register, they get +50 loyalty points, and you credit +100 points instantly.
                    </p>
                  </div>
                )}

              </div>

              {/* Game Footer feedback block */}
              <div className="bg-black/25 border border-white/5 rounded-2xl p-3 text-center text-white/80 min-h-[50px] flex items-center justify-center">
                {wheelResult ? (
                  <div className="space-y-0.5 animate-fadeIn">
                    <p className="text-[10px] font-bold text-green-400">🎉 Congratulations!</p>
                    <p className="text-xs font-black text-white">You won a free: {wheelResult}!</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400 font-medium italic">
                    Tap/scratch in the simulator sandbox above to play the customer retention flow.
                  </p>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
