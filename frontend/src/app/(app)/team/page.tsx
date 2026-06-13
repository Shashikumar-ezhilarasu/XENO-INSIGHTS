'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, Mail, MoreHorizontal, UserCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useTenant } from '../../../lib/authContext';

export default function TeamPage() {
  const { token } = useTenant();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!token) return;
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
        const res = await fetch(`${backendUrl}/api/tenant/team`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load team members', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeam();
  }, [token]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Team Management</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your marketing team members, roles, and CRM access permissions.
          </p>
        </div>
        <Button className="bg-foreground text-background hover:bg-neutral-800 space-x-2">
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center p-12 text-neutral-500">No team members found.</div>
        ) : teamMembers.map((member) => (
          <Card key={member.id} className="overflow-hidden group hover:border-purple-500/50 transition-colors duration-200">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-neutral-500 shrink-0 border border-border">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{member.name}</h4>
                      {member.status === 'active' && <span className="w-2 h-2 rounded-full bg-green-500" />}
                      {member.status === 'away' && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                      {member.status === 'offline' && <span className="w-2 h-2 rounded-full bg-neutral-300" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{member.title}</span>
                      <span className="text-neutral-300">•</span>
                      <Mail className="w-3.5 h-3.5" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-none border-border pt-4 md:pt-0">
                  <div className="flex flex-col md:items-end">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Role Access</span>
                    <Badge variant="outline" className={`mt-1 font-semibold ${member.role === 'Admin' ? 'border-purple-500 text-purple-600 bg-purple-500/10' : 'text-neutral-600'}`}>
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end min-w-[80px]">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Last Active</span>
                    <span className="text-sm font-medium text-foreground mt-1">{member.lastActive || 'N/A'}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
