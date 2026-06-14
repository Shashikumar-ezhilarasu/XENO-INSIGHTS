'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Orb from '../components/Orb';
import MagicBento from '../components/MagicBento';
import { Button } from '../components/ui/button';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const valuePropCards = [
  { color: '#120F17', title: '🤖 AI Command Center', description: 'Transform business goals into actionable marketing strategies. AI recommends audiences, channels, offers, and campaign content based on customer behavior.', label: 'Strategy' },
  { color: '#120F17', title: '🎯 Intelligent Audience Segmentation', description: 'Create customer segments using natural language. Discover dormant buyers, VIP shoppers, loyalty members, and high-value audiences instantly.', label: 'Targeting' },
  { color: '#120F17', title: '🚀 Campaign Orchestration', description: 'Generate personalized campaigns and launch them across WhatsApp, SMS, Email, and RCS from a single workspace.', label: 'Execution' },
  { color: '#120F17', title: '⚡ Event-Driven Infrastructure', description: 'Powered by BullMQ, Redis, asynchronous workers, retries, and webhook processing for enterprise-grade reliability.', label: 'Reliability' },
  { color: '#120F17', title: '📊 Analytics & Attribution', description: 'Measure campaign performance through delivery, engagement, conversion, and revenue attribution metrics.', label: 'Insights' },
  { color: '#120F17', title: '🔄 Delivery Lifecycle Simulation', description: 'Observe the complete communication lifecycle from SENT to CONVERTED through a realistic webhook-driven architecture.', label: 'Observability' }
];

const platformModuleCards = [
  { color: '#120F17', title: 'Dashboard', description: 'Business health, campaign performance, and AI insights.', label: 'Overview' },
  { color: '#120F17', title: 'Customers', description: 'Customer profiles, purchase history, loyalty data, and behavioral insights.', label: 'CRM' },
  { color: '#120F17', title: 'Campaigns', description: 'Build, personalize, and launch campaigns.', label: 'Manager' },
  { color: '#120F17', title: 'AI Command Center', description: 'Strategic recommendations and AI-assisted campaign planning.', label: 'AI' },
  { color: '#120F17', title: 'Analytics', description: 'Conversion funnels, engagement metrics, and revenue attribution.', label: 'Data' },
  { color: '#120F17', title: 'Campaign Simulator', description: 'Real-time queue monitoring, webhook tracing, and communication lifecycle visibility.', label: 'Systems' },
  { color: '#120F17', title: 'Workspace', description: 'Business settings, team management, brand assets, and channel configuration.', label: 'Admin' }
];

const differentiators = [
  "AI-Native Audience Generation",
  "Natural Language Segmentation",
  "BullMQ Queue Processing",
  "Redis-Based Job Management",
  "Asynchronous Webhook Architecture",
  "Idempotent Event Handling",
  "Status Precedence Validation",
  "Exponential Backoff Retries",
  "Dead Letter Queue Support",
  "Eventual Consistency Design",
  "Multi-Channel Communication",
  "Revenue Attribution Engine"
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black text-white flex flex-col items-center">
      {/* Background Orb Effect */}
      <div className="absolute top-0 left-0 w-full z-0 flex items-center justify-center pointer-events-none opacity-60 pt-10">
        <div style={{ width: '100%', height: '600px', position: 'relative', pointerEvents: 'auto' }}>
          <Orb
            hoverIntensity={2}
            rotateOnHover
            hue={0}
            forceHoverState={false}
            backgroundColor="#000000"
          />
        </div>
      </div>
      {/* Overlay to ensure text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80 z-1 pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center text-center mt-32 px-4 space-y-6 max-w-5xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xl mb-4 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-sm font-medium text-purple-100">AI-Native Customer Engagement Platform</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-2xl leading-tight">
          Turn Customer Data Into <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-blue-300 to-indigo-300">Intelligent Marketing Campaigns.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-300 font-medium max-w-3xl drop-shadow-md">
          Identify the right audience, generate personalized campaigns, launch across multiple channels, and track conversions through a real-time event-driven marketing infrastructure.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base font-medium text-neutral-400 mt-4 max-w-4xl">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400"/> AI-Powered Audience Discovery</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400"/> Natural Language Campaign Creation</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400"/> WhatsApp, SMS, Email & RCS Delivery Simulation</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400"/> Real-Time Conversion Tracking</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400"/> Revenue Attribution Analytics</span>
        </div>
        
        <div className="pt-8 pb-16 flex flex-col sm:flex-row items-center gap-4">
          <Button 
            onClick={() => {
              localStorage.removeItem('xeno_has_seen_tour');
              router.push('/dashboard');
            }}
            size="lg"
            className="rounded-full bg-white text-black hover:bg-neutral-200 hover:scale-105 transition-all duration-300 px-8 py-6 text-lg font-bold shadow-[0_0_40px_rgba(132,0,255,0.4)]"
          >
            Enter Workspace <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button 
            onClick={() => window.open('https://github.com/shashikumar-ezhilarasu/xeno-insights', '_blank')}
            variant="outline" 
            size="lg" 
            className="rounded-full border-neutral-700 hover:bg-white/5 transition-all duration-300 px-8 py-6 text-lg font-bold bg-transparent"
          >
            View GitHub
          </Button>
        </div>

        {/* Architecture Diagram */}
        <div className="w-full max-w-6xl mx-auto pb-32 animate-fadeIn relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
          <img 
            src="/architecture.png" 
            alt="XENO CRM Event-Driven Architecture" 
            className="w-full h-auto rounded-xl border border-[#2F293A] shadow-2xl relative z-0"
          />
        </div>
      </div>

      {/* Value Proposition Section */}
      <div id="explore" className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-32 pt-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Built for Modern Marketing Teams</h2>
          <p className="text-neutral-400">Everything needed to understand customers, launch campaigns, and measure business impact.</p>
        </div>
        
        <MagicBento 
          cards={valuePropCards}
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

      {/* How It Works Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">From Customer Data to Revenue</h2>
          <p className="text-neutral-400">A complete end-to-end marketing workflow powered by AI and distributed systems architecture.</p>
        </div>

        <div className="bg-[#120F17] border border-[#2F293A] rounded-[20px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col space-y-6">
            {[
              "Customer Data & Orders",
              "AI Audience Discovery",
              "Campaign Generation",
              "Queue-Based Dispatch",
              "Channel Delivery Simulation",
              "Webhook Event Processing",
              "Analytics & Revenue Attribution"
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 border border-purple-500/30 shrink-0">
                  {idx + 1}
                </div>
                <div className="text-lg font-medium text-neutral-200">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Modules Section */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Unified Marketing Workspace</h2>
          <p className="text-neutral-400">All the tools required for an AI-native marketing flow.</p>
        </div>
        
        <MagicBento 
          cards={platformModuleCards}
          textAutoHide={false}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          spotlightRadius={400}
          particleCount={10}
          glowColor="82, 39, 255"
        />
      </div>

      {/* Technical Differentiators Section */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Built Like a Real Marketing Platform</h2>
          <p className="text-neutral-400">Engineered to handle high-volume distributed communication gracefully.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((diff, idx) => (
            <div key={idx} className="bg-[#120F17] border border-[#2F293A] rounded-[16px] p-5 flex items-start gap-3 hover:border-purple-500/50 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <span className="text-neutral-200 font-medium">{diff}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-32 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-12">Technology Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 text-neutral-400 font-medium">
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">Frontend</h3>
            <p>Next.js</p>
            <p>TypeScript</p>
            <p>TailwindCSS</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">Backend</h3>
            <p>Node.js</p>
            <p>Express</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">Database</h3>
            <p>PostgreSQL</p>
            <p>Supabase</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">Infrastructure</h3>
            <p>Redis</p>
            <p>BullMQ</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">AI</h3>
            <p>Google Gemini</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold mb-4">Deployment</h3>
            <p>Vercel</p>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pb-32 text-center">
        <div className="bg-gradient-to-b from-[#120F17] to-black border border-[#2F293A] rounded-[32px] p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Launch Smarter Campaigns with AI</h2>
            <p className="text-lg text-neutral-300 max-w-2xl mx-auto mb-10">
              Combine intelligent audience targeting, automated campaign execution, and real-time analytics within a unified customer engagement platform.
            </p>
            <Button 
              onClick={() => {
                localStorage.removeItem('xeno_has_seen_tour');
                router.push('/dashboard');
              }}
              size="lg"
              className="rounded-full bg-white text-black hover:bg-neutral-200 hover:scale-105 transition-all duration-300 px-10 py-7 text-lg font-bold shadow-[0_0_40px_rgba(132,0,255,0.4)]"
            >
              Enter XENO Workspace <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/50 backdrop-blur-md py-8 text-center text-neutral-500 text-sm">
        <p>&copy; {new Date().getFullYear()} XENO AI. All rights reserved.</p>
      </footer>
    </main>
  );
}
