"use client";

import React, { useEffect, useState } from 'react';
import Stepper, { Step } from './ui/stepper';
import { X, Sparkles, Users, Send, Target, BarChart3, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TourModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for custom event from the Help button in the navbar
    const handleOpenTour = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-tour', handleOpenTour);

    return () => {
      window.removeEventListener('open-tour', handleOpenTour);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('xeno_has_seen_tour', 'true');
  };

  const handleStepChange = (step: number) => {
    // No longer navigating on step change
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[80vh] bg-[#120F17] rounded-2xl shadow-2xl border border-[#2F293A] z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2F293A] bg-black/20 shrink-0">
            <div className="flex items-center space-x-2 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">XENO Platform Tour</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/20"
              >
                Skip Tour
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Stepper
              initialStep={1}
              onStepChange={handleStepChange}
              onFinalStepCompleted={handleClose}
              backButtonText="Previous"
              nextButtonText="Next"
              stepCircleContainerClassName="shadow-none border-none bg-transparent !p-0 !m-0"
              stepContainerClassName="px-8 pt-8 pb-4"
              contentClassName="px-8 pb-4"
              footerClassName="px-8 pb-8 pt-0"
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
                    Gone are the days of complex SQL queries or clunky filter builders. In the <strong>AI Segments</strong> workspace, you simply type what you want in plain English:
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
