import './globals.css';
import React from 'react';
import { SharedStateProvider } from '../hooks/useSharedState';
import { SimulationProvider } from '../components/SimulationProvider';

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
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-foreground selection:text-background min-h-screen">
        <SharedStateProvider>
          <SimulationProvider>
            {children}
          </SimulationProvider>
        </SharedStateProvider>
      </body>
    </html>
  );
}
