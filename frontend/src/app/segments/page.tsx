'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedState } from '../../hooks/useSharedState';
import { Sparkles, ArrowRight, Loader2, Users, ArrowRightCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function SegmentsPage() {
  const router = useRouter();
  const { setSelectedAudience } = useSharedState();

  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [segmentData, setSegmentData] = useState<{
    audienceSize: number;
    customers: any[];
    explanation: string;
    generatedQuery: string;
  } | null>(null);

  const handleParsePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsParsing(true);
    setError(null);
    setSegmentData(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse prompt.');
      }

      setSegmentData({
        audienceSize: data.audienceSize,
        customers: data.customers || [],
        explanation: data.explanation || '',
        generatedQuery: data.generatedQuery || '',
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during query generation.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleProceedToCampaign = () => {
    if (!segmentData) return;
    
    // Save to Shared State Context
    setSelectedAudience({
      audienceSize: segmentData.audienceSize,
      customers: segmentData.customers,
      query: prompt,
      explanation: segmentData.explanation
    });

    // Navigate to Campaign Setup router page
    router.push('/campaigns');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-neutral-500 bg-clip-text text-transparent font-sans">
          AI-Native Target Segmentation
        </h1>
        <p className="text-sm text-neutral-500 max-w-xl font-medium">
          Type queries like *"spent over $50 on Coffee"* to filter matching customers instantly using Gemini translation.
        </p>
      </div>

      {/* Prompt Bar */}
      <form onSubmit={handleParsePrompt} className="relative">
        <div className="relative flex items-center bg-card border border-border rounded-xl px-4 py-3.5 shadow-md focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition duration-300">
          <Sparkles className="text-purple-500 dark:text-purple-400 w-5 h-5 mr-3 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to filter targets (e.g., 'Find customers who spent over $50 on Coffee')"
            className="w-full bg-transparent outline-none text-foreground text-base placeholder-neutral-500"
            disabled={isParsing}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isParsing}
            className="flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50 transition shrink-0"
          >
            {isParsing ? (
              <Loader2 className="w-5 h-5 animate-spin text-foreground" />
            ) : (
              <ArrowRight className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </form>

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isParsing && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-neutral-500 text-sm animate-pulse">Gemini is translating prompt to database query filters...</p>
        </div>
      )}

      {/* Segment Preview Panel */}
      {segmentData && (
        <Card className="shadow-xl animate-scaleUp">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
            <div>
              <CardTitle className="text-lg">Segment Results</CardTitle>
              <CardDescription>Previewing matching customers in target group</CardDescription>
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
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">AI Translation Logic</span>
              <p className="text-foreground text-sm bg-secondary p-3 rounded-lg border border-border font-medium">
                {segmentData.explanation}
              </p>
            </div>

            {/* Preview table */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider block font-semibold">Audience Sample List</span>
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
                      <TableCell className="font-semibold text-foreground">{customer.name}</TableCell>
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
