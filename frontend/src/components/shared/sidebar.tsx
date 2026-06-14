'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Send, BarChart2, Trophy, UserCircle2, Bot, Zap, Settings, LogOut, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useQueue } from '../../lib/queueContext';
import { useTenant } from '../../lib/authContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isProcessing } = useQueue();
  const { logout } = useTenant();

  const navGroups = [
    {
      title: 'CRM',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Customers', href: '/customers', icon: UserCircle2 },
        { name: 'Campaigns', href: '/campaigns', icon: Send },
        { name: 'AI Command Center', href: '/campaigns/command', icon: Bot },
        { name: 'Analytics', href: '/analytics', icon: BarChart2 },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Campaign Delivery Simulator', href: '/simulator', icon: Activity },
      ]
    },
    {
      title: 'Workspace',
      items: [
        { name: 'Business Profile', href: '/workspace/profile', icon: Trophy },
        { name: 'Team', href: '/team', icon: UserCircle2 },
        { name: 'Settings', href: '/settings', icon: Settings, pulse: true },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border space-x-3">
        <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">
          X
        </div>
        <div>
          <span className="font-semibold text-foreground tracking-tight block">XENO</span>
          <span className="text-[10px] text-neutral-500 block -mt-1.5 font-medium">SaaS Marketing CRM</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-200 group',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-neutral-500 hover:text-foreground hover:bg-secondary/40'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 transition duration-200',
                        isActive ? 'text-foreground' : 'text-neutral-500 group-hover:text-foreground'
                      )}
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.pulse && isProcessing && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout & Footer Info */}
      <div className="mt-auto">
        <div className="px-4 pb-4">
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium transition duration-200 text-neutral-500 hover:text-red-400 hover:bg-red-400/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
        <div className="p-4 border-t border-border bg-secondary/20">
          <div className="flex items-center space-x-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-neutral-500 font-mono font-semibold tracking-wider">STABLE API CONNECTION</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
