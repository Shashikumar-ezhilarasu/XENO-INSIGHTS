'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../../../lib/authContext';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Loader2, Settings, Building, Save } from 'lucide-react';

export default function BusinessProfilePage() {
  const { tenant, token } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    brandCategory: '',
    accentColor: '',
    kpiPrimaryLabel: '',
    kpiRevenueLabel: '',
    dbUri: ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        brandName: tenant.brandName || '',
        brandCategory: tenant.brandCategory || '',
        accentColor: tenant.accentColor || '',
        kpiPrimaryLabel: tenant.preferences?.kpiPrimaryLabel || '',
        kpiRevenueLabel: tenant.preferences?.kpiRevenueLabel || '',
        dbUri: tenant.preferences?.dbUri || ''
      });
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/tenant/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Profile saved successfully. Please refresh to see changes.');
      } else {
        alert('Failed to save profile.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="w-8 h-8 text-neutral-400" />
            Business Profile
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure your brand identity and data preferences across the platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="w-5 h-5 text-purple-500" />
              Brand Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-400">Brand Name</label>
              <Input 
                value={formData.brandName}
                onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-400">Brand Category</label>
              <Input 
                value={formData.brandCategory}
                onChange={e => setFormData({ ...formData, brandCategory: e.target.value })}
                className="mt-1"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-400">Accent Color (Hex)</label>
              <Input 
                value={formData.accentColor}
                onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-blue-500" />
              Preferences & Labels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-400">KPI Primary Label</label>
              <Input 
                value={formData.kpiPrimaryLabel}
                onChange={e => setFormData({ ...formData, kpiPrimaryLabel: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-400">KPI Revenue Label</label>
              <Input 
                value={formData.kpiRevenueLabel}
                onChange={e => setFormData({ ...formData, kpiRevenueLabel: e.target.value })}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-purple-500/30 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Live Datasource Syncing
            </CardTitle>
            <p className="text-sm text-neutral-400">
              Connect your live PostgreSQL database to XENO CRM to directly compile customer aggregates and lifetime spend records.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-400">Database Connection URI</label>
              <Input 
                type="password"
                placeholder="postgresql://user:password@host:port/database"
                value={formData.dbUri}
                onChange={e => setFormData({ ...formData, dbUri: e.target.value })}
                className="mt-1 font-mono text-sm bg-black/40 border-purple-500/20 focus:border-purple-500"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Your credentials are encrypted and stored securely. XENO only requires READ access to your replica or pooler.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
