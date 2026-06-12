"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function ClassicWizard() {
  const [step, setStep] = useState(1);

  // Step 1: Audience
  const [nlQuery, setNlQuery] = useState('');
  const [isBuildingAudience, setIsBuildingAudience] = useState(false);
  const [segmentData, setSegmentData] = useState<any>(null);

  // Step 2: Message
  const [channel, setChannel] = useState('WHATSAPP');
  const [messageBody, setMessageBody] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Step 3: Review
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState<number>(0);
  
  // Simulated Interactive Filters for Presentation
  const [filters, setFilters] = useState({ vipOnly: false, activeOnly: false });

  const buildAudience = async () => {
    setIsBuildingAudience(true);
    // SIMULATE REALISTIC AUDIENCE GENERATION DELAY
    setTimeout(() => {
      setSegmentData({
        generatedQuery: "SELECT * FROM customers WHERE ...",
        preview: {
          count: 150,
          sample: [
            { name: "Alice Walker", lastOrderDate: "2026-06-12", totalSpend: 450.00 },
            { name: "Bob Harris", lastOrderDate: "2026-06-12", totalSpend: 120.00 },
            { name: "Charlie Davis", lastOrderDate: "2026-06-12", totalSpend: 890.50 }
          ]
        }
      });
      setStep(2);
      setIsBuildingAudience(false);
    }, 2500); // 2.5 second delay for realistic feel
  };

  const draftMessage = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/draft-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentSummary: nlQuery, 
          channel,
          goal: 'Engagement'
        })
      });
      const data = await res.json();
      setMessageBody(data.body || data.message || data.draft || 'Hi {{name}}, here is a special offer!');
    } catch (err) {
      console.error(err);
      setMessageBody('Hi {{name}}, here is a special offer!');
    }
    setIsDrafting(false);
  };

  const handleSend = async () => {
    setIsDispatching(true);
    setDispatchProgress(10);
    try {
      const createRes = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Campaign: ${nlQuery}`,
          channel,
          messageTemplate: messageBody,
          promptText: nlQuery
        })
      });
      // SIMULATE DISPATCH FOR PRESENTATION
      let prog = 0;
      const intv = setInterval(() => {
        prog += 20;
        if (prog > 100) prog = 100;
        setDispatchProgress(prog);
        if (prog === 100) {
          clearInterval(intv);
          setTimeout(() => {
            window.location.href = '/analytics';
          }, 800);
        }
      }, 300);
    } catch (err) {
      console.error(err);
      setIsDispatching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Builder</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-Assisted Workflow</p>
        </div>
        <div className="flex items-center space-x-2 text-sm font-medium bg-secondary/50 px-4 py-2 rounded-full border border-border">
          <span className={step >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'}>1. Audience</span>
          <span className="text-border">→</span>
          <span className={step >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'}>2. Message</span>
          <span className="text-border">→</span>
          <span className={step >= 3 ? 'text-primary font-bold' : 'text-muted-foreground'}>3. Review</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                  <h2 className="text-xl font-semibold">Who are we targeting?</h2>
                  <textarea
                    value={nlQuery}
                    onChange={e => setNlQuery(e.target.value)}
                    placeholder="E.g. Customers who haven't ordered in 60 days"
                    className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors resize-none shadow-inner"
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={buildAudience}
                      disabled={isBuildingAudience || !nlQuery}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
                    >
                      {isBuildingAudience && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>{isBuildingAudience ? 'Querying Database...' : 'Generate Audience'}</span>
                    </button>
                  </div>
                </div>

                {segmentData && segmentData.preview && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-green-600 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>
                          {segmentData.preview.count 
                            - (filters.vipOnly ? 85 : 0) 
                            - (filters.activeOnly ? 22 : 0)} customers match this segment
                        </span>
                      </div>
                    </div>

                    {/* INTERACTIVE FILTERS SIMULATION */}
                    <div className="flex flex-wrap gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
                      <label className="flex items-center space-x-2 text-sm font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filters.vipOnly} 
                          onChange={e => setFilters(prev => ({...prev, vipOnly: e.target.checked}))}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>VIP Only (>$500 Spend)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filters.activeOnly} 
                          onChange={e => setFilters(prev => ({...prev, activeOnly: e.target.checked}))}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>Active (Ordered last 7 days)</span>
                      </label>
                      <div className="ml-auto text-xs text-muted-foreground flex items-center space-x-1">
                        <span>Sort by:</span>
                        <select className="bg-background border border-border rounded px-2 py-1 outline-none">
                          <option>Total Spend (High to Low)</option>
                          <option>Recent Order</option>
                          <option>Name (A-Z)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="bg-background rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-secondary text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Last Order</th>
                            <th className="px-4 py-3 font-medium">Total Spend</th>
                          </tr>
                        </thead>
                        <tbody className="transition-all duration-300">
                          {segmentData.preview.sample
                            .filter((c: any) => !filters.vipOnly || (c.totalSpend || c.totalSpends) > 500)
                            .filter((c: any) => !filters.activeOnly || c.name !== 'Bob Harris') // Simulate active filter removing Bob
                            .map((c: any, i: number) => (
                            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3">{c.name}</td>
                              <td className="px-4 py-3">{new Date(c.lastOrderDate || c.lastVisitDate).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-medium text-primary">${(c.totalSpend || c.totalSpends || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                  <h2 className="text-xl font-semibold">Compose Message</h2>
                  
                  <div className="flex space-x-3 mb-4">
                    {['WHATSAPP', 'SMS', 'EMAIL'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setChannel(c)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${channel === c ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      >
                        {c === 'WHATSAPP' ? '💬 WhatsApp' : c === 'SMS' ? '📱 SMS' : '✉️ Email'}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={messageBody}
                    onChange={e => setMessageBody(e.target.value)}
                    placeholder="Type your message or use AI to draft one..."
                    className="w-full bg-background border border-border rounded-lg p-4 outline-none focus:border-primary transition-colors resize-none h-40 shadow-inner"
                  />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">{messageBody.length} chars</span>
                    <button 
                      onClick={draftMessage}
                      disabled={isDrafting}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center space-x-2 shadow-md transition-all active:scale-95"
                    >
                      <span className="text-lg">✨</span>
                      <span>{isDrafting ? 'Drafting...' : 'Draft with AI'}</span>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-border mt-6 flex justify-between">
                    <button onClick={() => setStep(1)} className="px-5 py-2 text-muted-foreground hover:bg-secondary rounded-lg font-medium transition-colors">← Back</button>
                    <button onClick={() => setStep(3)} className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md transition-transform active:scale-95">Review →</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
                  <h2 className="text-2xl font-bold">Ready to Launch? 🚀</h2>
                  
                  <div className="space-y-4 bg-background p-6 rounded-xl border border-border shadow-inner">
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-muted-foreground">Target Audience</span>
                      <span className="font-bold text-lg text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {(segmentData?.preview?.count || 0) 
                            - (filters.vipOnly ? 85 : 0) 
                            - (filters.activeOnly ? 22 : 0)} customers
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-muted-foreground">Channel</span>
                      <span className="font-bold tracking-wide">{channel}</span>
                    </div>
                  </div>

                  {isDispatching ? (
                    <div className="space-y-3 pt-4">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-primary animate-pulse">Dispatching Campaign...</span>
                        <span>{dispatchProgress}%</span>
                      </div>
                      <div className="h-3 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500" style={{ width: `${dispatchProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setStep(2)} className="flex-1 py-3 text-muted-foreground hover:bg-secondary rounded-xl font-medium transition-colors border border-transparent hover:border-border">
                        ← Edit
                      </button>
                      <button onClick={handleSend} className="flex-[2] py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/30 text-lg transition-transform active:scale-95">
                        Confirm & Send
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Mobile Mockup */}
        <div className="lg:col-span-5 flex justify-center sticky top-8">
          <div className="w-[300px] h-[620px] bg-black rounded-[3rem] border-[12px] border-black relative overflow-hidden shadow-2xl flex flex-col transform transition-transform hover:scale-[1.02] duration-500">
            
            {/* iPhone Notch */}
            <div className="h-7 w-36 bg-black rounded-b-2xl absolute top-0 left-1/2 -translate-x-1/2 z-20 flex justify-center items-center">
              <div className="w-16 h-4 bg-gray-900 rounded-full"></div>
            </div>
            
            {/* Status Bar */}
            <div className={`h-8 w-full z-10 flex justify-between items-end px-6 pb-1 text-[10px] font-bold ${channel === 'WHATSAPP' ? 'bg-[#075E54] text-white' : channel === 'SMS' ? 'bg-gray-100 text-black' : 'bg-white text-black border-b'}`}>
              <span>9:41</span>
              <div className="flex space-x-1 items-center">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* App Header */}
            <div className={`p-4 pt-2 text-white font-semibold text-center z-0 flex items-center shadow-md ${channel === 'WHATSAPP' ? 'bg-[#075E54]' : channel === 'SMS' ? 'bg-gray-100 text-black border-b border-gray-300' : 'bg-white text-black border-b border-gray-200'}`}>
              <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex items-center justify-center overflow-hidden">
                {channel === 'WHATSAPP' ? '🏢' : '🤖'}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold">{channel === 'WHATSAPP' ? 'XENO CRM' : channel === 'SMS' ? 'Messages' : 'Inbox'}</span>
                {channel === 'WHATSAPP' && <span className="text-[10px] opacity-80 font-normal">Official Business Account</span>}
              </div>
            </div>
            
            {/* Chat Body */}
            <div className="flex-1 bg-[#E5DDD5] relative flex flex-col justify-end p-4 pb-8" style={{ backgroundColor: channel === 'WHATSAPP' ? '#E5DDD5' : channel === 'SMS' ? '#F3F4F6' : '#FFFFFF' }}>
              
              <AnimatePresence mode="popLayout">
                {step === 1 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="self-center bg-white/90 backdrop-blur-sm p-4 rounded-xl text-center shadow-sm w-full max-w-[90%] mb-auto mt-10">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="font-bold text-gray-800 mb-1">Targeting Preview</h3>
                    <p className="text-xs text-gray-500">
                      {segmentData ? `Audience matched! ${segmentData.preview.count} devices will receive a notification here.` : "Define your audience on the left to see how they will be notified."}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-2xl max-w-[90%] mb-2 shadow-md relative ${channel === 'WHATSAPP' ? 'bg-[#DCF8C6] text-black rounded-tr-sm self-end' : channel === 'SMS' ? 'bg-gray-200 text-black rounded-bl-sm self-start' : 'bg-white text-black border border-gray-200 w-full self-center'}`}>
                    {channel === 'EMAIL' && <div className="text-xs text-gray-500 mb-2 border-b border-gray-100 pb-2 font-bold flex items-center space-x-2"><span>Subject:</span> <span className="text-black font-normal truncate">Special Update for you</span></div>}
                    <p className="text-[13px] whitespace-pre-wrap leading-snug">{messageBody || 'Start typing a message to see the live preview...'}</p>
                    <div className="text-[9px] text-gray-400 text-right mt-1.5 flex justify-end items-center space-x-1">
                      <span>9:42 AM</span>
                      {channel === 'WHATSAPP' && <span className="text-blue-500 tracking-tighter">✓✓</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Input Bar */}
            <div className={`p-3 pb-8 ${channel === 'WHATSAPP' ? 'bg-[#F0F0F0]' : 'bg-white border-t'} flex items-center space-x-2`}>
              <div className="flex-1 bg-white border border-gray-300 rounded-full h-8 px-4 flex items-center">
                <span className="text-xs text-gray-400">Message</span>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${channel === 'WHATSAPP' ? 'bg-[#00A884] text-white' : 'bg-blue-500 text-white'}`}>
                <span className="text-xs transform -rotate-45 ml-1 mb-1">➤</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
