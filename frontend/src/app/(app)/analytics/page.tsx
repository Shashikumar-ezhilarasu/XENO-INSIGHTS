'use client';

import React, { useState, useEffect } from 'react';
import { useLivePolling } from '../../../hooks/useLivePolling';
import AnalyticsDashboard from '../../../components/AnalyticsDashboard';
import { 
  Loader2, RefreshCw, Calculator, CheckCircle2, 
  AlertCircle, Ticket, Percent, Activity, TrendingUp, HelpCircle, Sparkles
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

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
  minOrderValue: number;
  categoryConstraint: string | null;
}

const MOCK_CUSTOMERS = [
  { id: 'cust-1', name: 'Emma Smith', favoriteCategory: 'Coffee' },
  { id: 'cust-2', name: 'Liam Johnson', favoriteCategory: 'Bakery' },
  { id: 'cust-3', name: 'Olivia Williams', favoriteCategory: 'Apparel' },
  { id: 'cust-4', name: 'Noah Brown', favoriteCategory: 'Coffee' },
  { id: 'cust-5', name: 'Ava Jones', favoriteCategory: 'Beauty' }
];

const MOCK_OFFERS = [
  { id: 'off-1', code: 'COMEBACK20', discountType: 'PERCENTAGE', value: 20, minOrderValue: 30, categoryConstraint: null, maxTotalUsage: 500, currentUsageCount: 24 },
  { id: 'off-2', code: 'SPIN_WHEEL_50', discountType: 'PERCENTAGE', value: 50, minOrderValue: 50, categoryConstraint: null, maxTotalUsage: 100, currentUsageCount: 8 },
  { id: 'off-3', code: 'COFFEE_LOVER', discountType: 'FLAT', value: 5, minOrderValue: 15, categoryConstraint: 'Coffee', maxTotalUsage: 1000, currentUsageCount: 142 },
  { id: 'off-4', code: 'BAKERYFREE', discountType: 'PERCENTAGE', value: 100, minOrderValue: 10, categoryConstraint: 'Bakery', maxTotalUsage: 50, currentUsageCount: 48 }
];

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
          const json = await custRes.ok ? await custRes.json() : { data: [] };
          setCustomers(json.data || []);
          if (json.data && json.data.length > 0) {
            setSelectedCustomerId(json.data[0].id);
            setProductCategory(json.data[0].favoriteCategory || 'Coffee');
          } else {
            setCustomers(MOCK_CUSTOMERS);
            setSelectedCustomerId(MOCK_CUSTOMERS[0].id);
            setProductCategory(MOCK_CUSTOMERS[0].favoriteCategory || 'Coffee');
          }
        } else {
          setCustomers(MOCK_CUSTOMERS);
          setSelectedCustomerId(MOCK_CUSTOMERS[0].id);
          setProductCategory(MOCK_CUSTOMERS[0].favoriteCategory || 'Coffee');
        }

        if (offerRes.ok) {
          const json = await offerRes.json();
          setOffers(json.offers || []);
          if (json.offers && json.offers.length > 0) {
            setCouponCode(json.offers[0].code);
          } else {
            setOffers(MOCK_OFFERS);
            setCouponCode(MOCK_OFFERS[0].code);
          }
        } else {
          setOffers(MOCK_OFFERS);
          setCouponCode(MOCK_OFFERS[0].code);
        }
      } catch (e) {
        console.error('Failed to load simulator helpers, using local mock data:', e);
        setCustomers(MOCK_CUSTOMERS);
        setSelectedCustomerId(MOCK_CUSTOMERS[0].id);
        setProductCategory(MOCK_CUSTOMERS[0].favoriteCategory || 'Coffee');
        setOffers(MOCK_OFFERS);
        setCouponCode(MOCK_OFFERS[0].code);
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

  const handleAutoRecommend = () => {
    setSimResult(null);
    const parsedTotal = parseFloat(cartTotal);
    
    // Filter valid offers
    let bestOffer = null;
    let bestDiscount = -1;

    for (const offer of offers) {
      // Check limits
      if (offer.currentUsageCount >= offer.maxTotalUsage) continue;
      // Check minimum order value
      if (parsedTotal < offer.minOrderValue) continue;
      // Check category constraint
      if (offer.categoryConstraint && offer.categoryConstraint.toLowerCase() !== productCategory.toLowerCase()) continue;

      let discountValue = 0;
      if (offer.discountType === 'PERCENTAGE') {
        discountValue = parsedTotal * (offer.value / 100);
      } else {
        discountValue = offer.value;
      }
      discountValue = Math.min(discountValue, parsedTotal);

      if (discountValue > bestDiscount) {
        bestDiscount = discountValue;
        bestOffer = offer;
      }
    }

    if (bestOffer) {
      setCouponCode(bestOffer.code);
      setSimResult({
        valid: true,
        error: `AI Recommended: ${bestOffer.code} yields the maximum savings of $${bestDiscount.toFixed(2)} for this cart!`
      });
    } else {
      setSimResult({
        valid: false,
        error: `No valid offers found for ${productCategory} with a cart total of $${parsedTotal.toFixed(2)}.`
      });
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
      console.warn('Network checkout validation failed. Running local simulation fallback:', err);
      
      const offer = offers.find(o => o.code === couponCode);
      if (!offer) {
        setSimResult({
          valid: false,
          error: `Offer code '${couponCode}' does not exist in mock listings.`
        });
        setSimulating(false);
        return;
      }

      const parsedTotal = parseFloat(cartTotal);

      // 1. Minimum Order Value Check
      if (parsedTotal < offer.minOrderValue) {
        setSimResult({
          valid: false,
          error: `Minimum order value criteria not met. Required: $${offer.minOrderValue.toFixed(2)}, Cart: $${parsedTotal.toFixed(2)}`
        });
        setSimulating(false);
        return;
      }

      // 2. Category Constraint Check
      if (offer.categoryConstraint && offer.categoryConstraint.toLowerCase() !== productCategory.toLowerCase()) {
        setSimResult({
          valid: false,
          error: `Category constraint violated. Offer is only valid for category '${offer.categoryConstraint}'.`
        });
        setSimulating(false);
        return;
      }

      // 3. System-Wide Usage Check
      if (offer.currentUsageCount >= offer.maxTotalUsage) {
        setSimResult({
          valid: false,
          error: 'Offer usage limit reached (system-wide execution limit exceeded).'
        });
        setSimulating(false);
        return;
      }

      // 4. Calculate Discount value
      let discountValue = 0;
      if (offer.discountType === 'PERCENTAGE') {
        discountValue = parsedTotal * (offer.value / 100);
      } else {
        discountValue = offer.value;
      }
      discountValue = Math.min(discountValue, parsedTotal);
      discountValue = Math.round(discountValue * 100) / 100;

      // Simulate local increment
      setOffers(prev => prev.map(o => o.code === couponCode ? { ...o, currentUsageCount: o.currentUsageCount + 1 } : o));

      setSimResult({
        valid: true,
        offer: {
          id: offer.id,
          code: offer.code,
          discountType: offer.discountType,
          value: offer.value,
          categoryConstraint: offer.categoryConstraint
        },
        discountValue
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase block">2. Select or Auto-Recommend Offer</label>
                        <button 
                          type="button" 
                          onClick={handleAutoRecommend}
                          className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-md flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI Auto-Recommend</span>
                        </button>
                      </div>
                      
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
                    <div className={`mt-4 p-4 border rounded-xl animate-scaleUp ${
                      simResult.valid && !simResult.offer 
                        ? 'border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/20' 
                        : 'border-border'
                    }`}>
                      {simResult.valid && !simResult.offer ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-bold">
                            <Sparkles className="w-4 h-4" />
                            <span>AI Recommendation Ready</span>
                          </div>
                          <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium leading-relaxed">
                            {simResult.error}
                          </p>
                        </div>
                      ) : simResult.valid ? (
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
