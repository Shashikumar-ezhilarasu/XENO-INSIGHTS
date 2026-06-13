"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSharedState } from '../../../../hooks/useSharedState';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Users,
  Send,
  CheckCircle2,
  AlertTriangle,
  Bot,
  User,
  Trash2,
  Smartphone,
  Clock,
  MessageSquare,
  RefreshCw,
  Calendar,
  Check,
  ChevronRight,
  Info,
  Cpu,
  Activity,
  Layers,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useTenant } from '@/lib/authContext';
import { CATEGORY_DEFAULTS } from '@/lib/categoryDefaults';
import { Badge } from '@/components/ui/badge';
import { BRAND_CONFIG, BrandCategory, getBrandCategory } from '@/lib/brandCategory';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  proposal?: any;
  isSwarmStream?: boolean;
}

export default function CampaignCommand() {
  const { language, setLanguage } = useSharedState();
  const [brandCategory, setBrandCategory] = useState<BrandCategory>('retail');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSwarmMode, setIsSwarmMode] = useState(true); // Swarm mode active by default!
  
  // Swarm Streaming States
  const [swarmEvents, setSwarmEvents] = useState<Record<string, { status: string; output?: any }>>({});
  const [activeSwarmAgent, setActiveSwarmAgent] = useState<string | null>(null);
  
  // Interactive workspace steps
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [audienceLocked, setAudienceLocked] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [activeChannel, setActiveChannel] = useState('WhatsApp');
  const [tone, setTone] = useState('Friendly');
  
  // Launch / Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [campaignAnalytics, setCampaignAnalytics] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Alternative channels explanation panel state
  const [alternativeReasoning, setAlternativeReasoning] = useState<string | null>(null);
  const [isFetchingAltReason, setIsFetchingAltReason] = useState(false);

  // Refine segment input state per AI card
  const [refineTexts, setRefineTexts] = useState<Record<string, string>>({});

  // Automation Triggers State
  const [triggers, setTriggers] = useState<any[]>([]);
  const [isCheckingTriggers, setIsCheckingTriggers] = useState(false);
  const [checkTriggersResult, setCheckTriggersResult] = useState<any | null>(null);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, swarmEvents]);

  // Load category, triggers list, and initial greeting
  useEffect(() => {
    const category = getBrandCategory();
    setBrandCategory(category);
    fetchTriggers();
    
    const config = BRAND_CONFIG[category] || BRAND_CONFIG.retail;
    setMessages([
      {
        id: 'welcome',
        role: 'ai',
        content: `Welcome to the XENO AI Marketing Workspace! 🤖 I am your strategy co-pilot for **${config.label}**. Reference our specialized tools, design a goal like, "${CATEGORY_DEFAULTS[category]?.chips[0].prompt || config.chips[0].prompt}", or choose a campaign preset to get started.`
      }
    ]);
  }, []);

  // Update states on proposal load
  useEffect(() => {
    if (activeProposal) {
      setMessageText(activeProposal.message?.template || '');
      setActiveChannel(activeProposal.channel?.recommended || 'WhatsApp');
      setTone(activeProposal.message?.toneUsed || 'Friendly');
      setAudienceLocked(false);
      setAlternativeReasoning(null);
    }
  }, [activeProposal]);

  const fetchTriggers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/triggers/list`);
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers || []);
      }
    } catch (err) {
      console.error('Failed to load triggers:', err);
    }
  };

  const handleCheckTriggers = async () => {
    setIsCheckingTriggers(true);
    setCheckTriggersResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/triggers/check`);
      if (res.ok) {
        const data = await res.json();
        setCheckTriggersResult(data);
        fetchTriggers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingTriggers(false);
    }
  };

  const handleCreateTrigger = async () => {
    if (!activeProposal) return;
    setIsCreatingTrigger(true);
    try {
      // First save the campaign if not already persisted
      const campaignRes = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeProposal.audience?.label || 'Trigger Campaign',
          channel: activeChannel.toUpperCase(),
          messageTemplate: messageText,
          promptText: 'Automation Trigger Campaign',
          audienceSize: activeProposal.audience?.size
        })
      });

      if (!campaignRes.ok) throw new Error('Failed to persist campaign');
      const campaignData = await campaignRes.json();
      const campaignId = campaignData.campaign?.id;

      // Link to trigger rule
      const res = await fetch(`${BACKEND_URL}/api/triggers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `30-Day Lapsed Retention for ${activeProposal.audience?.label || 'Campaign'}`,
          type: 'LAST_VISIT_30_DAYS',
          campaignId,
          isActive: true
        })
      });

      if (res.ok) {
        alert('Automated trigger rule successfully activated!');
        fetchTriggers();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to configure trigger.');
    } finally {
      setIsCreatingTrigger(false);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) setInput('');

    const newMsgId = Math.random().toString();
    const updatedHistory: ChatMessage[] = [
      ...messages,
      { id: newMsgId, role: 'user', content: textToSend }
    ];
    setMessages(updatedHistory);
    setIsLoading(true);

    if (isSwarmMode) {
      // Connect to Server-Sent Events Swarm Engine
      setSwarmEvents({});
      setActiveSwarmAgent('Orchestrator');
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/swarm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: textToSend })
        });

        if (!response.ok) throw new Error('Swarm execution failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let analystCustomers: any[] = [];

        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep last partial line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.replace('data: ', '').trim());
                  
                  // Capture live data payloads
                  if (event.agent === 'Data Analyst' && event.status === 'done') {
                    analystCustomers = event.output?.sampleCustomers || [];
                  }

                  setSwarmEvents(prev => ({
                    ...prev,
                    [event.agent]: { status: event.status, output: event.output }
                  }));

                  if (event.status === 'thinking') {
                    setActiveSwarmAgent(event.agent);
                  }

                  if (event.agent === 'ASSEMBLY' && event.status === 'done') {
                    const assemblyProposal = event.output?.campaignProposal;
                    if (assemblyProposal) {
                      // Format to match UI expected schema
                      const filters = assemblyProposal.segmentFilters || {};
                      const formatted = {
                        thinking: `Swarm consensus reached. Campaign strategy finalized via ${assemblyProposal.channel}.`,
                        audience: {
                          label: assemblyProposal.name || 'Swarm Segment',
                          filters: [
                            `Category: ${filters.category || 'General'}`,
                            `Recency Threshold: ${filters.recencyDays || 90} Days`,
                            `Inactive Period: ${filters.inactiveDays || 30} Days`
                          ],
                          size: assemblyProposal.audienceSize || 0,
                          avgSpend: assemblyProposal.audienceSize > 0 ? Number(event.output?.campaignProposal?.incentiveType?.includes('20%') ? 124.50 : 210.00) : 0,
                          avgRecencyDays: filters.recencyDays || 45,
                          topCity: 'Chennai',
                          sampleCustomers: analystCustomers.map(c => ({
                            name: c.name,
                            lastOrder: c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '30 days ago',
                            spend: `$${Number(c.totalSpend).toFixed(2)}`,
                            affinity: c.preferredChannel || 'WHATSAPP'
                          }))
                        },
                        message: {
                          template: assemblyProposal.message?.body || '',
                          variables: ['name', 'last_order_date'],
                          toneUsed: 'friendly'
                        },
                        channel: {
                          recommended: assemblyProposal.channel || 'WhatsApp',
                          reason: `Optimized response rates projected for ${assemblyProposal.channel}.`,
                          alternatives: ['SMS', 'Email', 'RCS'].filter(c => c.toLowerCase() !== (assemblyProposal.channel || '').toLowerCase())
                        },
                        confidence: 0.96
                      };

                      setActiveProposal(formatted);
                      setMessages(prev => [
                        ...prev,
                        {
                          id: Math.random().toString(),
                          role: 'ai',
                          content: `Swarm consensus completed! Real-time agent collaboration has packaged a proposal reaching **${formatted.audience.size}** users.`,
                          proposal: formatted,
                          isSwarmStream: true
                        }
                      ]);
                    }
                  }
                } catch (err) {
                  // Catch partial JSON stream parsing issues
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'ai',
            content: 'Swarm agent connection was lost. Please verify backend routes.'
          }
        ]);
      } finally {
        setIsLoading(false);
        setActiveSwarmAgent(null);
      }
    } else {
      // Standard Orchestrate Campaign Rest flow
      try {
        const res = await fetch(`${BACKEND_URL}/api/ai/orchestrate-campaign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            category: brandCategory,
            language: language.toLowerCase(),
            conversationHistory: updatedHistory.map(m => ({
              role: m.role === 'ai' ? 'model' : m.role,
              content: m.content
            }))
          })
        });

        if (!res.ok) throw new Error('Orchestrator endpoint failed');
        const data = await res.json();

        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'ai',
            content: data.thinking || 'Here is the strategic recommendation:',
            proposal: data
          }
        ]);
        setActiveProposal(data);
      } catch (error) {
        console.error(error);
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'ai',
            content: 'Strategic co-pilot suffered a request error. Check server logs.'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Keyboard shortcut helper
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setActiveProposal(null);
    setAudienceLocked(false);
    setAlternativeReasoning(null);
    setMessageText('');
  };

  const handleAcceptAudience = () => {
    setAudienceLocked(true);
  };

  const handleRefineSegment = (refinementText: string) => {
    handleSend(`Narrow this segment to ${refinementText}`);
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const macroVal = `{{${variable}}}`;
    const newText = before + macroVal + after;
    
    setMessageText(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + macroVal.length;
    }, 50);
  };

  const handleToneChange = async (selectedTone: string) => {
    setTone(selectedTone);
    setIsLoading(true);
    const rewritePrompt = `Rewrite this message in a ${selectedTone.toLowerCase()} tone: "${messageText}"`;
    await handleSend(rewritePrompt);
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    const regenPrompt = `Generate a new message draft for this audience with the same intent: "${messageText}"`;
    await handleSend(regenPrompt);
  };

  const handleChannelSelect = async (channelName: string) => {
    setActiveChannel(channelName);
    setAlternativeReasoning(null);

    const recommended = activeProposal?.channel?.recommended || 'WhatsApp';
    if (channelName.toLowerCase() !== recommended.toLowerCase()) {
      const queryText = `Why would ${channelName} be better than ${recommended} for this audience?`;
      
      const newMsgId = Math.random().toString();
      const updatedHistory: ChatMessage[] = [
        ...messages,
        { id: newMsgId, role: 'user', content: queryText }
      ];
      setMessages(updatedHistory);
      setIsFetchingAltReason(true);

      try {
        const res = await fetch(`${BACKEND_URL}/api/ai/orchestrate-campaign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: queryText,
            category: brandCategory,
            language: language.toLowerCase(),
            conversationHistory: updatedHistory.map(m => ({
              role: m.role === 'ai' ? 'model' : m.role,
              content: m.content
            }))
          })
        });
        if (res.ok) {
          const data = await res.json();
          setAlternativeReasoning(data.thinking);
          
          setMessages(prev => [
            ...prev,
            {
              id: Math.random().toString(),
              role: 'ai',
              content: data.thinking || 'Comparative analysis computed.'
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingAltReason(false);
      }
    }
  };

  const handleLaunchCampaign = async () => {
    setIsDispatching(true);
    setDispatchProgress(10);

    try {
      const createRes = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeProposal.audience?.label || 'AI Marketing Campaign',
          channel: activeChannel.toUpperCase(),
          messageTemplate: messageText,
          promptText: messages[messages.length - 2]?.content || 'Conversational AI command launch',
          audienceSize: activeProposal.audience?.size,
          scheduledAt: isScheduled ? scheduleDate : null
        })
      });

      if (!createRes.ok) throw new Error('Campaign creation failed');
      
      let progress = 10;
      const interval = setInterval(() => {
        progress += 30;
        if (progress > 100) {
          clearInterval(interval);
          setIsSuccess(true);
          
          // Show analytics inline instead of redirecting
          const sent = activeProposal.audience?.size || 420;
          const delivered = Math.floor(sent * 0.96);
          const opened = Math.floor(delivered * 0.68);
          const clicked = Math.floor(opened * 0.42);
          const orders = Math.floor(clicked * 0.15);
          const revenue = orders * 45.0; // assuming $45 AOV
          
          setCampaignAnalytics({
            sent,
            delivered,
            opened,
            clicked,
            orders,
            revenue
          });
        }
        setDispatchProgress(progress);
      }, 400);

    } catch (error) {
      console.error(error);
      setIsDispatching(false);
    }
  };

  const wordCount = messageText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = messageText.length;
  const isSmsOverLimit = activeChannel === 'SMS' && charCount > 160;
  const { tenant } = useTenant();
  const activeBrandCategory = (tenant?.brandCategory || brandCategory || 'retail') as BrandCategory;
  const activeConfig = BRAND_CONFIG[activeBrandCategory] || BRAND_CONFIG.retail;
  const brandAccent = tenant?.accentColor || activeConfig.accentColor;
  const campaignStatus = getCampaignStatus();

  const getMockupText = () => {
    let text = messageText;
    text = text
      .replace(/\{\{name\}\}/g, 'Priya')
      .replace(/\{\{discount_code\}\}/g, 'SAVE20')
      .replace(/\{\{last_product\}\}/g, 'Specialty Latte')
      .replace(/\{\{points_to_gold\}\}/g, '120')
      .replace(/\{\{recency_days\}\}/g, '45')
      .replace(/\{\{favourite_category\}\}/g, 'Desserts')
      .replace(/\{\{last_category\}\}/g, 'Cleansers')
      .replace(/\{\{shop_link\}\}/g, 'xeno.in/shop')
      .replace(/\{\{gift_link\}\}/g, 'xeno.in/anniversary');
    return text;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6" style={{ '--brand-accent': brandAccent } as React.CSSProperties}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --color-background-success: #22c55e;
          --color-background-warning: #f59e0b;
          --color-background-danger: #ef4444;
          --color-border-success: #22c55e;
        }
      `}} />

      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-purple-800 dark:from-white dark:via-neutral-200 dark:to-purple-300">
            Campaign Command
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: brandAccent }} />
            AI Strategy Workspace personalized for <span className="font-bold">{activeConfig.label}</span>
          </p>
        </div>
        
        {/* Swarm Mode Toggle, Language Switcher, and Clear Chat */}
        <div className="flex items-center gap-3">
          {/* Real-time Swarm Mode Toggle Switch */}
          <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-lg px-2 py-1 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span>Agent Swarm Mode</span>
            <button
              onClick={() => setIsSwarmMode(!isSwarmMode)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                isSwarmMode ? 'bg-purple-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isSwarmMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex bg-secondary/60 border border-border rounded-lg p-0.5 text-xs font-semibold">
            {(['EN', 'ES', 'TA', 'HI', 'FR'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  language === lang 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <Button 
            id="btn-clear-chat"
            variant="outline" 
            size="sm"
            onClick={handleClearChat}
            className="text-xs font-semibold gap-1.5 border-neutral-300 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Conversation (70%), Right Live Context & Triggers (30%) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        
        {/* LEFT PANE: Conversation & Interactive Workspaces (70%) */}
        <div className="flex-1 w-full space-y-6 min-h-[calc(100vh-14rem)] flex flex-col">
          
          {/* Thread View */}
          <div className="flex-1 overflow-y-auto space-y-6 max-h-[600px] pr-2 scrollbar-thin">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0 border ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 border-purple-500 text-white' 
                      : 'bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <div className="relative">
                        <Bot className="w-5 h-5 text-purple-600" />
                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-neutral-900" style={{ backgroundColor: brandAccent }} />
                      </div>
                    )}
                  </div>

                  {/* Body Container */}
                  <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
                    
                    {/* Chat Text */}
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600/10 text-neutral-800 dark:text-neutral-200 border border-purple-500/20 rounded-tr-none shadow-sm'
                        : 'bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.content}
                    </div>

                    {/* AI Structured Card Response */}
                    {msg.role === 'ai' && msg.proposal && (
                      <Card className="w-full border-purple-500/20 dark:border-purple-500/10 shadow-lg bg-gradient-to-b from-white to-purple-50/10 dark:from-neutral-900 dark:to-purple-950/5 overflow-hidden mt-3 animate-in scale-in-95 duration-200">
                        
                        {/* Header Row */}
                        <div className="border-b border-purple-100 dark:border-purple-950/20 p-4 bg-purple-50/30 dark:bg-purple-950/10 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-purple-600/10 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">XENO AI</span>
                              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                                {msg.isSwarmStream ? 'Swarm Consolidated Proposal' : 'Co-Pilot Strategy Proposal'}
                              </span>
                            </div>
                            
                            <div className="text-xs font-bold text-neutral-500">
                              Confidence: <span className="font-black text-purple-600 dark:text-purple-400">{Math.round(msg.proposal.confidence * 100)}%</span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${msg.proposal.confidence * 100}%`,
                                backgroundColor: msg.proposal.confidence >= 0.8 
                                  ? 'var(--color-background-success)' 
                                  : msg.proposal.confidence >= 0.5 
                                    ? 'var(--color-background-warning)' 
                                    : 'var(--color-background-danger)'
                              }}
                            />
                          </div>
                        </div>

                        <CardContent className="p-5 space-y-5">
                          {/* Collapsible signals trace */}
                          <details className="group border border-border/85 rounded-xl p-3 bg-secondary/15">
                            <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                              <span className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                                <i className="ti ti-brain text-sm" style={{ color: brandAccent }} />
                                <span>AI Reasoning</span>
                              </span>
                              <ChevronRight className="w-4 h-4 text-neutral-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-3 text-xs leading-relaxed space-y-2 text-neutral-600 dark:text-neutral-400 pl-3 border-l-2 border-purple-500/20">
                              <p><strong>Rationale:</strong> {msg.proposal.thinking}</p>
                              <div className="flex flex-wrap gap-2 pt-1.5 font-bold text-[10px] uppercase text-neutral-400">
                                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">Recency: {msg.proposal.audience?.recencyDays}d</span>
                                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">Spend: ${msg.proposal.audience?.minSpend}</span>
                                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">Category: {msg.proposal.audience?.category}</span>
                                <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">Channel: {msg.proposal.channel?.recommended}</span>
                              </div>
                            </div>
                          </details>

                          {/* Target Segment filters & metrics */}
                          <div className="space-y-4 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Target Segment</h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/10">
                                {msg.proposal.audience?.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {msg.proposal.audience?.filters?.map((f: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-[10px] font-semibold">
                                  {f}
                                </span>
                              ))}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="bg-secondary/40 p-3 rounded-xl border border-border/60">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400">Reach Size</div>
                                <div className="text-sm font-black text-neutral-800 dark:text-white">{msg.proposal.audience?.size} shoppers</div>
                              </div>
                              <div className="bg-secondary/40 p-3 rounded-xl border border-border/60">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400">Average Spend</div>
                                <div className="text-sm font-black text-neutral-800 dark:text-white">${msg.proposal.audience?.avgSpend}</div>
                              </div>
                              <div className="bg-secondary/40 p-3 rounded-xl border border-border/60">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400">Avg Recency</div>
                                <div className="text-sm font-black text-neutral-800 dark:text-white">{msg.proposal.audience?.avgRecencyDays} Days</div>
                              </div>
                              <div className="bg-secondary/40 p-3 rounded-xl border border-border/60">
                                <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400">Top City</div>
                                <div className="text-sm font-black text-neutral-800 dark:text-white">{msg.proposal.audience?.topCity}</div>
                              </div>
                            </div>

                            {/* Database Samples list */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sample Customers</div>
                              <div className="border border-border rounded-xl overflow-hidden bg-card text-xs">
                                <div className="divide-y divide-border">
                                  {msg.proposal.audience?.sampleCustomers?.map((c: any, index: number) => {
                                    const initials = c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                                    return (
                                      <div key={index} className="p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-extrabold text-[10px] uppercase border border-purple-500/10">
                                            {initials}
                                          </div>
                                          <div>
                                            <div className="font-bold text-neutral-800 dark:text-neutral-200">{c.name}</div>
                                            <div className="text-[10px] text-neutral-500">Visited: {c.lastOrder}</div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{c.spend}</div>
                                          <span className="inline-block px-1.5 py-0.5 rounded bg-purple-600/10 text-purple-600 dark:bg-purple-900/30 text-[9px] font-black uppercase">
                                            {c.affinity}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Locked state actions */}
                            {!audienceLocked ? (
                              <div className="space-y-3 pt-2">
                                <div className="flex gap-2">
                                  <Button 
                                    id="btn-refine-segment"
                                    variant="outline" 
                                    onClick={() => {
                                      setRefineTexts(prev => ({ ...prev, [msg.id]: prev[msg.id] !== undefined ? prev[msg.id] : '' }));
                                    }}
                                    className="flex-1 text-xs font-bold border-neutral-300 dark:border-neutral-800 hover:bg-purple-50 hover:text-purple-600"
                                  >
                                    Refine Segment ↗
                                  </Button>
                                  <Button 
                                    id="btn-accept-audience"
                                    onClick={handleAcceptAudience}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                                  >
                                    Accept Audience →
                                  </Button>
                                </div>

                                {refineTexts[msg.id] !== undefined && (
                                  <div className="flex gap-2 p-2 border border-purple-500/20 bg-purple-50/10 rounded-xl items-center animate-in slide-in-from-top-2">
                                    <input
                                      type="text"
                                      value={refineTexts[msg.id]}
                                      onChange={(e) => setRefineTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                      placeholder="e.g. narrow to Chennai location, LTV > 150..."
                                      className="flex-1 bg-transparent border-none outline-none text-xs focus:ring-0"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleRefineSegment(refineTexts[msg.id]);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleRefineSegment(refineTexts[msg.id])}
                                      className="bg-purple-600 text-white text-[10px] px-3 py-1 font-semibold"
                                    >
                                      Send
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center justify-between text-xs font-semibold text-green-700 dark:text-green-400 animate-fadeIn">
                                <span className="flex items-center gap-1.5">
                                  <Check className="w-4 h-4 text-green-500" />
                                  Audience target accepted.
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* REAL-TIME SWARM MODE VISUALIZATION CARD */}
            {isLoading && isSwarmMode && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[85%] mt-3"
              >
                <Card className="border-purple-500/40 shadow-xl overflow-hidden bg-neutral-950 text-white">
                  <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-500 animate-spin" />
                      <span className="font-extrabold text-sm tracking-tight">Active Swarm Agent Stream</span>
                    </div>
                    <Badge className="bg-purple-600 text-[9px] py-0.5 px-2 rounded-full uppercase animate-pulse">Real-Time (SSE)</Badge>
                  </div>
                  
                  <CardContent className="p-5 space-y-4">
                    {/* Swarm Agent Cards Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Orchestrator', desc: 'Parses goal intent & filters', icon: 'ti-settings' },
                        { name: 'Data Analyst', desc: 'Queries PostgreSQL DB metrics', icon: 'ti-database' },
                        { name: 'Strategy Agent', desc: 'Optimizes channel & rules', icon: 'ti-device-analytics' },
                        { name: 'Creative Agent', desc: 'Drafts copy using Gemini', icon: 'ti-writing' }
                      ].map(agent => {
                        const status = swarmEvents[agent.name]?.status || 'idle';
                        const output = swarmEvents[agent.name]?.output;
                        const isActive = activeSwarmAgent === agent.name;

                        return (
                          <div 
                            key={agent.name}
                            className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden ${
                              status === 'done' 
                                ? 'bg-green-950/20 border-green-500/40 text-green-200' 
                                : isActive 
                                  ? 'bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-500/5 text-purple-200'
                                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400'
                            }`}
                          >
                            {/* Visual pulsing indicator */}
                            {isActive && (
                              <span className="absolute top-1 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                              </span>
                            )}

                            <div className="flex items-center gap-2">
                              <i className={`ti ${agent.icon} text-lg ${status === 'done' ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-neutral-600'}`} />
                              <div className="font-extrabold text-xs">{agent.name}</div>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-1">{agent.desc}</p>
                            
                            {/* Live outputs */}
                            {status === 'done' && output && (
                              <div className="mt-2 text-[9px] bg-black/40 border border-neutral-800 rounded p-1.5 text-neutral-300 font-mono overflow-x-auto whitespace-pre leading-normal max-h-20 scrollbar-none">
                                {agent.name === 'Orchestrator' && `Intent: ${output.intent}\nRecency: ${output.extractedFilters?.recencyDays}d`}
                                {agent.name === 'Data Analyst' && `Reach: ${output.audienceSize} shoppers\nAOV: $${Number(output.avgOrderValue).toFixed(2)}`}
                                {agent.name === 'Strategy Agent' && `Channel: ${output.recommendedChannel}\nIncentive: ${output.incentiveType}`}
                                {agent.name === 'Creative Agent' && `Subject: ${output.subject?.slice(0, 15)}...\nCreative generated.`}
                              </div>
                            )}

                            {isActive && (
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-purple-400 mt-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Analyzing data...</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Standard Spinner typing indicator if Swarm Mode is off */}
            {isLoading && !isSwarmMode && (
              <div className="flex gap-4 flex-row animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div className="p-4 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="space-y-2 pt-4 border-t border-border mt-auto">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Quick actions</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_DEFAULTS[activeBrandCategory]?.aiRecommendations?.map((rec: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleSend(rec.subtitle)}
                  disabled={isLoading || isDispatching}
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 dark:bg-neutral-900 dark:hover:bg-purple-950/20 text-neutral-700 dark:text-neutral-300 hover:text-purple-600 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-900/60 rounded-full text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <i className={`ti ti-sparkles`} style={{ color: brandAccent }} />
                  {rec.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Studio (revealed after Accept Audience) */}
          {activeProposal && audienceLocked && (
            <div className="space-y-6 pt-6 border-t border-border mt-6">
              
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6 items-start">
                
                {/* Left side: Composer Textarea */}
                <Card className="border-border md:col-span-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        Message Studio
                      </span>
                      <span className={`text-[10px] font-bold ${isSmsOverLimit ? 'text-red-500 animate-pulse font-black' : 'text-neutral-400'}`}>
                        {charCount} Chars · {wordCount} Words
                      </span>
                    </CardTitle>
                    <CardDescription>Tailor the copy template with hyper-personalized variable macros.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      id="composer-textarea"
                      ref={textareaRef}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      className="w-full h-36 bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                      placeholder="Compose message..."
                    />

                    {/* Variable chips row */}
                    <div className="space-y-1.5">
                      <div className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400">Insert Variable Tag</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeProposal.message?.variables?.map((v: string) => (
                          <button
                            key={v}
                            onClick={() => insertVariable(v)}
                            className="px-2 py-1 bg-secondary hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-950/20 text-secondary-foreground text-[10px] font-bold rounded-lg border border-border transition-all"
                          >
                            + {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SMS Limit Alert */}
                    {isSmsOverLimit && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Warning: SMS length exceeds 160 characters. Message will be segmented.</span>
                      </div>
                    )}

                    {/* Tone Rewrite Controls */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Adjust Tone</div>
                      <div className="flex gap-1 bg-secondary/50 border border-border p-0.5 rounded-lg text-xs font-semibold">
                        {['Friendly', 'Urgent', 'Formal', 'Witty'].map(t => (
                          <button
                            key={t}
                            onClick={() => handleToneChange(t)}
                            className={`flex-1 py-1 rounded-md transition-all ${
                              tone.toLowerCase() === t.toLowerCase()
                                ? 'bg-white shadow dark:bg-neutral-800 text-purple-600 dark:text-purple-400' 
                                : 'text-neutral-500 hover:text-neutral-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Regenerate Button */}
                    <Button 
                      id="btn-regenerate-copy"
                      variant="outline" 
                      onClick={handleRegenerate}
                      className="w-full text-xs font-bold border-neutral-300 dark:border-neutral-800 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate message draft
                    </Button>
                  </CardContent>
                </Card>

                {/* Right side: Device Live Mockup Preview */}
                <div className="md:col-span-4 flex flex-col items-center justify-center bg-secondary/15 border border-border rounded-2xl p-4 min-h-[380px]">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Device Live Preview
                  </div>
                  
                  {/* Phone frame skin */}
                  <div className="w-full max-w-[240px] h-[330px] bg-neutral-900 border-[6px] border-neutral-800 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col">
                    
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-neutral-800 rounded-full z-10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black mr-2" />
                      <div className="w-6 h-0.5 rounded bg-black" />
                    </div>

                    <div className={`pt-6 pb-2 px-3 text-[10px] font-bold text-white flex justify-between items-center ${
                      activeChannel.toLowerCase() === 'whatsapp' 
                        ? 'bg-[#075E54]' 
                        : activeChannel.toLowerCase() === 'sms' 
                          ? 'bg-neutral-800' 
                          : activeChannel.toLowerCase() === 'rcs' 
                            ? 'bg-gradient-to-r from-blue-700 to-indigo-800' 
                            : 'bg-neutral-700 border-b border-neutral-600'
                    }`}>
                      <span>{activeChannel}</span>
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    </div>

                    <div className="flex-1 p-2 bg-[#E5DDD5] dark:bg-neutral-950 overflow-y-auto space-y-2 flex flex-col justify-end">
                      <div className={`p-2.5 rounded-xl text-[10px] max-w-[85%] shadow-sm leading-relaxed ${
                        activeChannel.toLowerCase() === 'whatsapp' 
                          ? 'bg-[#DCF8C6] text-neutral-800 self-end rounded-tr-none' 
                          : activeChannel.toLowerCase() === 'email' 
                            ? 'bg-white text-neutral-800 border border-neutral-200 rounded-lg self-start'
                            : activeChannel.toLowerCase() === 'rcs' 
                              ? 'bg-blue-600 text-white self-end rounded-tr-none'
                              : 'bg-neutral-300 text-neutral-800 self-end rounded-tr-none'
                      }`}>
                        {activeChannel.toLowerCase() === 'email' && (
                          <div className="font-extrabold pb-1 border-b border-neutral-100 mb-1">
                            Subject: Special Offer
                          </div>
                        )}
                        {getMockupText()}
                      </div>
                    </div>

                    <div className="bg-neutral-900 px-3 py-1.5 flex justify-center border-t border-neutral-800">
                      <div className="w-16 h-1 rounded-full bg-neutral-600" />
                    </div>

                  </div>
                </div>

              </div>

              {/* Channel Picker */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Channel</div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'WhatsApp', delivery: '94%', open: '72%', color: 'border-green-500 shadow-green-500/5' },
                    { name: 'SMS', delivery: '91%', open: '48%', color: 'border-blue-500 shadow-blue-500/5' },
                    { name: 'Email', delivery: '68%', open: '22%', color: 'border-red-500 shadow-red-500/5' },
                    { name: 'RCS', delivery: '87%', open: '61%', color: 'border-purple-500 shadow-purple-500/5' }
                  ].map(ch => {
                    const recommended = activeProposal.channel?.recommended || 'WhatsApp';
                    const isRecommended = ch.name.toLowerCase() === recommended.toLowerCase();
                    const isSelected = activeChannel.toLowerCase() === ch.name.toLowerCase();

                    return (
                      <div
                        key={ch.name}
                        onClick={() => handleChannelSelect(ch.name)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? `bg-white dark:bg-neutral-900 border-2 ${ch.color} shadow-lg scale-[1.02]` 
                            : 'bg-card border-border hover:bg-secondary/40'
                        }`}
                        style={isSelected ? { borderColor: brandAccent } : {}}
                      >
                        {isRecommended && (
                          <span className="absolute top-2 right-2 bg-purple-100 text-purple-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full dark:bg-purple-900/40 dark:text-purple-300 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Pick
                          </span>
                        )}

                        <div>
                          <div className="font-bold text-sm text-neutral-900 dark:text-white">{ch.name}</div>
                          <div className="text-[9px] font-semibold text-neutral-400 pt-1">
                            Delivery Rate: <span className="text-neutral-600 dark:text-neutral-200">{ch.delivery}</span>
                          </div>
                          <div className="text-[9px] font-semibold text-neutral-400">
                            Open Rate: <span className="text-neutral-600 dark:text-neutral-200">{ch.open}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alternative Channel Reasoning Panel */}
                {isFetchingAltReason && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 animate-pulse pt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Fetching channel analytical choice justification...
                  </div>
                )}
                {alternativeReasoning && (
                  <div className="bg-purple-50/50 dark:bg-purple-950/15 border border-purple-200/50 dark:border-purple-900/40 rounded-xl p-3.5 text-xs text-purple-700 dark:text-purple-400 font-medium leading-relaxed animate-in fade-in slide-in-from-top-1">
                    <strong>AI Channel Analysis:</strong> {alternativeReasoning}
                  </div>
                )}
              </div>

              {/* Campaign Review */}
              <div className="space-y-4 pt-6 border-t border-border mt-6">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Final Campaign Review</div>
                
                <Card className="border-purple-500/20 bg-gradient-to-r from-purple-50/20 to-indigo-50/20 dark:from-purple-950/10 dark:to-indigo-950/10">
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                      <div className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>Ready to Launch!</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleCreateTrigger}
                          disabled={isCreatingTrigger}
                          className="h-7 text-[10px] font-extrabold bg-purple-600/10 text-purple-600 border border-purple-500/10 hover:bg-purple-600/20"
                        >
                          {isCreatingTrigger ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3.5 h-3.5 mr-1" />}
                          Create Automated Trigger
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed max-w-md">
                        Segment **{activeProposal.audience?.label}** ({activeProposal.audience?.size} customers) will receive outreach via **{activeChannel}**.
                        AI expects **{Math.floor(activeProposal.audience?.size * 0.03)} - {Math.floor(activeProposal.audience?.size * 0.08)}** conversion orders ({Math.floor(activeProposal.audience?.size * 0.95)} estimated reach).
                      </p>
                      
                      {/* Schedule for Later */}
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="schedule"
                          checked={isScheduled}
                          onChange={e => setIsScheduled(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 border-neutral-300"
                        />
                        <label htmlFor="schedule" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 cursor-pointer">
                          Schedule Campaign for later
                        </label>
                      </div>

                      {isScheduled && (
                        <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                          <input
                            type="datetime-local"
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                      {isDispatching ? (
                        <div className="w-full md:w-56 space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-purple-600">
                            <span>{isSuccess ? 'Campaign Dispatched!' : 'Broadcasting communications...'}</span>
                            <span>{dispatchProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${dispatchProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <Button 
                          id="btn-launch-campaign"
                          onClick={handleLaunchCampaign}
                          className="w-full md:w-56 bg-purple-600 hover:bg-purple-700 text-white font-extrabold shadow-lg shadow-purple-500/20 py-5 rounded-xl gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Launch Campaign
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {isSuccess && campaignAnalytics && (
                  <div className="mt-4 p-5 bg-card border border-green-500/30 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                      <h4 className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Campaign Dispatched Successfully!
                      </h4>
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        Live Analytics
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Sent</span>
                        <div className="text-xl font-mono font-bold text-foreground">{campaignAnalytics.sent}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Delivered</span>
                        <div className="text-xl font-mono font-bold text-foreground">{campaignAnalytics.delivered}</div>
                        <div className="text-[10px] text-green-500 font-bold">96.0%</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Opened</span>
                        <div className="text-xl font-mono font-bold text-foreground">{campaignAnalytics.opened}</div>
                        <div className="text-[10px] text-blue-500 font-bold">68.0%</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Clicked</span>
                        <div className="text-xl font-mono font-bold text-foreground">{campaignAnalytics.clicked}</div>
                        <div className="text-[10px] text-purple-500 font-bold">42.0%</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">New Orders</span>
                        <div className="text-xl font-mono font-bold text-foreground">{campaignAnalytics.orders}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">Revenue</span>
                        <div className="text-xl font-mono font-bold text-green-500">${campaignAnalytics.revenue.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* User Input Area */}
          <div className="p-4 bg-secondary/30 border border-border rounded-2xl relative flex items-center mt-6 shadow-sm">
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isDispatching}
              placeholder={`Ask the co-pilot (e.g. "boost sales", press Cmd+Enter to send)...`}
              className="w-full bg-background border border-border rounded-full pl-6 pr-14 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none overflow-hidden"
            />
            <button
              id="btn-send-chat"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isDispatching}
              className="absolute right-6 w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-600 text-white flex items-center justify-center transition-colors shadow shadow-purple-500/20"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>

        </div>

        {/* RIGHT PANE: Context & Live Campaign Panel (30%) - collapses to thin sidebar icon strip on viewports < 1024px */}
        <div className="w-16 lg:w-80 shrink-0 lg:sticky lg:top-24 bg-card border border-border rounded-2xl p-4 transition-all duration-300 shadow-sm flex flex-col justify-start gap-6">
          
          {/* 1. Full Desktop Context View */}
          <div className="hidden lg:block space-y-6">
            
            {/* Live Campaign Status */}
            <div>
              <div className="border-b border-border pb-3 flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Live Campaign Status</h3>
              </div>

              {/* Current Segment */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Current Segment</div>
                {activeProposal?.audience ? (
                  <div className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border border-border/80">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-extrabold text-neutral-800 dark:text-neutral-200 truncate">{activeProposal.audience.label}</span>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-extrabold text-[9px]">
                        {activeProposal.audience.size} size
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeProposal.audience.filters?.slice(0, 2).map((f: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[9px] text-neutral-500">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs italic text-neutral-400">No segment selected yet.</div>
                )}
              </div>

              {/* Active Draft */}
              <div className="space-y-2 mt-4">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Draft</div>
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 text-xs text-neutral-500 italic max-h-24 overflow-hidden relative">
                  {messageText ? (
                    <p className="line-clamp-3">"{messageText}"</p>
                  ) : (
                    <p>No message drafted yet.</p>
                  )}
                  {messageText && messageText.length > 100 && <span className="absolute bottom-1 right-2 text-[9px] font-bold text-purple-600">...</span>}
                </div>
              </div>

              {/* Campaign Status Flow */}
              <div className="space-y-3 pt-2 mt-4">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Campaign Flow Status</div>
                <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-4 space-y-4 text-xs font-semibold">
                  {[
                    { step: 'Idle', label: 'Idle' },
                    { step: 'Audience Set', label: 'Audience Segment Set' },
                    { step: 'Message Ready', label: 'Message Draft Ready' },
                    { step: 'Ready to Launch', label: 'Ready to Launch' },
                    { step: 'Launched', label: 'Launched' }
                  ].map((s) => {
                    const isActive = campaignStatus === s.step;
                    return (
                      <div key={s.step} className="relative flex items-center gap-2">
                        <span className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 ${
                          isActive 
                            ? 'bg-purple-600 border-purple-600 animate-pulse' 
                            : 'bg-neutral-200 border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700'
                        }`} />
                        <span className={isActive ? 'text-purple-600 font-bold' : 'text-neutral-400'}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Automation & Triggers Dashboard Card */}
            <div className="border-t border-border pt-4">
              <div className="pb-3 flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-500 animate-pulse" />
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Automation Triggers</h3>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleCheckTriggers}
                  disabled={isCheckingTriggers}
                  className="w-full text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-1.5"
                >
                  {isCheckingTriggers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5 animate-spin-slow" />}
                  Run Manual Scan
                </Button>

                {/* Scan result banner */}
                {checkTriggersResult && (
                  <div className="p-3 bg-purple-600/10 border border-purple-500/20 rounded-xl text-[11px] font-semibold text-purple-800 dark:text-purple-300 animate-fadeIn">
                    <div className="font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Scan Complete
                    </div>
                    <div className="mt-1">Triggered: <span className="font-extrabold text-purple-600 dark:text-purple-400">{checkTriggersResult.triggeredCount} campaigns</span></div>
                  </div>
                )}

                {/* Triggers list */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Rules ({triggers.length})</div>
                  {triggers.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto divide-y divide-border text-[11px] font-medium border border-border rounded-xl bg-secondary/20 scrollbar-thin p-1.5 space-y-1.5">
                      {triggers.map((t, idx) => (
                        <div key={idx} className="pt-1.5 pb-1 flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[160px]">{t.name}</div>
                            <div className="text-[9px] text-neutral-400 uppercase font-black">{t.type}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${t.isActive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            {t.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-500 italic text-center py-4 bg-secondary/10 border border-dashed border-border rounded-xl">
                      No automated triggers configured.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Campaign Presets */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Campaign Presets</div>
              <div className="divide-y divide-border">
                {activeConfig.presets.map((preset, idx) => {
                  const estSize = 400 + (idx * 300);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSend(preset.prompt)}
                      className="py-3 cursor-pointer group transition-colors"
                    >
                      <div className="relative">
                        <div className="absolute right-0 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md pointer-events-none z-50">
                          ~{estSize} customers · {preset.channel}
                        </div>
                        <div className="font-bold text-xs text-neutral-800 dark:text-neutral-200 group-hover:text-purple-600 flex items-center gap-1">
                          <span>{preset.label}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-2px] group-hover:translate-x-0" />
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-normal truncate">{preset.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Collapsed Icon Strip (Mobile/Tablet < 1024px) */}
          <div className="block lg:hidden flex flex-col items-center gap-6 py-4 w-full">
            
            {/* Icon 1: Current Segment */}
            <div className="relative group cursor-pointer">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                <Users className="w-5 h-5" />
              </div>
              <div className="absolute right-14 top-0 scale-0 group-hover:scale-100 transition-all origin-right bg-neutral-900 text-white text-xs p-3 rounded-xl shadow-md whitespace-nowrap z-50">
                <div className="font-black">{activeProposal?.audience?.label || 'No segment selected'}</div>
                <div className="text-[10px] text-neutral-400 pt-0.5">{activeProposal?.audience?.size || 0} customers</div>
              </div>
            </div>

            {/* Icon 2: Active Draft */}
            <div className="relative group cursor-pointer">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="absolute right-14 top-0 scale-0 group-hover:scale-100 transition-all origin-right bg-neutral-900 text-white text-xs p-3 rounded-xl shadow-md w-48 z-50 whitespace-normal">
                <div className="font-black border-b border-neutral-800 pb-1 mb-1">Active Draft</div>
                <div className="text-[10px] text-neutral-400 line-clamp-3">
                  {messageText ? `"${messageText}"` : 'No message drafted yet'}
                </div>
              </div>
            </div>

            {/* Icon 3: Campaign Status */}
            <div className="relative group cursor-pointer">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/10">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="absolute right-14 top-0 scale-0 group-hover:scale-100 transition-all origin-right bg-neutral-900 text-white text-xs p-3 rounded-xl shadow-md whitespace-nowrap z-50">
                <div className="font-black">Status: {campaignStatus}</div>
              </div>
            </div>

            {/* Icon 4: Automation Triggers */}
            <div className="relative group cursor-pointer flex flex-col gap-2">
              <div 
                onClick={handleCheckTriggers}
                className="p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-border cursor-pointer transition-colors"
              >
                {isCheckingTriggers ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : <Activity className="w-5 h-5" />}
              </div>
              <div className="absolute right-14 top-0 scale-0 group-hover:scale-100 transition-all origin-right bg-neutral-900 text-white text-xs p-3 rounded-xl shadow-md w-56 z-50 whitespace-normal">
                <div className="font-black border-b border-neutral-800 pb-1 mb-1">Automation Triggers ({triggers.length})</div>
                <div className="text-[9px] text-neutral-400">Click icon to run manual check scan now.</div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function getCampaignStatus() {
  // Mocked state logic or placeholder since status state transitions are handled locally
  return 'Idle';
}
