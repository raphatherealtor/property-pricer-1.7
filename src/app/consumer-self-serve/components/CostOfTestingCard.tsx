'use client';
import React from 'react';
import type { CoreIntake, ComputedOutputs } from '@/engine/types';
import { AlertTriangle, TrendingDown, Clock } from 'lucide-react';

interface Props {
  computed: ComputedOutputs;
  intake: CoreIntake;
}

function fmt$(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function CostOfTestingCard({ computed, intake }: Props) {
  const overpricePct = ((intake.targetPrice - intake.baselineValue) / intake.baselineValue) * 100;
  const isOverpriced = overpricePct > 2;
  const riskLevel = computed.pStale120d > 0.35 ? 'high' : computed.pStale120d > 0.18 ? 'medium' : 'low';

  const riskColors = {
    high: { bg: 'rgba(220,38,38,0.04)', border: 'rgba(220,38,38,0.2)', accent: '#DC2626', light: 'var(--red-soft)' },
    medium: { bg: 'rgba(217,119,6,0.04)', border: 'rgba(217,119,6,0.2)', accent: '#D97706', light: 'var(--amber-soft)' },
    low: { bg: 'rgba(13,148,136,0.04)', border: 'rgba(13,148,136,0.2)', accent: '#0D9488', light: 'var(--teal-soft)' },
  };
  const c = riskColors[riskLevel];

  return (
    <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: `2px solid ${c.border}` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: c.light }}>
            <TrendingDown size={18} style={{ color: c.accent }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
              Cost of Testing Your Price
            </h3>
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
              What you risk by asking above market value
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.light, color: c.accent }}>
          {riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Main cost */}
      <div className="rounded-xl p-4 mb-4" style={{ background: isOverpriced ? c.bg : 'var(--gray-soft)', border: `1px solid ${c.border}` }}>
        <div className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>
          {isOverpriced
            ? `By asking ${overpricePct.toFixed(1)}% above your estimated value, you could lose:`
            : 'Your asking price is at or below estimated value — minimal cost of testing.'}
        </div>
        <div className="text-4xl font-mono font-bold" style={{ color: c.accent }}>
          {fmt$(Math.max(0, computed.costOfTesting))}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
          compared to pricing at your estimated value
        </div>
      </div>

      {/* Supporting metrics — plain English */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gray-soft)' }}>
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>
              How long it might sit on the market
            </span>
          </div>
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--ink)' }}>
            {computed.expectedDom.toFixed(0)} days
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gray-soft)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} style={{ color: computed.pStale120d > 0.25 ? 'var(--amber)' : 'var(--ink-2)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>
              Chance it sits 4+ months
            </span>
          </div>
          <span className="text-sm font-semibold font-mono" style={{ color: computed.pStale120d > 0.25 ? 'var(--amber)' : 'var(--ink)' }}>
            {(computed.pStale120d * 100).toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--gray-soft)' }}>
          <div className="flex items-center gap-2">
            <TrendingDown size={15} style={{ color: 'var(--ink-2)' }} />
            <span className="text-sm" style={{ color: 'var(--ink)' }}>
              Likely final sale price
            </span>
          </div>
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--ink)' }}>
            {fmt$(computed.expectedSalePrice)}
          </span>
        </div>
      </div>

      {/* Bottom message */}
      {isOverpriced && computed.pStale120d > 0.2 && (
        <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: c.light }}>
          <AlertTriangle size={14} style={{ color: c.accent, marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            If your home sits on the market for 4+ months, buyers often negotiate harder. 
            The final price could be <strong>{fmt$(intake.targetPrice * (1 - 0.084))}</strong> — 
            that&apos;s the worst-case floor.
          </p>
        </div>
      )}
    </div>
  );
}