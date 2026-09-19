'use client';
import React from 'react';
import SlideShell from './SlideShell';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';
import { ArrowRight, Wrench, Eye } from 'lucide-react';

interface Props {
  intake: CoreIntake;
  computed: ComputedOutputs;
  listingAgent: ListingAgentOutputs;
  askPrice: number;
  setAskPrice: (v: number) => void;
}

function fmt$(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function Slide1Conversion({ intake, computed, listingAgent }: Props) {
  const stagingInvestment = 3500;
  const presentationGap = computed.scaledHoldback;
  const netGain = presentationGap * 0.6 - stagingInvestment;

  return (
    <SlideShell
      stage="Stage 2"
      title="The Presentation Gap"
      subtitle="First-impression investment vs the physical inspection holdback that kills deals at the closing table."
    >
      <div className="h-full flex items-center justify-center">
        <div className="grid grid-cols-3 gap-8 w-full max-w-4xl">
          {/* Staging card */}
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <div className="flex items-center gap-2">
              <Eye size={20} style={{ color: '#60A5FA' }} />
              <span className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Staging Investment</span>
            </div>
            <div className="text-4xl font-mono font-bold" style={{ color: 'var(--dark-ink)' }}>
              {fmt$(stagingInvestment)}
            </div>
            <div className="text-sm" style={{ color: 'var(--dark-muted)' }}>
              Professional photography, minor touch-ups, staging consultation — one-time upfront cost
            </div>
            <div className="mt-auto text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(37,99,235,0.15)', color: '#60A5FA' }}>
              Recoverable investment
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center gap-3">
            <ArrowRight size={32} style={{ color: 'var(--dark-muted)' }} />
            <div className="text-center">
              <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>vs escrow re-trade</div>
              <div className="text-2xl font-mono font-bold mt-1" style={{ color: netGain > 0 ? '#34D399' : '#F87171' }}>
                {netGain > 0 ? `+${fmt$(netGain)}` : fmt$(netGain)}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>net advantage</div>
            </div>
          </div>

          {/* Holdback card */}
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-center gap-2">
              <Wrench size={20} style={{ color: '#F87171' }} />
              <span className="text-sm font-semibold" style={{ color: '#F87171' }}>Inspection Holdback</span>
            </div>
            <div className="text-4xl font-mono font-bold" style={{ color: '#F87171' }}>
              {fmt$(presentationGap)}
            </div>
            <div className="text-sm" style={{ color: 'var(--dark-muted)' }}>
              HVAC {intake.hvacAge}y · Roof {intake.roofAge}y · Water Heater {intake.whAge}y — escrow trap at closing
            </div>
            <div className="mt-auto text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(220,38,38,0.15)', color: '#F87171' }}>
              Non-negotiable at close
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}