'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, RefreshCw, ShieldCheck, Globe } from 'lucide-react';
import { useSharedState } from '../../hooks/useSharedState';

export default function Navigation() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const { language, setLanguage } = useSharedState();

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold px-2.5 py-1 bg-secondary text-foreground rounded-md border border-border flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>SaaS Security Layer Active</span>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Language dropdown in header */}
        <div className="flex items-center gap-1.5 bg-secondary/35 border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus-within:border-purple-500/50 transition">
          <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent outline-none text-xs font-semibold text-foreground cursor-pointer focus:outline-none"
          >
            <option value="EN" className="bg-card">🇺🇸 EN</option>
            <option value="ES" className="bg-card">🇪🇸 ES</option>
            <option value="TA" className="bg-card">🇮🇳 TA</option>
            <option value="HI" className="bg-card">🇮🇳 HI</option>
            <option value="FR" className="bg-card">🇫🇷 FR</option>
          </select>
        </div>

        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          className="p-2 text-neutral-500 hover:text-foreground rounded-lg hover:bg-secondary transition"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sync Indicator */}
        <div className="flex items-center space-x-2 border-l border-border pl-4 h-5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-neutral-500 font-mono font-semibold">STABLE</span>
        </div>
      </div>
    </header>
  );
}
