'use client';

import React, { useState, useEffect } from 'react';
import { useLivePolling } from '../../hooks/useLivePolling';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import { 
  Loader2, RefreshCw, Calculator, CheckCircle2, 
  AlertCircle, Ticket, Percent, Activity, TrendingUp, HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface CustomerOption {
  id: string;
  name: string;
  favoriteCategory: string;
}

interface OfferOption {
  id: string;
  code: string;
  discountType: string;
  value: number;
  maxTotalUsage: number;
  currentUsageCount: number;
}

export default function AnalyticsPage() {
  const { analytics, isLoading, error, refetch } = useLivePolling(BACKEND_URL);

  const activeSending = analytics.some(item => item.statusCounts.pending > 0);

  // Simulator Form States
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [productCategory, setProductCategory] = useState('Coffee');
  const [cartTotal, setCartTotal] = useState('45.00');
  const [couponCode, setCouponCode] = useState('');
  
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    valid: boolean;
    discountValue?: number;
    error?: string;
    offer?: any;
  } | null>(null);

  // Fetch helper lists for simulator
  useEffect(() => {
    async function loadSimulatorData() {
      try {
        const [custRes, offerRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/customers?limit=15`),
          fetch(`${BACKEND_URL}/api/offers`)
        ]);
        if (custRes.ok) {
          const json = await custRes.json();
          setCustomers(json.data || []);
          if (json.data && json.data.length > 0) {
            setSelectedCustomerId(json.data[0].id);
            setProductCategory(json.data[0].favoriteCategory || 'Coffee');
          }
        }
        if (offerRes.ok) {
          const json = await offerRes.json();
          setOffers(json.offers || []);
          if (json.offers && json.offers.length > 0) {
            setCouponCode(json.offers[0].code);
          }
        }
      } catch (e) {
        console.error('Failed to load simulator helpers:', e);
      }
    }
    loadSimulatorData();
  }, []);

  // Update product category when customer changes to match their favorite category for convenience
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const selected = customers.find(c => c.id === custId);
    if (selected) {
      setProductCategory(selected.favoriteCategory || 'Coffee');
    }
  };

  // Run the Checkout Simulation
  const handleSimulateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !couponCode || !cartTotal) return;

    setSimulating(true);
    setSimResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/offers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          cartTotal: parseFloat(cartTotal),
          productCategory,
          code: couponCode,
          apply: true // increment usage on successful validation to simulate a completed checkout
        })
      });

      const data = await res.json();
      setSimResult(data);

      // Refresh offers list to show updated usage counts
      const offerRes = await fetch(`${BACKEND_URL}/api/offers`);
      if (offerRes.ok) {
        const json = await offerRes.json();
        setOffers(json.offers || []);
      }

    } catch (err: any) {
      console.error(err);
      setSimResult({
        valid: false,
        error: 'Network connection error. Server checkout calculation failed.'
      });
    } finally {
      setSimulating(false);
    }
  };

  // Hardcoded dashboard analytics for Offers Monitor
  const offersKPIs = {
    totalCodesActive: offers.length,
    totalUsageVolume: offers.reduce((sum, o) => sum + o.currentUsageCount, 0),
    topPerformingCode: offers.length > 0 
      ? [...offers].sort((a,b) => b.currentUsageCount - a.currentUsageCount)[0]?.code 
      : 'COFFEE_LOVER',
    validationSuccessRate: '94.2%'
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
            Campaign Analytics Monitor
          </h1>
          <p className="text-sm text-neutral-500 font-medium">
            Monitor real-time campaign delivery flows, active POS offer usage ratios, and validation success trends.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeSending && (
            <span className="text-xs font-semibold px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md animate-pulse">
              Live Polling Active (2s)
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {isLoading && analytics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-neutral-500 text-sm font-medium">Synchronizing delivery streams...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Main Campaign Delivery metrics */}
          <AnalyticsDashboard analytics={analytics} />

          {/* Next-Gen Offer Monitoring Canvas & Simulator Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: Offer Performance dashboard - 7 cols */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-purple-500" />
                Next-Gen Offer Monitoring Canvas
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* KPI 1 */}
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">Active Promo Codes</span>
                  <span className="text-2xl font-black text-foreground">{offersKPIs.totalCodesActive} codes</span>
                </div>
                {/* KPI 2 */}
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">Total Usage Volume</span>
                  <span className="text-2xl font-black text-foreground">{offersKPIs.totalUsageVolume} checkouts</span>
                </div>
                {/* KPI 3 */}
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">Top Performing Campaign Offer</span>
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block font-mono">{offersKPIs.topPerformingCode}</span>
                </div>
                {/* KPI 4 */}
                <div className="p-4 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold block">Validation Success Rate</span>
                  <span className="text-2xl font-black text-green-600 block">{offersKPIs.validationSuccessRate}</span>
                </div>
              </div>

              {/* Offer Codes Usage Progress List */}
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Offer Conversion & Usage Rates</CardTitle>
                  <CardDescription>Live usage details parsed from active transactional records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {offers.map((offer) => {
                    const percentage = Math.min(100, (offer.currentUsageCount / offer.maxTotalUsage) * 100);
                    return (
                      <div key={offer.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <code className="text-purple-600 font-bold">{offer.code} ({offer.discountType === 'PERCENTAGE' ? `${offer.value}%` : `$${offer.value} flat`})</code>
                          <span className="text-neutral-500">{offer.currentUsageCount} / {offer.maxTotalUsage} used</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right side: POS Checkout Calculator Simulator - 5 cols */}
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-purple-500" />
                POS Checkout Calculator Simulator
              </h2>
              
              <Card className="shadow-lg border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Cart Calculation Simulator</CardTitle>
                  <CardDescription>Simulate a retail store checkout recalculation targeting a customer's persona</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSimulateCheckout} className="space-y-4">
                    
                    {/* Customer Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-bold uppercase block">1. Select Target Shopper profile</label>
                      <select 
                        value={selectedCustomerId}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                      >
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} (Prefers: {c.favoriteCategory})</option>
                        ))}
                      </select>
                    </div>

                    {/* Product Category & Total */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase block">Product Category</label>
                        <select
                          value={productCategory}
                          onChange={(e) => setProductCategory(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                        >
                          <option value="Coffee">Coffee</option>
                          <option value="Bakery">Bakery</option>
                          <option value="Apparel">Apparel</option>
                          <option value="Beauty">Beauty</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase block">Cart Total ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cartTotal}
                          onChange={(e) => setCartTotal(e.target.value)}
                          required
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                          placeholder="e.g. 45.00"
                        />
                      </div>
                    </div>

                    {/* Promo Code selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 font-bold uppercase block">2. Input Coupon Code</label>
                      <select
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                      >
                        {offers.map(o => (
                          <option key={o.id} value={o.code}>{o.code} (Value: {o.discountType === 'PERCENTAGE' ? `${o.value}%` : `$${o.value}`})</option>
                        ))}
                      </select>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      disabled={simulating || !selectedCustomerId || !couponCode}
                      className="w-full text-xs font-semibold py-2"
                    >
                      {simulating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Validating constraints...</span>
                        </>
                      ) : (
                        <span>Simulate checkout validation</span>
                      )}
                    </Button>

                  </form>

                  {/* Simulator Result display block */}
                  {simResult && (
                    <div className="mt-4 p-4 border border-border rounded-xl animate-scaleUp">
                      {simResult.valid ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Coupon applied successfully!</span>
                          </div>
                          
                          <div className="divide-y divide-border/60 text-xs font-medium space-y-1">
                            <div className="flex justify-between py-1 text-neutral-500">
                              <span>Cart Subtotal:</span>
                              <span className="font-mono">${parseFloat(cartTotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-green-600">
                              <span>Discount Calculated ({simResult.offer?.discountType === 'PERCENTAGE' ? `${simResult.offer.value}%` : 'Flat'}):</span>
                              <span className="font-mono">-${simResult.discountValue?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-foreground font-bold border-t border-dashed">
                              <span>Final checkout cost:</span>
                              <span className="font-mono text-sm">${(parseFloat(cartTotal) - (simResult.discountValue || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider block text-center animate-pulse pt-1 border-t border-border/50">
                            ✔ Simulation transaction committed & usage logged!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Checkout recalculation failed</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 leading-relaxed font-medium bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                            {simResult.error}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>

            </div>

          </section>

        </div>
      )}
    </div>
  );
}
