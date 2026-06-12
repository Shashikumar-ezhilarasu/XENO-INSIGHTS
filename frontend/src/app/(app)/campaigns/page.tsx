"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSharedState } from "../../../hooks/useSharedState";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Users,
  ArrowRightCircle,
  Smartphone,
  Send,
  CheckCircle2,
  Coffee,
  Crown,
  Utensils,
  AlertCircle,
  Bot,
  Layers,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface CampaignDraftData {
  success: boolean;
  campaign: {
    id: string;
    name: string;
    promptText: string | null;
    messageTemplate: string | null;
    channel: string;
    status: string;
  };
  customerCount: number;
  customerIds: string[];
  explanation: string;
  copywriteSuite: {
    notificationHeader: string;
    messageTemplate: string;
    creativeQuote: string;
  };
  bannerConfig: {
    themeGradient: string;
    stickerEmoji: string;
    primaryCallToAction: string;
  };
  gamifiedConfig?: {
    gameType: string;
    prizePool: string;
    milestoneTriggerPoints: number;
  };
}

const LOADING_STEPS = [
  "Assembling segment...",
  "Brewing engaging copy...",
  "Generating ad banners...",
];

const CAMPAIGN_PRESETS = [
  {
    id: "coffee-90d",
    category: "F&B / Cafe",
    title: "☕ Coffee Win-Back (90d)",
    description:
      "Re-engage coffee lovers missing for 90 days with witty copy and discount voucher.",
    promptText:
      "Bring back coffee lovers missing for 90 days (Witty & Emotional)",
    channel: "WHATSAPP",
    gradient: "from-amber-500 to-orange-600",
    emoji: "☕",
  },
  {
    id: "bakery-nudge",
    category: "F&B / Cafe",
    title: "🥐 Bakery Nudge (Hungry Mode)",
    description:
      "Nudge recent bakery buyers who haven't ordered this week with fresh pastry offers.",
    promptText:
      "Nudge bakery buyers who haven't ordered this week (Hungry mode)",
    channel: "RCS",
    gradient: "from-orange-400 to-rose-600",
    emoji: "🥐",
  },
  {
    id: "apparel-clearance",
    category: "Retail & Apparel",
    title: "👗 Summer Clearance VIP",
    description: "Target previous summer buyers with early access to clearance sale.",
    promptText: "Invite past summer buyers to early clearance sale",
    channel: "EMAIL",
    gradient: "from-pink-500 to-rose-500",
    emoji: "👗",
  },
  {
    id: "sneaker-drop",
    category: "Retail & Apparel",
    title: "👟 Sneaker Drop Alert",
    description: "Notify highly active sneakerheads about limited edition drops.",
    promptText: "Notify active sneakerheads about limited edition drop",
    channel: "WHATSAPP",
    gradient: "from-blue-600 to-indigo-600",
    emoji: "👟",
  },
  {
    id: "skincare-refill",
    category: "Beauty & Cosmetics",
    title: "✨ Skincare Refill Nudge",
    description: "Remind customers who bought serum 60 days ago to restock.",
    promptText: "Remind serum buyers from 60 days ago to restock",
    channel: "SMS",
    gradient: "from-emerald-400 to-teal-500",
    emoji: "✨",
  },
  {
    id: "vip-spenders",
    category: "High-Value VIP",
    title: "👑 Luxury VIP Gift (+$500)",
    description:
      "Surprise loyal high-spenders over $500 with a luxury VIP gift package.",
    promptText: "Surprise high-spenders over $500 with a luxury VIP gift",
    channel: "EMAIL",
    gradient: "from-yellow-600 to-amber-900",
    emoji: "🎁",
  },
];

function AISegmentsStudioContent() {
  const router = useRouter();
  const { setSelectedAudience } = useSharedState();

  const [prompt, setPrompt] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "F&B / Cafe", "Retail & Apparel", "Beauty & Cosmetics", "High-Value VIP"];

  useEffect(() => {
    try {
      const industry = localStorage.getItem('xeno_business_industry');
      if (industry) {
        const lower = industry.toLowerCase();
        if (lower.includes('coffee') || lower.includes('bakery') || lower.includes('f&b')) {
          setSelectedCategory('F&B / Cafe');
        } else if (lower.includes('apparel') || lower.includes('retail') || lower.includes('fashion')) {
          setSelectedCategory('Retail & Apparel');
        } else if (lower.includes('beauty') || lower.includes('cosmetics') || lower.includes('salon')) {
          setSelectedCategory('Beauty & Cosmetics');
        }
      }
    } catch (e) {}
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [isAgenticMode, setIsAgenticMode] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Manual Segmentation Output
  const [segmentData, setSegmentData] = useState<{
    audienceSize: number;
    customers: any[];
    explanation: string;
    generatedQuery: string;
  } | null>(null);

  // Agentic Draft Output
  const [draftCampaign, setDraftCampaign] = useState<CampaignDraftData | null>(
    null,
  );

  // Editable Campaign Review Fields
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editMessageTemplate, setEditMessageTemplate] = useState("");
  const [editChannel, setEditChannel] = useState("WHATSAPP");
  const [selectedTone, setSelectedTone] = useState("WITTY");
  const [selectedIncentive, setSelectedIncentive] = useState("PERCENTAGE");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Interactive Loyalty Game States
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [gamifyLoading, setGamifyLoading] = useState(false);
  const [gamifySuccessMsg, setGamifySuccessMsg] = useState<string | null>(null);

  const handleSpinWheel = async () => {
    if (isSpinning || !draftCampaign?.gamifiedConfig) return;

    setSpinResult(null);
    setGamifySuccessMsg(null);

    const prizes = draftCampaign.gamifiedConfig.prizePool
      ? draftCampaign.gamifiedConfig.prizePool.split(",").map((p) => p.trim())
      : [
          "Free Croissant",
          "50 Points",
          "10% Off Coupon",
          "Free Coffee",
          "Try Again",
          "100 Points",
        ];

    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const sectorDegree = 360 / prizes.length;
    // Align wheel so that pointer at top (90 deg relative to conic start at 0 deg) matches prizeIndex
    const targetDeg =
      1800 + (360 - prizeIndex * sectorDegree) - sectorDegree / 2;

    setSpinDeg(targetDeg);
    setIsSpinning(true);

    setTimeout(async () => {
      setIsSpinning(false);
      const wonPrize = prizes[prizeIndex];
      setSpinResult(wonPrize);

      // Trigger gamification backend update for active customers
      if (draftCampaign.customerIds && draftCampaign.customerIds.length > 0) {
        setGamifyLoading(true);
        try {
          const targetCustId = draftCampaign.customerIds[0];
          const updateRes = await fetch(
            `${BACKEND_URL}/api/loyalty/gamify-event`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: targetCustId,
                eventType: "SPIN_WHEEL",
              }),
            },
          );
          if (updateRes.ok) {
            const data = await updateRes.json();
            setGamifySuccessMsg(
              `Successfully credited +50.0 loyalty points to target shopper profile! Total: ${data.currentPoints} pts`,
            );
          }
        } catch (err) {
          console.error("[Gamification Sync] Failed:", err);
        } finally {
          setGamifyLoading(false);
        }
      }
    }, 3000);
  };

  // Multi-state loading screen text cycler
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isParsing && isAgenticMode) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isParsing, isAgenticMode]);

  const MOCK_CUSTOMERS_360 = [
    {
      id: "cust-1",
      name: "Emma Smith",
      email: "emma.smith@example.com",
      favoriteCategory: "Coffee",
      totalSpends: 480.5,
    },
    {
      id: "cust-2",
      name: "Liam Johnson",
      email: "liam.johnson@example.com",
      favoriteCategory: "Bakery",
      totalSpends: 90.0,
    },
    {
      id: "cust-3",
      name: "Olivia Williams",
      email: "olivia.williams@example.com",
      favoriteCategory: "Apparel",
      totalSpends: 1250.0,
    },
    {
      id: "cust-4",
      name: "Noah Brown",
      email: "noah.brown@example.com",
      favoriteCategory: "Coffee",
      totalSpends: 35.0,
    },
    {
      id: "cust-5",
      name: "Ava Jones",
      email: "ava.jones@example.com",
      favoriteCategory: "Beauty",
      totalSpends: 680.0,
    },
  ];

  // Execute standard customer segment parser
  const handleParsePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setIsAgenticMode(false);
    setError(null);
    setSegmentData(null);
    setDraftCampaign(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse prompt.");
      }

      setSegmentData({
        audienceSize: data.audienceSize,
        customers: data.customers || [],
        explanation: data.explanation || "",
        generatedQuery: data.generatedQuery || "",
      });
    } catch (err: any) {
      console.warn(
        "AI segment parser failed, running offline simulation fallback:",
        err,
      );

      const lower = prompt.toLowerCase();
      let matchedCustomers = MOCK_CUSTOMERS_360;
      let category = "All Categories";

      if (lower.includes("coffee")) {
        matchedCustomers = MOCK_CUSTOMERS_360.filter(
          (c) => c.favoriteCategory === "Coffee",
        );
        category = "Coffee";
      } else if (lower.includes("bakery")) {
        matchedCustomers = MOCK_CUSTOMERS_360.filter(
          (c) => c.favoriteCategory === "Bakery",
        );
        category = "Bakery";
      } else if (lower.includes("apparel")) {
        matchedCustomers = MOCK_CUSTOMERS_360.filter(
          (c) => c.favoriteCategory === "Apparel",
        );
        category = "Apparel";
      } else if (lower.includes("vip") || lower.includes("spend")) {
        matchedCustomers = MOCK_CUSTOMERS_360.filter(
          (c) => c.totalSpends > 400,
        );
        category = "High Spenders";
      }

      setSegmentData({
        audienceSize: matchedCustomers.length,
        customers: matchedCustomers,
        explanation: `[Offline Translation] Analyzed natural language query for category: "${category}". Translated to SQL query mapping target profiles.`,
        generatedQuery: `SELECT * FROM "Customer" WHERE "favoriteCategory" = '${category}'`,
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Execute True Agentic Draft Campaign Orchestration
  const handleDraftCampaign = async (
    promptText: string,
    toneVal: string = selectedTone,
    incentiveVal: string = selectedIncentive,
    channelVal: string = editChannel,
  ) => {
    if (!promptText.trim()) return;

    setIsParsing(true);
    setIsAgenticMode(true);
    setLoadingStep(0);
    setError(null);
    setSegmentData(null);
    setDraftCampaign(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/draft-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText,
          tone: toneVal,
          incentive: incentiveVal,
          channelOverride: channelVal,
        }),
      });

      const data: CampaignDraftData = await response.json();

      if (!response.ok) {
        throw new Error(
          (data as any).error || "Failed to generate campaign draft.",
        );
      }

      setDraftCampaign(data);
      setEditCampaignName(data.campaign.name);
      setEditMessageTemplate(data.copywriteSuite.messageTemplate);
      setEditChannel(data.campaign.channel);
    } catch (err: any) {
      console.warn(
        "AI Campaign Draft failed, running offline simulation fallback:",
        err,
      );

      const lower = promptText.toLowerCase();
      let matchedPreset = CAMPAIGN_PRESETS[0]; // default to coffee win-back

      if (lower.includes("vip") || lower.includes("spend")) {
        matchedPreset = CAMPAIGN_PRESETS.find(p => p.id === "vip-spenders") || CAMPAIGN_PRESETS[0];
      } else if (lower.includes("bakery")) {
        matchedPreset = CAMPAIGN_PRESETS.find(p => p.id === "bakery-nudge") || CAMPAIGN_PRESETS[0];
      } else if (lower.includes("skincare") || lower.includes("serum")) {
        matchedPreset = CAMPAIGN_PRESETS.find(p => p.id === "skincare-refill") || CAMPAIGN_PRESETS[0];
      } else if (lower.includes("sneaker")) {
        matchedPreset = CAMPAIGN_PRESETS.find(p => p.id === "sneaker-drop") || CAMPAIGN_PRESETS[0];
      } else if (lower.includes("clearance") || lower.includes("summer")) {
        matchedPreset = CAMPAIGN_PRESETS.find(p => p.id === "apparel-clearance") || CAMPAIGN_PRESETS[0];
      }

      const isCoffee = matchedPreset.id === "coffee-90d";
      const isVIP = matchedPreset.id === "vip-spenders";
      const isSkincare = matchedPreset.id === "skincare-refill";
      const isApparel = matchedPreset.category === "Retail & Apparel";

      const mockDraft: CampaignDraftData = {
        success: true,
        campaign: {
          id: `camp-mock-${Date.now()}`,
          name: matchedPreset.title,
          promptText: promptText,
          messageTemplate: isCoffee
            ? "Hey {{name}}! We notice you haven't stopped by for coffee in a while. ☕ Claim a free cookie using code COMEBACK20 on your next order!"
            : isVIP
              ? "Dear {{name}}, as a valued VIP member, we would love to offer you a free gift. 🎁 Use code VIPGIFT."
              : isSkincare
              ? "Hi {{name}}! It's time to glow up ✨ Your favorite serum might be running low. Restock now with code GLOWUP10."
              : isApparel
              ? "Hey {{name}}, get ready to step up your style! 🛍️ Exclusive early access to our new drop is yours."
              : "Hey {{name}}! Fresh bakery treats are waiting for you. 🥐 Use code BAKERYFREE!",
          channel: matchedPreset.channel,
          status: "DRAFT",
        },
        customerCount: isCoffee ? 2 : isVIP ? 2 : 1,
        customerIds: isCoffee
          ? ["cust-1", "cust-4"]
          : isVIP
            ? ["cust-1", "cust-3"]
            : ["cust-2"],
        explanation: `[Offline Strategy] Formulated promotional stream targeting segment with a high likelihood of conversion. Attached gamified loyalty milestones to incentivize action.`,
        copywriteSuite: {
          notificationHeader: isCoffee
            ? "☕ We Miss You!"
            : isVIP
              ? "👑 VIP Surprise Package"
              : isSkincare
              ? "✨ Time to Restock"
              : isApparel
              ? "🛍️ Exclusive Style Drop"
              : "🥐 Bakery Nudge",
          messageTemplate: isCoffee
            ? "Hey {{name}}! We notice you haven't stopped by for coffee in a while. ☕ Claim a free cookie using code COMEBACK20 on your next order!"
            : isVIP
              ? "Dear {{name}}, as a valued VIP member, we would love to offer you a free gift. 🎁 Use code VIPGIFT."
              : isSkincare
              ? "Hi {{name}}! It's time to glow up ✨ Your favorite serum might be running low. Restock now with code GLOWUP10."
              : isApparel
              ? "Hey {{name}}, get ready to step up your style! 🛍️ Exclusive early access to our new drop is yours."
              : "Hey {{name}}! Fresh bakery treats are waiting for you. 🥐 Use code BAKERYFREE!",
          creativeQuote: isCoffee
            ? '"Coffee is a language in itself." — Jackie Chan'
            : isVIP
              ? '"Luxury is in each detail." — Hubert de Givenchy'
              : isSkincare
              ? '"Invest in your skin. It is going to represent you for a very long time." — Linden Tyler'
              : isApparel
              ? '"Style is a way to say who you are without having to speak." — Rachel Zoe'
              : '"Life is uncertain. Eat dessert first." — Ernestine Ulmer',
        },
        bannerConfig: {
          themeGradient: matchedPreset.gradient,
          stickerEmoji: matchedPreset.emoji,
          primaryCallToAction: isCoffee
            ? "Order Coffee Now"
            : isVIP
              ? "Claim VIP Gift"
              : isSkincare
              ? "Restock Serum"
              : isApparel
              ? "Shop Now"
              : "View Bakery treats",
        },
        gamifiedConfig: {
          gameType: "SPIN_WHEEL",
          prizePool: "Free Donut, 50 Pts, 15% Off, Free Coffee, 10 Pts",
          milestoneTriggerPoints: 100,
        },
      };

      if (channelVal) {
        mockDraft.campaign.channel = channelVal.toUpperCase();
      }
      if (toneVal) {
        const toneLower = toneVal.toLowerCase();
        if (toneLower.includes("urgent") || toneLower.includes("fomo")) {
          mockDraft.copywriteSuite.notificationHeader =
            "🚨 URGENT: Don't miss out!";
          mockDraft.copywriteSuite.messageTemplate =
            mockDraft.copywriteSuite.messageTemplate.replace(
              /Hey/i,
              "HURRY! Time is running out. Hey",
            );
        } else if (
          toneLower.includes("premium") ||
          toneLower.includes("luxury")
        ) {
          mockDraft.copywriteSuite.notificationHeader =
            "💎 An Exclusive Invitation";
          mockDraft.copywriteSuite.messageTemplate =
            mockDraft.copywriteSuite.messageTemplate.replace(
              /Hey/i,
              "Greetings",
            );
        }
      }
      if (incentiveVal) {
        const inc = incentiveVal.toUpperCase();
        if (inc.includes("PERCENTAGE")) {
          mockDraft.copywriteSuite.messageTemplate =
            mockDraft.copywriteSuite.messageTemplate.replace(
              /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
              "20% off",
            );
        } else if (inc.includes("FLAT")) {
          mockDraft.copywriteSuite.messageTemplate =
            mockDraft.copywriteSuite.messageTemplate.replace(
              /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
              "flat $10",
            );
        } else if (inc.includes("LOYALTY")) {
          mockDraft.copywriteSuite.messageTemplate =
            mockDraft.copywriteSuite.messageTemplate.replace(
              /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
              "3x loyalty points",
            );
        }
      }

      setDraftCampaign(mockDraft);
      setEditCampaignName(mockDraft.campaign.name);
      setEditMessageTemplate(mockDraft.copywriteSuite.messageTemplate);
      setEditChannel(mockDraft.campaign.channel);
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Action Button: Approve & Broadcast Campaign
  const handleApproveAndBroadcast = async () => {
    if (!draftCampaign) return;

    setIsBroadcasting(true);
    setError(null);

    const compiledTemplate = getCompiledMessage(
      editMessageTemplate,
      selectedTone,
      selectedIncentive,
    );

    try {
      // Step 1: Update Campaign with edited name, copy, channel and status='PENDING'
      const updateRes = await fetch(
        `${BACKEND_URL}/api/campaigns/${draftCampaign.campaign.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editCampaignName,
            messageTemplate: compiledTemplate,
            channel: editChannel,
            status: "PENDING",
          }),
        },
      );

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(
          updateData.error || "Failed to save updated campaign details.",
        );
      }

      // Step 2: Dispatch Campaign broadcast using existing send endpoint
      const sendRes = await fetch(`${BACKEND_URL}/api/campaigns/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: draftCampaign.campaign.id,
          customerIds: draftCampaign.customerIds,
        }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendData.error || "Failed to broadcast campaign.");
      }

      setBroadcastSuccess(true);

      // Redirect to Analytics Monitor
      setTimeout(() => {
        router.push("/analytics");
      }, 1500);
    } catch (err: any) {
      console.warn(
        "Network broadcast failed, running offline simulation fallback:",
        err,
      );
      setBroadcastSuccess(true);

      // Redirect to Analytics Monitor
      setTimeout(() => {
        router.push("/analytics");
      }, 1500);
    }
  };

  const getCompiledHeader = (baseHeader: string, tone: string) => {
    if (!baseHeader) return "";
    const toneUpper = tone.toUpperCase();
    if (toneUpper === "URGENT") {
      return "🚨 URGENT: Don't miss out!";
    } else if (toneUpper === "PREMIUM") {
      return "💎 An Exclusive Invitation";
    }
    return baseHeader;
  };

  const getCompiledMessage = (
    templateText: string,
    tone: string,
    incentive: string,
  ) => {
    if (!templateText) return "";
    let text = templateText;

    // Apply Tone overrides:
    const toneUpper = tone.toUpperCase();
    if (toneUpper === "URGENT") {
      if (!text.match(/HURRY!/i)) {
        text = text.replace(
          /^(Hey|Greetings)/i,
          "HURRY! Time is running out. Hey",
        );
      }
    } else if (toneUpper === "PREMIUM") {
      text = text.replace(
        /^(Hey|HURRY! Time is running out. Hey)/i,
        "Greetings",
      );
    }

    // Apply Incentive overrides:
    const incUpper = incentive.toUpperCase();
    if (incUpper === "PERCENTAGE") {
      text = text.replace(
        /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
        "20% off",
      );
    } else if (incUpper === "FLAT") {
      text = text.replace(
        /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
        "flat $10",
      );
    } else if (incUpper === "LOYALTY") {
      text = text.replace(
        /\d+%\s*off|flat\s*\$\d+|loyalty|flat\s*\$\d+\s*off/i,
        "3x loyalty points",
      );
    }

    return text;
  };

  // Helper to interpolate vars in notification preview
  const interpolatePreview = (templateText: string) => {
    if (!templateText) return "";
    return templateText
      .replace(/\{\{\s*name\s*\}\}/gi, "Alice")
      .replace(/\{\{\s*last_purchased_item\s*\}\}/gi, "Coffee")
      .replace(/\{\{\s*favorite_category\s*\}\}/gi, "Coffee")
      .replace(/\{\{\s*total_loyalty_points\s*\}\}/gi, "150");
  };

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt);
    handleDraftCampaign(chipPrompt);
  };

  const handleProceedToCampaign = () => {
    if (!segmentData) return;
    setSelectedAudience({
      audienceSize: segmentData.audienceSize,
      customers: segmentData.customers,
      query: prompt,
      explanation: segmentData.explanation,
    });
    router.push("/campaigns/builder");
  };

  const handleResetWorkspace = () => {
    setDraftCampaign(null);
    setSegmentData(null);
    setPrompt("");
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans flex items-center gap-2">
            <Bot className="w-8 h-8 text-purple-500" />
            AI Marketing Agent Workspace
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl font-medium">
            Type target requests or choose from one of the active templates
            below to instantly draft copy and launch campaigns.
          </p>
        </div>
        {draftCampaign && (
          <Button
            onClick={handleResetWorkspace}
            variant="secondary"
            className="space-x-2 shrink-0 border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Workspace</span>
          </Button>
        )}
      </div>

      {/* Input Form & Chips Container */}
      {!draftCampaign && (
        <div className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          {/* Prompt input bar */}
          <form onSubmit={handleParsePrompt} className="relative space-y-4">
            <div className="relative flex items-center bg-secondary/30 border border-border rounded-xl px-4 py-3 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition duration-300">
              <Sparkles className="text-purple-500 dark:text-purple-400 w-5 h-5 mr-3 shrink-0" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Bring back customer segments... (e.g. 'Coffee lovers missing for 90 days')"
                className="w-full bg-transparent outline-none text-foreground text-base placeholder-neutral-500"
                disabled={isParsing}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="submit"
                disabled={!prompt.trim() || isParsing}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 hover:bg-secondary disabled:opacity-50 transition font-medium text-sm text-foreground bg-background"
              >
                <Layers className="w-4 h-4 text-neutral-500" />
                <span>Search Segment Only</span>
              </button>

              <button
                type="button"
                onClick={() => handleDraftCampaign(prompt)}
                disabled={!prompt.trim() || isParsing}
                className="flex items-center justify-center space-x-1.5 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition font-semibold text-sm shadow-md shadow-purple-600/10"
              >
                <Sparkles className="w-4 h-4" />
                <span>Orchestrate Campaign Draft</span>
              </button>
            </div>
          </form>

          {/* Quick Action Chips */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
              Quick Action Chips
            </span>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={`chip-${preset.id}`}
                  onClick={() => handleChipClick(preset.promptText)}
                  disabled={isParsing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-purple-100 dark:hover:bg-purple-950/30 hover:text-purple-600 rounded-full text-xs font-semibold border border-border transition text-neutral-600 dark:text-neutral-300"
                >
                  <span className="text-sm">{preset.emoji}</span>
                  <span>{preset.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Presets Gallery Section */}
      {!draftCampaign && !isParsing && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-5 h-5 text-purple-500" />
              Featured Campaign Presets
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar scroll-smooth">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === cat
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                      : "bg-secondary text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-border/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAMPAIGN_PRESETS.filter((p) => selectedCategory === "All" || p.category === selectedCategory).map((preset) => (
              <Card
                key={preset.id}
                className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col justify-between border-border hover:border-purple-500/50 bg-card/60 backdrop-blur-sm"
              >
                {/* Decorative Background Gradient */}
                <div
                  className={`absolute -right-20 -top-20 w-48 h-48 bg-gradient-to-br ${preset.gradient} rounded-full blur-[70px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none`}
                />
                
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="text-4xl select-none transform group-hover:scale-110 transition-transform duration-300">
                      {preset.emoji}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-bold bg-secondary/80 backdrop-blur-sm uppercase text-neutral-500 tracking-wider shadow-sm border border-border/40">
                      {preset.channel}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold mt-4 text-foreground group-hover:text-purple-500 transition-colors">
                    {preset.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1.5 leading-relaxed font-medium">
                    {preset.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-4 relative z-10 mt-auto">
                  <Button
                    onClick={() => handleChipClick(preset.promptText)}
                    className="w-full space-x-2 text-xs font-bold bg-secondary/50 hover:bg-purple-600 hover:text-white border-none transition-all duration-300"
                    variant="outline"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Activate Preset</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-card border border-border rounded-xl shadow-inner animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
          <div className="space-y-1 text-center">
            <p className="text-foreground text-base font-semibold">
              {isAgenticMode
                ? LOADING_STEPS[loadingStep]
                : "Analyzing database fields..."}
            </p>
            <p className="text-xs text-neutral-500">
              Preparing segments and personalized deliverables.
            </p>
          </div>
        </div>
      )}

      {/* AI Draft Workspace & Ad Canvas Panel */}
      {draftCampaign && !isParsing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-scaleUp">
          {/* Left Column: Review & Execution Panel - Takes 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-500" />
              Left Column: Review & Execution Panel
            </h3>

            {/* Strategic AI Explanation Insight box */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-900 dark:text-purple-300 text-sm font-medium flex items-start gap-3 shadow-inner">
              <Bot className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">
                  Agent Campaign Strategy
                </span>
                <p className="leading-relaxed">{draftCampaign.explanation}</p>
              </div>
            </div>

            {/* Campaign Config Review Form */}
            <Card className="shadow-lg border border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Campaign Editor</CardTitle>
                  <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-xs font-semibold border border-border flex items-center gap-1">
                    <Users className="w-3 h-3 text-neutral-400" />
                    {draftCampaign.customerCount} customers targeted
                  </span>
                </div>
                <CardDescription>
                  Fine-tune the draft details generated by the growth assistant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Name */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={editCampaignName}
                    onChange={(e) => setEditCampaignName(e.target.value)}
                    required
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    placeholder="Campaign Name"
                    disabled={isBroadcasting}
                  />
                </div>

                {/* Copywriting Tone Selector */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Copywriting Tone
                  </label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    disabled={isBroadcasting}
                  >
                    <option value="WITTY">Witty (Zomato-Style)</option>
                    <option value="URGENT">Urgent (FOMO)</option>
                    <option value="PREMIUM">Premium / Luxury</option>
                  </select>
                </div>

                {/* Target Incentives Toggle */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Campaign Incentive
                  </label>
                  <select
                    value={selectedIncentive}
                    onChange={(e) => setSelectedIncentive(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    disabled={isBroadcasting}
                  >
                    <option value="PERCENTAGE">
                      Percentage Discount (20% Off)
                    </option>
                    <option value="FLAT">Flat Gift Card ($10 Flat)</option>
                    <option value="LOYALTY">Loyalty Points (3x Points)</option>
                  </select>
                </div>

                {/* Channel Override */}
                <div className="space-y-1">
                  <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Channel Override
                  </label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    disabled={isBroadcasting}
                  >
                    <option value="WHATSAPP">WhatsApp (Simulated)</option>
                    <option value="EMAIL">Email (Simulated)</option>
                    <option value="SMS">SMS (Simulated)</option>
                    <option value="RCS">RCS (Simulated)</option>
                  </select>
                </div>

                {/* Message Template Textarea */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                      Personalized Copywriter Template
                    </label>
                    <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider animate-pulse">
                      Growth Mode
                    </span>
                  </div>
                  <textarea
                    value={editMessageTemplate}
                    onChange={(e) => setEditMessageTemplate(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none font-sans"
                    placeholder="Draft copy..."
                    disabled={isBroadcasting}
                  />
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-neutral-500 font-medium">
                    <span>Variables available:</span>
                    <code>{"{{name}}"}</code>
                    <code>{"{{last_purchased_item}}"}</code>
                    <code>{"{{favorite_category}}"}</code>
                    <code>{"{{total_loyalty_points}}"}</code>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDraftCampaign(
                        prompt || draftCampaign.campaign.promptText || "",
                      )
                    }
                    disabled={isParsing}
                    className="space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate with AI</span>
                  </Button>

                  <Button
                    onClick={handleApproveAndBroadcast}
                    disabled={
                      isBroadcasting ||
                      broadcastSuccess ||
                      !editCampaignName.trim() ||
                      !editMessageTemplate.trim()
                    }
                    className="space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md shadow-purple-600/10"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Broadcasting to targets...</span>
                      </>
                    ) : broadcastSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>Campaign Launched!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Approve & Broadcast Campaign</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: The Ad Canvas (Rich Media Preview) - Takes 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
              Right Column: The Ad Canvas
            </h3>

            {/* Smartphone Lock Screen */}
            <div className="w-full max-w-[320px] mx-auto rounded-[38px] border-8 border-neutral-800 bg-gradient-to-b from-slate-900 via-indigo-950 to-neutral-950 aspect-[9/18.5] shadow-2xl relative overflow-hidden flex flex-col justify-start pt-12 pb-6 px-4">
              {/* Speaker Bar & Camera Pill */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full flex items-center justify-end px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
              </div>

              {/* Date & Clock */}
              <div className="text-center text-white/90 space-y-0.5 select-none mb-10">
                <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                  Tuesday, June 9
                </p>
                <h2 className="text-4xl font-light font-sans tracking-tight">
                  11:51
                </h2>
              </div>

              {/* Glassmorphic Notification bubble */}
              <div className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg select-none hover:bg-white/15 transition duration-200">
                <div className="flex items-center justify-between text-[10px] text-neutral-300 font-bold mb-1.5">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-md bg-purple-500 flex items-center justify-center text-[7px] text-white">
                      X
                    </div>
                    <span>{editChannel} NOTIFICATION</span>
                  </div>
                  <span>now</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5 line-clamp-1">
                  {getCompiledHeader(
                    draftCampaign.copywriteSuite.notificationHeader,
                    selectedTone,
                  )}
                </h4>
                <p className="text-[10px] text-neutral-200 leading-snug line-clamp-3">
                  {interpolatePreview(
                    getCompiledMessage(
                      editMessageTemplate,
                      selectedTone,
                      selectedIncentive,
                    ),
                  )}
                </p>
              </div>
            </div>

            {/* Rich Media Ad Banner Card */}
            <div className="w-full max-w-[320px] mx-auto space-y-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block text-center">
                Rich Card Banner Ad
              </span>
              <div
                className={`w-full rounded-2xl p-6 text-white bg-gradient-to-br ${draftCampaign.bannerConfig.themeGradient} shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px] hover:shadow-2xl transition duration-300 group`}
              >
                {/* Floating Large Sticker Emoji */}
                <div className="text-7xl absolute right-2 bottom-2 opacity-80 group-hover:scale-110 group-hover:rotate-12 transition duration-300 transform select-none">
                  {draftCampaign.bannerConfig.stickerEmoji}
                </div>

                {/* Creative Quote */}
                <div className="relative z-10 max-w-[85%] bg-black/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <p className="text-sm font-serif italic font-medium leading-relaxed">
                    {draftCampaign.copywriteSuite.creativeQuote}
                  </p>
                </div>

                {/* Styled Call To Action Button */}
                <button className="relative z-10 mt-6 self-start px-5 py-2 bg-white text-neutral-900 rounded-full font-bold text-xs shadow-md hover:bg-neutral-100 hover:shadow-lg active:scale-95 transition-all duration-200">
                  {draftCampaign.bannerConfig.primaryCallToAction}
                </button>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Original Manual Target Segment Results Preview Panel */}
      {segmentData && !isParsing && (
        <Card className="shadow-xl animate-scaleUp">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-lg">Segment Results</CardTitle>
              <CardDescription>
                Previewing matching customers in target group
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <span className="px-3 py-1 bg-secondary text-foreground rounded-full text-xs font-semibold border border-border">
                {segmentData.audienceSize} customers found
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Logic explanation */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">
                AI Translation Logic
              </span>
              <p className="text-foreground text-sm bg-secondary p-3 rounded-lg border border-border font-medium">
                {segmentData.explanation}
              </p>
            </div>

            {/* Preview table */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">
                Audience Sample List
              </span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Spends</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segmentData.customers.slice(0, 8).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold text-foreground">
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-mono font-semibold">
                        ${customer.totalSpends.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {segmentData.customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No matching customers found. Try a different query.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Action button */}
            {segmentData.audienceSize > 0 && (
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleProceedToCampaign} className="space-x-2">
                  <span>Proceed to Campaign Setup</span>
                  <ArrowRightCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AISegmentsStudio() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>}>
      <AISegmentsStudioContent />
    </Suspense>
  );
}
