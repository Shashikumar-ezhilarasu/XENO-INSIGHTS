'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Navigation() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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
