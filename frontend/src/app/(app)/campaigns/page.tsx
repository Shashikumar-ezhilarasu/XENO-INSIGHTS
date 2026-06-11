'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Mail, MessageSquare, Zap, Globe } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

export default function CampaignInspirationHub() {
  const router = useRouter();

  const handleTemplateClick = (templateId: string) => {
    router.push(`/segments?template=${templateId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 flex flex-col items-center">
      {/* Global Header / Utility Bar */}
      <div className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-slate-200/60 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">SaaS Security Layer Active</span>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-slate-500 border-slate-200">STABLE</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
          <Globe className="w-4 h-4" />
          <span>🇺🇸 EN</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </div>
      </div>

      <div className="w-full max-w-7xl px-6 py-12 space-y-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-4 py-1.5 font-bold tracking-widest uppercase text-xs">
            Inspiration Gallery
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Ignite Your Marketing Strategy
          </h1>
          <p className="text-base sm:text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
            Explore world-class campaign formats. Select an idea, define your audience, and launch campaigns that convert.
          </p>
          <Button 
            onClick={() => handleTemplateClick('default')}
            size="lg" 
            className="bg-[#0066cc] hover:bg-[#0052cc] text-white shadow-[0_0_20px_rgba(0,102,204,0.3)] transition-all rounded-full px-8 py-6 font-bold text-base hover:-translate-y-0.5"
          >
            <Zap className="w-5 h-5 mr-2" />
            Pick Audience & Start Drafting
          </Button>
        </div>

        {/* Bento Box Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Card 1: Artisan Roast */}
          <motion.div 
            variants={itemVariants}
            onClick={() => handleTemplateClick('artisan_roast')}
            className="md:col-span-2 lg:col-span-2 cursor-pointer group relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 min-h-[300px] flex flex-col justify-end shadow-xl hover:shadow-2xl transition-all duration-300 ease-out"
          >
            {/* Subtle radial gradient background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider">Rich Media</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">VIP</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight group-hover:text-amber-100 transition-colors">Artisan Roast Brand Awareness</h3>
              <p className="text-slate-400 font-medium max-w-md">High-end visual posters designed for WhatsApp & RCS to re-engage VIP spenders.</p>
              <div className="pt-4 flex items-center text-sm font-bold text-amber-400 group-hover:translate-x-2 transition-transform">
                Draft Similar Format <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Neon Pulse Sneaker Launch */}
          <motion.div 
            variants={itemVariants}
            onClick={() => handleTemplateClick('neon_pulse')}
            className="md:col-span-2 lg:col-span-2 cursor-pointer group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-8 min-h-[300px] flex flex-col justify-end shadow-xl hover:shadow-2xl transition-all duration-300 ease-out hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-wider">Social Drop</span>
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-wider">Apparel</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight drop-shadow-md">Neon Pulse Sneaker Launch</h3>
              <p className="text-white/90 font-medium max-w-md drop-shadow-sm">Vibrant, high-energy media blocks for new product announcements.</p>
              
              {/* Hover Button Overlay */}
              <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="px-4 py-2 bg-white text-indigo-600 font-bold rounded-full text-sm shadow-lg flex items-center">
                  Draft Format <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Email Newsletter */}
          <motion.div 
            variants={itemVariants}
            onClick={() => handleTemplateClick('email_newsletter')}
            className="md:col-span-1 lg:col-span-2 cursor-pointer group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 min-h-[250px] flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300 ease-out"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                <Mail className="w-6 h-6 text-slate-500" />
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider border border-slate-200">Long-form retention</span>
            </div>
            
            {/* Wireframe Mockup */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="180" height="130" rx="8" stroke="currentColor" strokeWidth="4"/>
                <rect x="30" y="30" width="140" height="20" rx="4" fill="currentColor"/>
                <rect x="30" y="60" width="100" height="10" rx="4" fill="currentColor"/>
                <rect x="30" y="80" width="120" height="10" rx="4" fill="currentColor"/>
                <rect x="30" y="110" width="60" height="20" rx="10" fill="currentColor"/>
              </svg>
            </div>

            <div className="space-y-2 relative z-10">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Email Newsletter</h3>
              <div className="flex items-center text-sm font-bold text-slate-500 group-hover:text-blue-600">
                Use Email Template <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Card 4: Direct Chat / SMS */}
          <motion.div 
            variants={itemVariants}
            onClick={() => handleTemplateClick('direct_chat')}
            className="md:col-span-1 lg:col-span-2 cursor-pointer group relative overflow-hidden rounded-3xl bg-blue-50/50 border border-blue-100 p-8 min-h-[250px] flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300 ease-out"
          >
            <div className="flex flex-wrap gap-2 items-start justify-end w-full mb-8">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">High conversion</span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Low latency</span>
            </div>

            {/* Overlapping Chat Bubbles Mockup */}
            <div className="absolute left-8 top-8 opacity-30 group-hover:opacity-60 transition-opacity flex flex-col gap-2">
              <div className="w-24 h-8 bg-blue-200 rounded-2xl rounded-tl-sm" />
              <div className="w-16 h-8 bg-blue-300 rounded-2xl rounded-br-sm self-end translate-x-12" />
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Direct Chat / SMS</h3>
              </div>
              <div className="flex items-center text-sm font-bold text-slate-500 group-hover:text-blue-600 pt-2">
                Use Chat Template <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
