'use client';

import React from 'react';
import { Mail, MessageCircle, Phone, Calendar, Sparkles } from 'lucide-react';

interface CampaignItem {
  id: string;
  name: string;
  promptText: string | null;
  messageTemplate: string | null;
  channel: string;
  status: string;
  createdAt: string;
}

interface CampaignListProps {
  campaigns: CampaignItem[];
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  
  // Render channel icon dynamically
  const renderChannelIcon = (channel: string) => {
    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case 'WHATSAPP':
        return <MessageCircle className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />;
      case 'SMS':
        return <Phone className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />;
      case 'RCS':
        return <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      default:
        return <Phone className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  // Format status badges
  const renderStatusBadge = (status: string) => {
    const formatted = status.toUpperCase();
    if (formatted === 'COMPLETED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
          COMPLETED
        </span>
      );
    } else if (formatted === 'SENDING' || formatted === 'PENDING') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 animate-pulse">
          SENDING
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
          DRAFT
        </span>
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Campaign Audit Trail</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-500">
          <thead className="bg-secondary text-neutral-500 uppercase text-[10px] tracking-wider border-b border-border">
            <tr>
              <th className="px-6 py-3">Campaign Info</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Message Preview</th>
              <th className="px-6 py-3">Date Launched</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-secondary/40 transition duration-150">
                
                {/* Info */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground block">{campaign.name}</span>
                    {campaign.promptText && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 block italic font-mono truncate max-w-[240px]">
                        Target: "{campaign.promptText}"
                      </span>
                    )}
                  </div>
                </td>

                {/* Channel */}
                <td className="px-6 py-4">
                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-secondary border border-border text-foreground text-xs">
                    {renderChannelIcon(campaign.channel)}
                    <span className="font-mono text-[10px]">{campaign.channel}</span>
                  </div>
                </td>

                {/* Preview */}
                <td className="px-6 py-4 text-xs max-w-xs truncate text-foreground dark:text-neutral-300">
                  {campaign.messageTemplate || '—'}
                </td>

                {/* Date */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(campaign.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-right">
                  {renderStatusBadge(campaign.status)}
                </td>

              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                  No historical campaigns registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
