/**
 * @file authContext.tsx
 * @module lib/authContext
 * @description
 * Global auth context for XENO-INSIGHTS frontend.
 * Stores JWT token in localStorage (key: xeno_auth_token).
 * Stores tenant profile in localStorage (key: xeno_tenant_profile).
 * Exposes: tenant, isAuthenticated, login(), logout(), updatePreferences()
 *
 * CONSUMED BY: Every page via useTenant() hook
 * ON LOGIN: Reads brandCategory from profile and writes to xeno_brand_category
 *   so brandCategory.ts continues to work without changes.
 * ON LOGOUT: Clears all xeno_* localStorage keys and redirects to /login
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TenantProfile {
  id: string;
  email: string;
  brandName: string;
  brandCategory: string;
  accentColor: string;
  language: string;
  planTier: string;
  campaignLimit: number;
  aiCallLimit: number;
  aiCallsUsed: number;
  campaignsCreated: number;
  onboardingDone: boolean;
  preferences: {
    brandVoice: string;
    defaultChannel: string;
    kpiPrimaryLabel: string;
    kpiRevenueLabel: string;
    kpiCustomerLabel: string;
    productLabels: Record<string, string>;
    defaultSpinPrizes: string;
    primaryCampaignGoal: string;
    dbUri?: string;
  } | null;
}

interface AuthContextType {
  tenant: TenantProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (prefs: Partial<TenantProfile['preferences']>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    // Rehydrate from localStorage on mount
    const storedToken = localStorage.getItem('xeno_auth_token');
    const storedProfile = localStorage.getItem('xeno_tenant_profile');
    if (storedToken && storedProfile) {
      setToken(storedToken);
      const profile = JSON.parse(storedProfile);
      setTenant(profile);
      // Sync brandCategory for brandCategory.ts compatibility
      localStorage.setItem('xeno_brand_category', profile.brandCategory);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('xeno_auth_token', data.token);
    localStorage.setItem('xeno_tenant_profile', JSON.stringify(data));
    localStorage.setItem('xeno_brand_category', data.brandCategory);
    localStorage.setItem('xeno_has_data', 'true');
    setToken(data.token);
    setTenant(data);
  };

  const logout = () => {
    ['xeno_auth_token', 'xeno_tenant_profile', 'xeno_brand_category',
     'xeno_ai_logs', 'xeno_ai_call_count', 'xeno_token_total', 'xeno_token_log']
      .forEach(k => localStorage.removeItem(k));
    setToken(null);
    setTenant(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (!token) return;
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('xeno_tenant_profile', JSON.stringify(data));
      localStorage.setItem('xeno_brand_category', data.brandCategory);
      setTenant(data);
    }
  };

  const updatePreferences = async (prefs: any) => {
    if (!token) return;
    await fetch(`${BACKEND}/api/tenant/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(prefs),
    });
    await refreshProfile();
  };

  return (
    <AuthContext.Provider value={{
      tenant, token, isAuthenticated: !!tenant, isLoading,
      login, logout, updatePreferences, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useTenant must be used within AuthProvider');
  return ctx;
}
