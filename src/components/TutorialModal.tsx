'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { runEngine, sBase } from '@/engine/core';
import type { CoreIntake } from '@/engine/types';

const STORAGE_KEY = 'pp-tutorial-seen';

// Fresh listing intake
const FRESH_INTAKE: CoreIntake = {
  zip: '10001', baselineValue: 600000, targetPrice: 600000,
  listingState: 'pre_listing', actualDom: null, uiiMonths: 4.8,
  medianDomZip: 40, domClockBasis: 'closed_only',
  glaSqft: 2000, hvacAge: 4, roofAge: 5, whAge: 3, assetClass: 'residential',
};

// Stale listing intake (+10%, slow market)
const STALE_INTAKE: CoreIntake = {
  zip: '77001', baselineValue: 600000, targetPrice: 660000,
  listingState: 'pre_listing', actualDom: null, uiiMonths: 5.8,
  medianDomZip: 65, domClockBasis: 'closed_only',
  glaSqft: 2000, hvacAge: 14, roofAge: 18, whAge: 9, assetClass: 'residential',
};

function MiniSurvivalCurve({ kappaEff, color, label }: { kappaEff: number; color: string; label: string }) {
  const W = 280; const H = 100; const MAX_W = 26;
  const pts: string[] = [];
  for (let i = 0; i <= W; i++) {
    const w = (i / W) * MAX_W;
    const s = sBase(kappaEff * w);
    pts.push(`${i},${H - s * H}`);
  }
  const staleX = (120 / 7 / MAX_W) * W;
  return (
    <div>
      <div className="text-xs font-mono font-semibold mb-2" style={{ color }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg" style={{ height: 80, background: '#111A2E' }}>
        <line x1={staleX} y1={0} x2={staleX} y2={H} stroke="#D97706" strokeWidth="1.5" strokeDasharray="4,3" />
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" />
        <text x={staleX + 3} y={14} fill="#D97706" fontSize="8" fontFamily="monospace">120d</text>
      </svg>
    </div>
  );
}

const STEPS = [
  {
    id: 0,
    title: 'The Cost of Testing a Price',
    body: 'This engine calculates one thing: the probabilistic cost of asking more than the market will immediately accept. Not whether you should — that\'s your call. Just what it costs in expected dollars and time.',
    icon: <DollarSign size={20} />,
    color: '#2563EB',
  },
  {
    id: 1,
    title: 'Two Listings. Same Home. Different Trajectories.',
    body: 'A fresh listing at market value vs. an ambitious listing at +10% in a slow ZIP. Watch the survival curves diverge — the right curve bends toward the 120-day stale threshold.',
    icon: <Clock size={20} />,
    color: '#0D9488',
    showCurves: true,
  },
  {
    id: 2,
    title: 'Where the Math Diverges',
    body: 'The κ_eff dilation formula (1 + 2.1u + 3.8u²) means a 10% overprice doesn\'t add 10% more time — it compounds. The stale listing\'s P(>120d) is 3–5× higher than the fresh listing\'s.',
    icon: <AlertTriangle size={20} />,
    color: '#D97706',
    showDivergence: true,
  },
];

export default function TutorialModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const freshOut = runEngine(FRESH_INTAKE);
  const staleOut = runEngine(STALE_INTAKE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Show after 800ms delay
      timerRef.current = setTimeout(() => setVisible(true), 800);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!visible || dismissed) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: '#0B1220', border: '1px solid #22304A', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#22304A' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${current.color}20`, color: current.color }}>
              {current.icon}
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-0.5" style={{ color: '#8FA1C0' }}>
                60-Second Primer · Step {step + 1} of {STEPS.length}
              </div>
              <div className="text-sm font-bold" style={{ color: '#E8EDF7' }}>{current.title}</div>
            </div>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#8FA1C0' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed mb-5" style={{ color: '#C4D0E8' }}>{current.body}</p>

          {/* Step 1: Side-by-side curves */}
          {current.showCurves && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl p-4" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
                <MiniSurvivalCurve kappaEff={freshOut.kappaEff} color="#34D399" label="Fresh Window — at market" />
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs font-mono" style={{ color: '#8FA1C0' }}>
                    <span>P(&gt;120d)</span>
                    <span style={{ color: '#34D399' }}>{(freshOut.pStale120d * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono" style={{ color: '#8FA1C0' }}>
                    <span>E[DOM]</span>
                    <span style={{ color: '#34D399' }}>{freshOut.expectedDom.toFixed(0)}d</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
                <MiniSurvivalCurve kappaEff={staleOut.kappaEff} color="#F87171" label="Stale Tail — +10%, slow ZIP" />
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs font-mono" style={{ color: '#8FA1C0' }}>
                    <span>P(&gt;120d)</span>
                    <span style={{ color: '#F87171' }}>{(staleOut.pStale120d * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono" style={{ color: '#8FA1C0' }}>
                    <span>E[DOM]</span>
                    <span style={{ color: '#F87171' }}>{staleOut.expectedDom.toFixed(0)}d</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Divergence table */}
          {current.showDivergence && (
            <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid #22304A' }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ background: '#111A2E' }}>
                    <th className="text-left px-4 py-2" style={{ color: '#8FA1C0' }}>Metric</th>
                    <th className="text-center px-4 py-2" style={{ color: '#34D399' }}>Fresh</th>
                    <th className="text-center px-4 py-2" style={{ color: '#F87171' }}>Stale +10%</th>
                    <th className="text-center px-4 py-2" style={{ color: '#D97706' }}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'κ_eff', fresh: freshOut.kappaEff.toFixed(3), stale: staleOut.kappaEff.toFixed(3), delta: `${((staleOut.kappaEff / freshOut.kappaEff - 1) * 100).toFixed(0)}%` },
                    { label: 'P(>120d)', fresh: `${(freshOut.pStale120d * 100).toFixed(1)}%`, stale: `${(staleOut.pStale120d * 100).toFixed(1)}%`, delta: `+${((staleOut.pStale120d - freshOut.pStale120d) * 100).toFixed(1)}pp` },
                    { label: 'E[DOM]', fresh: `${freshOut.expectedDom.toFixed(0)}d`, stale: `${staleOut.expectedDom.toFixed(0)}d`, delta: `+${(staleOut.expectedDom - freshOut.expectedDom).toFixed(0)}d` },
                    { label: 'Cost of Testing', fresh: '$0', stale: `$${staleOut.costOfTesting.toLocaleString()}`, delta: `$${staleOut.costOfTesting.toLocaleString()}` },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(34,48,74,0.5)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="px-4 py-2" style={{ color: '#8FA1C0' }}>{row.label}</td>
                      <td className="px-4 py-2 text-center" style={{ color: '#34D399' }}>{row.fresh}</td>
                      <td className="px-4 py-2 text-center" style={{ color: '#F87171' }}>{row.stale}</td>
                      <td className="px-4 py-2 text-center" style={{ color: '#D97706' }}>{row.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#22304A' }}>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? current.color : '#22304A',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#8FA1C0' }}
            >
              Skip
            </button>
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ color: '#8FA1C0', border: '1px solid #22304A' }}
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold transition-all"
              style={{ background: current.color, color: '#FFFFFF' }}
            >
              {step < STEPS.length - 1 ? 'Next' : 'Open Engine'}
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
