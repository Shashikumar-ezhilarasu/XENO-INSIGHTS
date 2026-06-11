'use client';

import React from 'react';
import { UserPlus, Shield, Mail, MoreHorizontal, UserCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const TEAM_MEMBERS = [
  {
    id: 'u-1',
    name: 'Sarah Chen',
    role: 'Admin',
    title: 'VP of Marketing',
    email: 'sarah.c@xenobrand.com',
    status: 'active',
    lastActive: 'Just now'
  },
  {
    id: 'u-2',
    name: 'Michael Rodriguez',
    role: 'Editor',
    title: 'CRM Strategy Lead',
    email: 'm.rodriguez@xenobrand.com',
    status: 'active',
    lastActive: '5m ago'
  },
  {
    id: 'u-3',
    name: 'Aisha Patel',
    role: 'Editor',
    title: 'Campaign Manager',
    email: 'apatel@xenobrand.com',
    status: 'away',
    lastActive: '2h ago'
  },
  {
    id: 'u-4',
    name: 'David Kim',
    role: 'Viewer',
    title: 'Data Analyst',
    email: 'david.kim@xenobrand.com',
    status: 'offline',
    lastActive: '1d ago'
  }
];

export default function TeamPage() {
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
        {TEAM_MEMBERS.map((member) => (
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
                    <span className="text-sm font-medium text-foreground mt-1">{member.lastActive}</span>
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
