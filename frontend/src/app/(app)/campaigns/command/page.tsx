"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

type AgentStatus = 'waiting' | 'thinking' | 'done';

interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  outputPreview: string | null;
  color: string;
}

export default function CampaignCommand() {
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'Orchestrator', name: 'Orchestrator', status: 'waiting', outputPreview: null, color: 'bg-purple-500' },
    { id: 'Data Analyst', name: 'Data Analyst', status: 'waiting', outputPreview: null, color: 'bg-blue-500' },
    { id: 'Strategy Agent', name: 'Strategy Agent', status: 'waiting', outputPreview: null, color: 'bg-orange-500' },
    { id: 'Creative Agent', name: 'Creative Agent', status: 'waiting', outputPreview: null, color: 'bg-pink-500' }
  ]);

  const [proposal, setProposal] = useState<any>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);

  const startSwarm = async () => {
    if (!goal.trim()) return;
    setIsRunning(true);
    setProposal(null);
    setAgents(prev => prev.map(a => ({ ...a, status: 'waiting', outputPreview: null })));

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/swarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.agent === 'ASSEMBLY' && data.status === 'done') {
                setProposal(data.output.campaignProposal);
                setIsRunning(false);
              } else {
                setAgents(prev => prev.map(a => {
                  if (a.id === data.agent) {
                    let preview = a.outputPreview;
                    if (data.status === 'done' && data.output) {
                      if (a.id === 'Orchestrator') preview = `Category: ${data.output.extractedFilters.category || 'All'}, ${data.output.extractedFilters.recencyDays}d`;
                      if (a.id === 'Data Analyst') preview = `${data.output.audienceSize} customers matched`;
                      if (a.id === 'Strategy Agent') preview = `${data.output.recommendedChannel} · ${data.output.incentiveType}`;
                      if (a.id === 'Creative Agent') preview = data.output.body ? data.output.body.substring(0, 50) + '...' : 'Draft ready';
                    }
                    return { ...a, status: data.status, outputPreview: preview };
                  }
                  return a;
                }));
              }
            } catch (e) {
              console.error("Failed to parse SSE line", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Swarm stream failed", error);
      setIsRunning(false);
    }
  };

  const handleExecute = async () => {
    setIsDispatching(true);
    setDispatchProgress(10);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/campaigns/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal)
      });
      if (res.ok) {
        setDispatchProgress(100);
        setTimeout(() => {
          window.location.href = '/analytics';
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      setIsDispatching(false);
    }
  };

  // Helper to highlight macros
  const highlightMacros = (text: string) => {
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => 
      part.startsWith('{{') ? <span key={i} className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-sm mx-0.5">{part}</span> : part
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign Command</h1>
        <p className="text-muted-foreground">True Agentic Workflow orchestration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT PANE: Agent Activity */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold">Command Input</h2>
            <textarea 
              className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              rows={3}
              placeholder="E.g. Re-engage customers who bought coffee in the last 60 days but haven't returned"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              disabled={isRunning || isDispatching}
            />
            <button 
              onClick={startSwarm}
              disabled={isRunning || !goal.trim() || isDispatching}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg py-2 font-medium disabled:opacity-50 transition-colors"
            >
              {isRunning ? 'Swarm Active...' : 'Launch Agents'}
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Agent Swarm Activity</h2>
            
            {agents.map((agent, i) => (
              <div 
                key={agent.id} 
                className={`bg-card border-l-4 rounded-r-xl p-4 shadow-sm transition-all duration-300 ${
                  agent.status === 'done' ? 'border-l-green-500' :
                  agent.status === 'thinking' ? 'border-l-amber-500 shadow-md' : 'border-l-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${agent.color} ${agent.status === 'thinking' ? 'animate-pulse' : ''}`} />
                    <span className={`font-medium ${agent.status !== 'waiting' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {agent.name}
                    </span>
                  </div>
                  <div className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {agent.status === 'thinking' ? (
                      <span className="animate-pulse text-amber-600">Thinking...</span>
                    ) : agent.status === 'done' ? (
                      <span className="text-green-600">Done</span>
                    ) : 'Waiting'}
                  </div>
                </div>
                {agent.outputPreview && (
                  <div className="mt-3 pl-6 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
                    ↳ {agent.outputPreview}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE: Proposal Card */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-md h-full flex flex-col">
            <h2 className="font-semibold text-xl mb-4">Campaign Proposal</h2>
            
            {!proposal && !isRunning && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <p>Waiting for agent swarm to assemble proposal...</p>
              </div>
            )}

            {isRunning && !proposal && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="animate-pulse">Agents are working...</p>
              </div>
            )}

            {proposal && (
              <div className="space-y-6 animate-in zoom-in-95 duration-500 flex-1 flex flex-col">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
                  <input 
                    type="text" 
                    value={proposal.name}
                    className="w-full font-bold text-lg bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors px-1 py-0.5"
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Audience Size</div>
                    <div className="font-semibold">{proposal.audienceSize} customers</div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Channel</div>
                    <div className="font-semibold flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      {proposal.channel}
                    </div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Incentive</div>
                    <div className="font-semibold text-primary">{proposal.incentiveType}</div>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Delivery Time</div>
                    <div className="font-semibold">{proposal.sendTime}</div>
                  </div>
                </div>

                <div className="flex-1 border border-border rounded-xl overflow-hidden bg-background">
                  <div className="bg-secondary/50 px-4 py-2 border-b border-border text-sm font-medium">
                    Message Preview
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="text-sm font-medium">{proposal.message.subject}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {highlightMacros(proposal.message.body)}
                    </div>
                    {proposal.message.cta && (
                      <div className="mt-2 text-sm text-primary font-medium hover:underline cursor-pointer">
                        {proposal.message.cta} →
                      </div>
                    )}
                  </div>
                </div>

                {isDispatching ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-primary">Dispatching...</span>
                      <span>{dispatchProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${dispatchProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-auto pt-4 border-t border-border">
                    <button className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-medium transition-colors">
                      Edit Draft
                    </button>
                    <button 
                      onClick={handleExecute}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20"
                    >
                      Approve & Execute
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
