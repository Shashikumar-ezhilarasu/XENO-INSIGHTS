'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../../lib/authContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Loader2, Settings, Building, Save } from 'lucide-react';

export default function SettingsPage() {
  const { tenant, token } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    brandCategory: '',
    accentColor: '',
    kpiPrimaryLabel: '',
    kpiRevenueLabel: ''
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        brandName: tenant.brandName || '',
        brandCategory: tenant.brandCategory || '',
        accentColor: tenant.accentColor || '',
        kpiPrimaryLabel: tenant.preferences?.kpiPrimaryLabel || '',
        kpiRevenueLabel: tenant.preferences?.kpiRevenueLabel || ''
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
        alert('Settings saved successfully. Please refresh to see changes.');
      } else {
        alert('Failed to save settings.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8 text-neutral-400" />
            Global Tenant Settings
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure your brand identity and data preferences across all applications.
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
