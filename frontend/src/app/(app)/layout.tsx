import React from 'react';
import Sidebar from '../../components/shared/sidebar';
import Navigation from '../../components/shared/navigation';
import AuthGuard from '../../components/AuthGuard';
import { QueueProvider } from '../../lib/queueContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
