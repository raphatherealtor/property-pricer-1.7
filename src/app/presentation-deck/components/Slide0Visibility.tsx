'use client';
import React from 'react';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';
import SlideShell from './SlideShell';

interface Props {
  intake: CoreIntake;
  computed: ComputedOutputs;
  listingAgent: ListingAgentOutputs;
  askPrice: number;
  setAskPrice: (v: number) => void;
}

export default function Slide0Visibility({ intake, computed, listingAgent }: Props) {
  const askGrain = Math.ceil(intake.targetPrice / 50000) * 50000;
  const baseGrain = Math.ceil(intake.baselineValue / 50000) * 50000;
  const underGrain = baseGrain - 50000;
  const askCapture = listingAgent.searchBrackets?.[0]?.demandCapture || 0.53;

  const displayBrackets = [
    { label: `Just under $${(underGrain / 1000).toFixed(0)}k`, capture: 0.37, color: '#0D9488' },
    { label: `At baseline $${(intake.baselineValue / 1000).toFixed(0)}k`, capture: 0.78, color: '#2563EB' },
    { label: `At ask $${(intake.targetPrice / 1000).toFixed(0)}k`, capture: askCapture, color: '#D97706' },
  ];

  return (
    <SlideShell stage="Stage 1" title="Visibility" subtitle="">
      <div className="h-full grid grid-cols-2 gap-8 items-start pt-4">
        {/* Left: Summary */}
        <div className="flex flex-col gap-5">
          <p className="text-lg leading-relaxed" style={{ color: '#8FA1C0' }}>
            Buyers search in $50k grains. Listing above a grain is invisible
            to everyone whose max budget stops at that line.
          </p>
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #22304A' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              At This Ask
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '4rem', lineHeight: 1, color: '#E8EDF7', marginBottom: 8 }}>
              {Math.round(askCapture * 100)}%
            </div>
            <div className="text-sm" style={{ color: '#8FA1C0' }}>
              of nearby searchers still see the listing
            </div>
          </div>
        </div>

        {/* Right: Bar chart */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #22304A' }}>
          <div className="space-y-5">
            {displayBrackets.map((bracket, i) => (
              <div key={`bracket-${i}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#E8EDF7' }}>{bracket.label}</span>
                  <span className="text-sm font-mono font-bold" style={{ color: '#E8EDF7' }}>
                    {Math.round(bracket.capture * 100)}% capture
                  </span>
                </div>
                <div className="h-10 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-lg transition-all duration-700"
                    style={{ width: `${bracket.capture * 100}%`, background: bracket.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}