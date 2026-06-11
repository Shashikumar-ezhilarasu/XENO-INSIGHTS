"use client";

import React, { useEffect, useState } from 'react';
import Stepper, { Step } from './ui/stepper';
import { X, Sparkles, Users, Send, Target, BarChart3, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function TourModal() {
  const [isOpen, setIsOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Check if the user has seen the tour before
    const hasSeenTour = localStorage.getItem('xeno_has_seen_tour');
    if (!hasSeenTour) {
      setIsOpen(true);
      router.push('/dashboard');
    }

    // Listen for custom event from the Help button in the navbar
    const handleOpenTour = () => {
      setIsOpen(true);
      router.push('/dashboard');
    };
    window.addEventListener('open-tour', handleOpenTour);

    return () => {
      window.removeEventListener('open-tour', handleOpenTour);
    };
  }, [router]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('xeno_has_seen_tour', 'true');
  };

  const handleStepChange = (step: number) => {
    switch (step) {
      case 1:
        router.push('/dashboard');
        break;
      case 2:
        router.push('/segments');
        break;
      case 3:
        router.push('/campaigns');
        break;
      case 4:
        router.push('/campaigns/command');
        break;
      case 5:
        router.push('/analytics');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Container */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full min-w-[320px] max-w-3xl bg-card rounded-2xl shadow-2xl border border-border z-10 overflow-auto resize cursor-grab active:cursor-grabbing"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30 pointer-events-none">
            <div className="flex items-center space-x-2 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">XENO Platform Tour</h2>
            </div>
            <div className="flex items-center space-x-2 pointer-events-auto">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors border border-transparent hover:border-border"
              >
                Skip Tour
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8 bg-background">
            <Stepper
              initialStep={1}
              onStepChange={handleStepChange}
              onFinalStepCompleted={handleClose}
              backButtonText="Previous"
              nextButtonText="Next"
            >
              <Step>
                <div className="text-center space-y-4 py-8">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Welcome to XENO CRM!</h3>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    You're looking at the next generation of AI-driven marketing. Let's take a quick tour of how you can build powerful campaigns in seconds.
                  </p>
                </div>
              </Step>
              
              <Step>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">1. AI Segments</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Gone are the days of complex SQL queries or clunky filter builders. In the <strong>Segments</strong> page, you simply type what you want in plain English:
                  </p>
                  <div className="bg-secondary p-4 rounded-xl border border-border font-mono text-sm text-foreground shadow-inner">
                    "Find me customers who love coffee and haven't ordered in 60 days."
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI instantly translates your intent into a live database query and previews your target audience.
                  </p>
                </div>
              </Step>

              <Step>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <Send className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">2. Campaign Builder</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    The <strong>Campaign Manager</strong> gives you a beautiful 3-step wizard to launch your messages. 
                  </p>
                  <ul className="space-y-3 text-muted-foreground ml-2">
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">✓</span>
                      <span>Target your AI-generated audience segment.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">✓</span>
                      <span>Use Gemini AI to instantly draft high-converting copy for WhatsApp, SMS, or Email.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-primary">✓</span>
                      <span>See a live, dynamic device mockup of exactly how your notification will look before you hit send.</span>
                    </li>
                  </ul>
                </div>
              </Step>

              <Step>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">3. Agentic Command Center</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Ready to fully automate your work? Try the <strong>Campaign Command</strong> workflow.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Type a single overarching goal like <em>"Boost weekend sales"</em>, and watch as a swarm of 4 specialized AI Agents collaborate in real-time to analyze your data, formulate a strategy, draft the creative, and deliver a fully-packaged campaign proposal for your approval.
                  </p>
                </div>
              </Step>

              <Step>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">4. Real-time Analytics</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    After dispatching your campaigns, head over to the <strong>Analytics</strong> dashboard to watch the results roll in.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Watch the delivery rates, open rates, and attributed revenue tick upwards dynamically as POS endpoints validate your promotional codes and calculate your ROI.
                  </p>
                </div>
              </Step>

              <Step>
                <div className="text-center space-y-6 py-8">
                  <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">You're ready to go!</h3>
                  <p className="text-muted-foreground text-lg">
                    If you ever need to see this tour again, just click the <HelpCircle className="inline w-5 h-5 mx-1" /> Help button in the top navigation bar.
                  </p>
                </div>
              </Step>
            </Stepper>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
