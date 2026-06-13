'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '../../lib/authContext';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useTenant();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
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
          Sign in to your brand account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#141414] py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-neutral-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-neutral-300">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg shadow-sm bg-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
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
                  className="appearance-none block w-full px-3 py-2 border border-neutral-800 rounded-lg shadow-sm bg-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] sm:text-sm text-white"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#6366F1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366F1] focus:ring-offset-[#141414] transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-semibold text-[#6366F1] hover:text-[#818cf8] transition flex items-center justify-center gap-1 mt-2">
                Register your brand <ArrowRight className="w-4 h-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
