'use client';
import React from 'react';
import SlideShell from './SlideShell';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

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

export default function Slide3PriceBridge({ intake, computed }: Props) {
  const staleFloor = intake.targetPrice * (1 - 0.084);

  const data = [
    { name: 'Baseline Value', value: intake.baselineValue, color: '#34D399' },
    { name: 'Expected Offer', value: computed.expectedSalePrice, color: '#60A5FA' },
    { name: '8.4% Stale Floor', value: staleFloor, color: '#F87171' },
  ];

  return (
    <SlideShell
      stage="Stage 3 · Price"
      title="The Price Reality Bridge"
      subtitle="Three scenarios — where you think you'll land vs where the market will take you."
    >
      <div className="h-full flex flex-col gap-6">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 30, right: 40, left: 20, bottom: 0 }} barSize={80}>
              <XAxis dataKey="name" tick={{ fill: 'var(--dark-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={{ stroke: 'var(--dark-line)' }} />
              <YAxis
                tick={{ fill: 'var(--dark-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                domain={[staleFloor * 0.95, intake.baselineValue * 1.02]}
              />
              <Tooltip
                contentStyle={{ background: 'var(--dark-panel)', border: '1px solid var(--dark-line)', borderRadius: 10, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--dark-ink)' }}
                formatter={(v: number) => [fmt$(v), 'Price']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => fmt$(v)}
                  style={{ fill: 'var(--dark-ink)', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
                {data.map((entry, index) => (
                  <Cell key={`bridge-cell-${index}`} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Delta annotations */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--dark-muted)' }}>Expected discount from ask</div>
            <div className="text-2xl font-mono font-bold" style={{ color: '#60A5FA' }}>
              −{fmt$(intake.targetPrice - computed.expectedSalePrice)}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
              {(computed.expectedDiscountPct * 100).toFixed(1)}% at E[DOM] = {computed.expectedDom.toFixed(0)}d
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--dark-muted)' }}>Stale floor vs baseline</div>
            <div className="text-2xl font-mono font-bold" style={{ color: '#F87171' }}>
              −{fmt$(intake.baselineValue - staleFloor)}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
              8.4% haircut at 120d+ · worst case
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}