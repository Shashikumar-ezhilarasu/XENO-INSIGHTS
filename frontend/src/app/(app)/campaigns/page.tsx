'use client';

import React from 'react';
import { HardHat } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center">
        <HardHat className="w-10 h-10 text-purple-500" />
      </div>
      <h1 className="text-3xl font-bold text-foreground tracking-tight">Campaign Manager</h1>
      <p className="text-neutral-500 max-w-md text-center font-medium">
        This module is currently under construction. We are building a next-generation campaign orchestration experience. Check back soon!
      </p>
    </div>
  );
}
