'use client';

import React, { useEffect } from 'react';
import Sidebar from '../../components/shared/sidebar';
import Navigation from '../../components/shared/navigation';
import { useRouter } from 'next/navigation';
import { useTenant } from '../../lib/authContext';
import { Loader2 } from 'lucide-react';
import { QueueProvider } from '../../lib/queueContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <QueueProvider>
        <div className="flex min-h-screen">
          {/* Persistent Sidebar */}
          <Sidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
            {/* Top Navigation */}
            <Navigation />
            
            {/* Page Content */}
            <main className="flex-1 p-8 bg-background">
              {children}
            </main>
          </div>
        </div>
      </QueueProvider>
  );
}
