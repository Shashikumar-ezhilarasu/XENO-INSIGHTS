'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Lightfall from '../components/Lightfall';
import MagicBento from '../components/MagicBento';
import { Button } from '../components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black text-white flex flex-col items-center">
      {/* Background Lightfall Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Lightfall
          colors={['#A6C8FF', '#5227FF', '#eee8ee']}
          backgroundColor="#0A29FF"
          speed={2.2}
          streakCount={2}
          streakWidth={1}
          streakLength={0.8}
          glow={1}
          density={0.4}
          twinkle={0.85}
          zoom={3}
          backgroundGlow={0.2}
          opacity={1}
          mouseInteraction={false}
          mouseStrength={1}
          mouseRadius={0.8}
        />
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80 z-1" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center text-center mt-32 px-4 space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xl mb-4 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-sm font-medium text-purple-100">AI-Native Marketing Infrastructure</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-2xl leading-tight">
          SaaS Customer Engagement <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-blue-300 to-indigo-300">Reimagined.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-300 font-medium max-w-2xl drop-shadow-md">
          Track behavior, analyze segments, and launch automated campaigns with our enterprise-grade AI engine.
        </p>
        
        <div className="pt-8 pb-16">
          <Button 
            onClick={() => {
              localStorage.removeItem('xeno_has_seen_tour');
              router.push('/dashboard');
            }}
            size="lg"
            className="rounded-full bg-white text-black hover:bg-neutral-200 hover:scale-105 transition-all duration-300 px-8 py-6 text-lg font-bold shadow-[0_0_40px_rgba(132,0,255,0.4)]"
          >
            Enter Dashboard <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Features Showcase */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Enterprise Capabilities</h2>
          <p className="text-neutral-400">Everything you need to scale your marketing operations.</p>
        </div>
        
        {/* React Bits: MagicBento Component */}
        <MagicBento 
          textAutoHide={false}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          spotlightRadius={400}
          particleCount={15}
          glowColor="132, 0, 255"
        />
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/50 backdrop-blur-md py-8 text-center text-neutral-500 text-sm">
        <p>&copy; {new Date().getFullYear()} XENO AI. All rights reserved.</p>
      </footer>
    </main>
  );
}
