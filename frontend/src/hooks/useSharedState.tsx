'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpends: number;
}

export interface AudienceData {
  audienceSize: number;
  customers: Customer[];
  query: string;
  explanation: string;
}

interface SharedStateContextType {
  selectedAudience: AudienceData | null;
  setSelectedAudience: (data: AudienceData | null) => void;
  campaignTemplate: string;
  setCampaignTemplate: (template: string) => void;
  campaignChannel: string;
  setCampaignChannel: (channel: string) => void;
}

const SharedStateContext = createContext<SharedStateContextType | undefined>(undefined);

export function SharedStateProvider({ children }: { children: ReactNode }) {
  const [selectedAudience, setSelectedAudience] = useState<AudienceData | null>(null);
  const [campaignTemplate, setCampaignTemplate] = useState('Hey {{name}}, here is 10% off your next Coffee!');
  const [campaignChannel, setCampaignChannel] = useState('WHATSAPP');

  return (
    <SharedStateContext.Provider
      value={{
        selectedAudience,
        setSelectedAudience,
        campaignTemplate,
        setCampaignTemplate,
        campaignChannel,
        setCampaignChannel
      }}
    >
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error('useSharedState must be used within a SharedStateProvider');
  }
  return context;
}
