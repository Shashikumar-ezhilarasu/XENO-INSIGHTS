import './globals.css';
import React from 'react';
import Sidebar from '../components/shared/sidebar';
import Navigation from '../components/shared/navigation';
import { SharedStateProvider } from '../hooks/useSharedState';

export const metadata = {
  title: 'XENO AI SaaS Marketing CRM',
  description: 'AI-Native Customer Engagement and Marketing Segmentation CRM Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-foreground selection:text-background min-h-screen">
        <SharedStateProvider>
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
        </SharedStateProvider>
      </body>
    </html>
  );
}
