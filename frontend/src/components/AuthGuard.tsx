'use client';

import React, { useState, useEffect } from 'react';
import { Lock, User, KeyRound, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Check login state on mount
  useEffect(() => {
    try {
      const authState = localStorage.getItem('xeno_authenticated');
      if (authState === 'true') {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('LocalStorage not available:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormSubmitting(true);

    // Simulate small delay for premium authenticating feedback
    setTimeout(() => {
      if (username.trim() === 'student' && password === 'srm@2026') {
        setIsAuthenticated(true);
        if (rememberMe) {
          localStorage.setItem('xeno_authenticated', 'true');
        }
      } else {
        setError('Invalid username or password. Please verify the credentials.');
      }
      setFormSubmitting(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('xeno_authenticated');
    localStorage.removeItem('xeno_onboarded');
    setUsername('');
    setPassword('');
  };

  // Expose logout action to window object for convenient demonstration/audit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).xenoLogout = handleLogout;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).xenoLogout;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        <p className="text-neutral-500 text-sm font-medium">Authorizing guest session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen flex">
        {/* Floating Logout Button in layout corner for quick resets */}
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleLogout}
            className="text-[10px] font-bold tracking-wider uppercase bg-secondary/80 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-border px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-xs transition duration-200"
          >
            Sign Out
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-4 overflow-hidden select-none">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main glassmorphism container card */}
      <div className="w-full max-w-md bg-card/40 backdrop-blur-md border border-border/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-scaleUp z-10">
        
        {/* Header logo / branding */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold text-xl shadow-lg relative group">
            <span className="relative z-10">X</span>
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xs group-hover:blur-md transition" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight font-sans text-foreground">
              XENO AI SaaS CRM
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Guest Security Gate & Academic Demo Environment
            </p>
          </div>
        </div>

        {/* Error Notification banner */}
        {error && (
          <div className="p-3.5 mb-6 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Username</label>
            <div className="relative flex items-center bg-secondary/35 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-neutral-400 transition">
              <User className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (student)"
                className="w-full bg-transparent outline-none text-xs text-foreground placeholder-neutral-500 font-medium"
                required
                disabled={formSubmitting}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Password</label>
            <div className="relative flex items-center bg-secondary/35 border border-border rounded-xl px-3.5 py-2.5 focus-within:border-neutral-400 transition">
              <KeyRound className="w-4 h-4 text-neutral-500 mr-2.5 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (srm@2026)"
                className="w-full bg-transparent outline-none text-xs text-foreground placeholder-neutral-500 font-medium"
                required
                disabled={formSubmitting}
              />
            </div>
          </div>

          {/* Remember Me toggle */}
          <div className="flex items-center space-x-2 py-1 select-none">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500 bg-secondary"
              disabled={formSubmitting}
            />
            <label htmlFor="remember" className="text-xs text-neutral-500 font-semibold cursor-pointer">
              Remember active session on this browser
            </label>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={formSubmitting || !username.trim() || !password}
            className="w-full font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-purple-600/10 flex items-center justify-center gap-1.5"
          >
            {formSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Verify & Unlock SaaS Console</span>
              </>
            )}
          </Button>

        </form>

        {/* Hint Box */}
        <div className="mt-6 pt-4 border-t border-border/40 text-center">
          <p className="text-[10px] text-neutral-500 font-medium leading-relaxed bg-secondary/25 p-2 rounded-lg border border-border/25">
            🔑 **Developer Credentials Hint:**<br/>
            Username: <code className="font-bold text-neutral-400">student</code> &nbsp;|&nbsp; Password: <code className="font-bold text-neutral-400">srm@2026</code>
          </p>
        </div>

      </div>
    </div>
  );
}
