
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
  const [dispatchProgress, setDispatchProgress] = useState(0);

  const buildAudience = async () => {
    setIsBuildingAudience(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery })
      });
      const data = await res.json();
      
      if (data.sqlQuery) {
        const previewRes = await fetch(`${BACKEND_URL}/api/segments/preview?query=${encodeURIComponent(data.sqlQuery)}`);
        const previewData = await previewRes.json();
        setSegmentData({ ...data, preview: previewData });
      }
    } catch (err) {
      console.error(err);
    }
    setIsBuildingAudience(false);
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
      setMessageBody(data.body || data.message || 'Hi {{name}}, here is a special offer!');
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
      const res = await fetch(`${BACKEND_URL}/api/campaigns/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Campaign: ${nlQuery}`,
          channel,
          audienceSize: segmentData?.preview?.count || 0,
          message: { body: messageBody, subject: 'Update' },
          segmentFilters: { raw: nlQuery }
        })
      });
      if (res.ok) {
        setDispatchProgress(100);
        setTimeout(() => {
          window.location.href = '/analytics';
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setIsDispatching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Campaign Builder</h1>
        <div className="flex items-center space-x-2 text-sm font-medium">
          <span className={step >= 1 ? 'text-primary' : 'text-muted-foreground'}>1. Audience</span>
          <span className="text-border">→</span>
          <span className={step >= 2 ? 'text-primary' : 'text-muted-foreground'}>2. Message</span>
          <span className="text-border">→</span>
          <span className={step >= 3 ? 'text-primary' : 'text-muted-foreground'}>3. Review</span>
        </div>
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Who are we targeting?</h2>
            <textarea
              value={nlQuery}
              onChange={e => setNlQuery(e.target.value)}
              placeholder="E.g. Customers who haven't ordered in 60 days"
              className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors resize-none"
              rows={3}
            />
            <button 
              onClick={buildAudience}
              disabled={isBuildingAudience || !nlQuery}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {isBuildingAudience ? 'Querying DB...' : 'Generate Audience'}
            </button>

            {segmentData && segmentData.preview && (
              <div className="mt-6 pt-6 border-t border-border animate-in fade-in">
                <div className="flex items-center space-x-2 text-green-600 font-semibold mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>{segmentData.preview.count} customers match this segment</span>
                </div>
                
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-secondary text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Last Order</th>
                        <th className="px-4 py-2">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentData.preview.sample.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2">{new Date(c.lastOrderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2">${c.totalSpend.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button onClick={() => setStep(2)} className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20">
                    Use this segment →
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-semibold">Compose Message</h2>
              
              <div className="flex space-x-2">
                {['WHATSAPP', 'SMS', 'EMAIL'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setChannel(c)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${channel === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <textarea
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                placeholder="Type your message or use AI to draft one..."
                className="w-full bg-background border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors resize-none h-40"
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{messageBody.length} chars</span>
                <button 
                  onClick={draftMessage}
                  disabled={isDrafting}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>✨</span>
                  <span>{isDrafting ? 'Drafting...' : 'Draft with AI'}</span>
                </button>
              </div>

              <div className="pt-6 flex justify-between">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">← Back</button>
                <button onClick={() => setStep(3)} className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md">Review →</button>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center">
            {/* Live Mockup */}
            <div className="w-[280px] h-[580px] bg-gray-900 rounded-[2.5rem] border-[8px] border-gray-800 relative overflow-hidden shadow-2xl flex flex-col">
              <div className="h-6 w-32 bg-gray-800 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-10"></div>
              
              <div className={`p-4 pt-10 text-white font-semibold text-center z-0 ${channel === 'WHATSAPP' ? 'bg-[#075E54]' : channel === 'SMS' ? 'bg-blue-600' : 'bg-gray-800'}`}>
                {channel === 'WHATSAPP' ? 'XENO CRM' : channel === 'SMS' ? 'Messages' : 'Inbox'}
              </div>
              
              <div className="flex-1 bg-gray-50 p-4 relative flex flex-col justify-end pb-12">
                <div className={`p-3 rounded-2xl max-w-[85%] mb-2 shadow-sm ${channel === 'WHATSAPP' ? 'bg-[#DCF8C6] text-black rounded-tr-sm self-end' : channel === 'SMS' ? 'bg-gray-200 text-black rounded-bl-sm self-start' : 'bg-white text-black border border-gray-200 w-full'}`}>
                  {channel === 'EMAIL' && <div className="text-xs text-gray-500 mb-2 border-b pb-1 font-bold">Subject: Special Offer</div>}
                  <p className="text-sm whitespace-pre-wrap">{messageBody || 'Type a message...'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-center">Ready to Send?</h2>
            
            <div className="space-y-4 bg-background p-6 rounded-lg border border-border">
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-muted-foreground">Audience</span>
                <span className="font-semibold">{segmentData?.preview?.count || 0} customers</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-muted-foreground">Channel</span>
                <span className="font-semibold">{channel}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-2">Message Preview</span>
                <div className="bg-secondary/50 p-3 rounded text-sm whitespace-pre-wrap">{messageBody}</div>
              </div>
            </div>

            {isDispatching ? (
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-primary">Dispatching Campaign...</span>
                  <span>{dispatchProgress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${dispatchProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-3 text-muted-foreground hover:bg-secondary rounded-lg font-medium transition-colors">
                  ← Back to Edit
                </button>
                <button onClick={handleSend} className="flex-[2] py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold shadow-lg shadow-primary/20 text-lg">
                  Send Campaign 🚀
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
