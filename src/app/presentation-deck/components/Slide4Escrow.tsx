'use client';
import React from 'react';
import SlideShell from './SlideShell';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';

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

export default function Slide4Escrow({ intake, computed, listingAgent }: Props) {
  const hvacLife = 15;
  const roofLife = 20;
  const whLife = 10;

  const isCommercial = intake.assetClass === 'commercial';
  const rates = isCommercial ? { hvac: 4.0, roof: 7.5, wh: 0.5 } : { hvac: 4.5, roof: 9.5, wh: 1.2 };
  const priceSf = intake.baselineValue / intake.glaSqft;
  const classMultiplier = priceSf <= 150 ? 0.75 : priceSf <= 350 ? 1.0 : 1.9;

  function systemHoldback(age: number, life: number, rate: number) {
    if (age >= life) return rate * intake.glaSqft * classMultiplier;
    const ageFrac = age / life;
    return rate * intake.glaSqft * classMultiplier * ageFrac * ageFrac;
  }

  const hvacHb = systemHoldback(intake.hvacAge, hvacLife, rates.hvac);
  const roofHb = systemHoldback(intake.roofAge, roofLife, rates.roof);
  const whHb = systemHoldback(intake.whAge, whLife, rates.wh);
  const totalHoldback = hvacHb + roofHb + whHb;
  const fullReplacement = (rates.hvac + rates.roof + rates.wh) * intake.glaSqft * classMultiplier;

  const repairFirstNet = computed.anchoredNetProceeds - totalHoldback;
  const priceItInNet = computed.netProceeds;
  const repairRoi = totalHoldback > 0 ? ((repairFirstNet - priceItInNet) / totalHoldback * 100 - 100).toFixed(0) : '0';

  const systems = [
    { name: 'HVAC', age: intake.hvacAge, life: hvacLife, holdback: hvacHb, color: '#0D9488' },
    { name: 'Roof', age: intake.roofAge, life: roofLife, holdback: roofHb, color: '#2563EB' },
    { name: 'Water Heater', age: intake.whAge, life: whLife, holdback: whHb, color: '#D97706' },
  ];

  return (
    <SlideShell stage="Stage 4" title="Escrow & close" subtitle="">
      <div className="h-full grid grid-cols-2 gap-5">
        {/* Left: Mechanical Holdback */}
        <div className="rounded-2xl p-6" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
            Mechanical Holdback
          </div>
          <div className="space-y-5">
            {systems.map(sys => (
              <div key={sys.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#E8EDF7' }}>{sys.name}</span>
                  <span className="text-sm font-mono" style={{ color: '#8FA1C0' }}>
                    {sys.age}y / {sys.life}y · {fmt$(sys.holdback)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#22304A' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (sys.age / sys.life) * 100)}%`,
                      background: sys.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 space-y-2" style={{ borderTop: '1px solid #22304A' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FA1C0' }}>
                Scaled Holdback · M_class {classMultiplier.toFixed(2)}
              </span>
              <span className="text-sm font-mono font-bold" style={{ color: '#E8EDF7' }}>{fmt$(totalHoldback)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FA1C0' }}>
                Full Replacement Ceiling
              </span>
              <span className="text-sm font-mono" style={{ color: '#8FA1C0' }}>{fmt$(fullReplacement)}</span>
            </div>
          </div>
        </div>

        {/* Right: Decision cards */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl p-6" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
              Repair First
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: '#E8EDF7', marginBottom: 8 }}>
              {fmt$(repairFirstNet)}
            </div>
            <div className="text-sm" style={{ color: '#8FA1C0' }}>
              Net after paying holdback now and avoiding a 1.15× re-trade concession.
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-6" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
              Price It In
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '2.5rem', lineHeight: 1, color: '#E8EDF7', marginBottom: 8 }}>
              {fmt$(priceItInNet)}
            </div>
            <div className="text-sm" style={{ color: '#8FA1C0' }}>
              Expected net at the current ask, leaving inspection to the buyer. Repair ROI {repairRoi}%.
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}