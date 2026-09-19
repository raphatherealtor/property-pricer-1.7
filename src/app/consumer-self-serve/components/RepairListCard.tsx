'use client';
import React from 'react';
import type { CoreIntake, ComputedOutputs } from '@/engine/types';
import { Wind, Home, Droplets, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  computed: ComputedOutputs;
  intake: CoreIntake;
}

function fmt$(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

interface RepairItem {
  id: string;
  name: string;
  age: number;
  life: number;
  estimatedCost: number;
  priority: 'critical' | 'watch' | 'ok';
  icon: React.ReactNode;
  action: string;
}

export default function RepairListCard({ computed, intake }: Props) {
  const { hvacAge, roofAge, whAge, glaSqft, assetClass } = intake;
  const isCommercial = assetClass === 'commercial';

  const priceSf = intake.baselineValue / glaSqft;
  const classMultiplier = priceSf <= 150 ? 0.75 : priceSf <= 350 ? 1.0 : 1.9;

  const hvacRate = isCommercial ? 4.0 : 4.5;
  const roofRate = isCommercial ? 7.5 : 9.5;
  const whRate = isCommercial ? 0.5 : 1.2;

  function itemPriority(age: number, life: number): 'critical' | 'watch' | 'ok' {
    if (age >= life) return 'critical';
    if (age / life >= 0.7) return 'watch';
    return 'ok';
  }

  function itemCost(age: number, life: number, rate: number): number {
    const ageFrac = Math.min(1, age / life);
    return rate * glaSqft * classMultiplier * ageFrac * ageFrac;
  }

  const repairs: RepairItem[] = [
    {
      id: 'repair-hvac',
      name: 'HVAC System',
      age: hvacAge,
      life: 15,
      estimatedCost: itemCost(hvacAge, 15, hvacRate),
      priority: itemPriority(hvacAge, 15),
      icon: <Wind size={18} />,
      action: hvacAge >= 15
        ? 'Replace before listing — inspector will flag as end-of-life'
        : hvacAge >= 10
        ? 'Service and document — buyers will ask about age'
        : 'No action needed — in good working range',
    },
    {
      id: 'repair-roof',
      name: 'Roof',
      age: roofAge,
      life: 20,
      estimatedCost: itemCost(roofAge, 20, roofRate),
      priority: itemPriority(roofAge, 20),
      icon: <Home size={18} />,
      action: roofAge >= 20
        ? 'Replace or credit buyer — lenders may require it'
        : roofAge >= 15
        ? 'Get a roof certification letter to prevent re-trade'
        : 'No action needed — mid-life roof',
    },
    {
      id: 'repair-wh',
      name: 'Water Heater',
      age: whAge,
      life: 10,
      estimatedCost: itemCost(whAge, 10, whRate),
      priority: itemPriority(whAge, 10),
      icon: <Droplets size={18} />,
      action: whAge >= 10
        ? 'Replace now (~$800–1,200) — cheaper than a negotiated credit'
        : whAge >= 7
        ? 'Disclose age — buyers may request credit' :'No action needed',
    },
  ];

  const criticalCount = repairs.filter(r => r.priority === 'critical').length;
  const watchCount = repairs.filter(r => r.priority === 'watch').length;

  const priorityConfig = {
    critical: { color: 'var(--red)', bg: 'var(--red-soft)', border: 'rgba(220,38,38,0.2)', icon: <XCircle size={14} />, label: 'Fix Before Listing' },
    watch: { color: 'var(--amber)', bg: 'var(--amber-soft)', border: 'rgba(217,119,6,0.2)', icon: <AlertTriangle size={14} />, label: 'Watch & Disclose' },
    ok: { color: 'var(--teal)', bg: 'var(--teal-soft)', border: 'rgba(13,148,136,0.2)', icon: <CheckCircle size={14} />, label: 'No Action Needed' },
  };

  return (
    <div className="rounded-2xl p-6 bg-white shadow-sm" style={{ border: '1px solid var(--line)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
            What Needs Attention Before Listing?
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            Based on the ages you entered — these are what inspectors look for first.
          </p>
        </div>
        {criticalCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
            {criticalCount} Critical
          </span>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {repairs.map(item => {
          const cfg = priorityConfig[item.priority];
          return (
            <div
              key={item.id}
              className="rounded-xl p-4"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-1.5 rounded-lg mt-0.5" style={{ background: 'white', color: cfg.color }}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.name}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--ink-2)' }}>
                        {item.age}y old
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: cfg.color }}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                      {item.action}
                    </p>
                  </div>
                </div>
                {item.estimatedCost > 200 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs" style={{ color: 'var(--ink-2)' }}>Est. holdback</div>
                    <div className="text-sm font-mono font-bold" style={{ color: cfg.color }}>
                      {fmt$(item.estimatedCost)}
                    </div>
                  </div>
                )}
              </div>

              {/* Age bar */}
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (item.age / item.life) * 100)}%`,
                    background: cfg.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-2xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                <span>New</span>
                <span>End of life ({item.life}y)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--gray-soft)', border: '1px solid var(--line)' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Total Estimated Repair Budget</div>
          <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
            {criticalCount > 0 ? 'Address these before listing to avoid escrow re-trades' : 'No critical repairs — minor watch items only'}
          </div>
        </div>
        <div className="text-2xl font-mono font-bold" style={{ color: criticalCount > 0 ? 'var(--red)' : 'var(--teal)' }}>
          {fmt$(computed.scaledHoldback)}
        </div>
      </div>
    </div>
  );
}