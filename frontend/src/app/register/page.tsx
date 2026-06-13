'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '../../lib/authContext';
import { Sparkles, ArrowRight, Loader2, Coffee, ShoppingBag, UtensilsCrossed, Shirt, Sparkle, Gem } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'coffee_cafe', label: 'Coffee & Cafe', icon: Coffee, color: 'text-amber-700', bg: 'bg-amber-700/10' },
  { id: 'retail', label: 'Retail & E-commerce', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'food_beverage', label: 'Food & Beverage', icon: UtensilsCrossed, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'fashion_apparel', label: 'Fashion & Apparel', icon: Shirt, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'beauty_cosmetics', label: 'Beauty & Cosmetics', icon: Sparkle, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'jewelry_accessories', label: 'Jewelry & Accessories', icon: Gem, color: 'text-yellow-600', bg: 'bg-yellow-600/10' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useTenant(); // We don't use login() here, we fetch manually after register
  
  const [step, setStep] = useState(1);
  const [brandCategory, setBrandCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };
  const strength = calculateStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (strength < 50) {
      return setError('Password is too weak');
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, brandName, brandCategory }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }

      const data = await res.json();
      // Store credentials directly just like login
      localStorage.setItem('xeno_auth_token', data.token);
      localStorage.setItem('xeno_brand_category', data.brandCategory);
      
      // We must fetch full profile manually here because register only returns a subset
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      if (meRes.ok) {
        const profile = await meRes.json();
        localStorage.setItem('xeno_tenant_profile', JSON.stringify(profile));
      }
      
      // Hard redirect to dashboard so context mounts with the new token
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0a0a0a] text-neutral-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center items-center gap-2 mb-6">
          <Sparkles className="w-8 h-8 text-[#6366F1]" />
          <span className="text-3xl font-display font-bold tracking-tight text-white">XENO</span>
        </div>
        <h2 className="mt-2 text-center text-xl font-medium text-neutral-400">
          Create your brand account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#141414] py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-neutral-800">
          {error && (
            <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h3 className="text-lg font-bold text-white">Select Your Industry</h3>
                <p className="text-sm text-neutral-500 mt-1">This sets up your AI models and KPI tracking.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = brandCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setBrandCategory(cat.id)}
                      className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? `border-[#6366F1] bg-[#6366F1]/10`
                          : `border-neutral-800 bg-neutral-900/50 hover:border-neutral-700`
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!brandCategory}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#6366F1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] focus:ring-offset-[#141414] transition disabled:opacity-50 mt-8"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <div>
                <label className="block text-sm font-medium text-neutral-300">Brand Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300">Admin Email</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300">Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
                  />
                </div>
                {/* Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 flex gap-1 h-1.5">
                    {[25, 50, 75, 100].map((threshold) => (
                      <div
                        key={threshold}
                        className={`flex-1 rounded-full ${
                          strength >= threshold
                            ? strength < 50
                              ? 'bg-red-500'
                              : strength < 100
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300">Confirm Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 flex justify-center items-center py-2.5 px-4 border border-neutral-700 rounded-lg shadow-sm text-sm font-medium text-neutral-300 bg-transparent hover:bg-neutral-800 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || strength < 50}
                  className="w-2/3 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#6366F1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] focus:ring-offset-[#141414] transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#6366F1] hover:text-[#818cf8] transition">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
