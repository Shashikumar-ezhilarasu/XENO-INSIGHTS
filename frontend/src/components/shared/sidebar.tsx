'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Send, BarChart2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'AI Segments', href: '/segments', icon: Users },
    { name: 'Campaign Manager', href: '/campaigns', icon: Send },
    { name: 'Analytics Monitor', href: '/analytics', icon: BarChart2 },
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
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
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
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-secondary/20">
        <div className="flex items-center space-x-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-neutral-500 font-mono font-semibold tracking-wider">STABLE API CONNECTION</span>
        </div>
      </div>
    </aside>
  );
}
