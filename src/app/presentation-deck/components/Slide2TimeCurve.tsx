'use client';
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import SlideShell from './SlideShell';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';
import { runEngine, sBase } from '@/engine/core';

interface Props {
  intake: CoreIntake;
  computed: ComputedOutputs;
  listingAgent: ListingAgentOutputs;
  askPrice: number;
  setAskPrice: (v: number) => void;
  /** Optional: Screen Mode passes a pre-tweened kappa so the curve interpolates
   *  between Supabase broadcast packets instead of snapping. */
  screenKappa?: number;
}

// ─── Memoized point sampler ────────────────────────────────────────────────
function buildPolylinePoints(kappaEff: number, svgW: number, svgH: number, maxWeeks = 26): string {
  const steps = Math.min(svgW, 600);
  const pts: string[] = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) {
    const w = (i / steps) * maxWeeks;
    const s = sBase(kappaEff * w);
    pts[i] = `${((i / steps) * svgW).toFixed(1)},${(svgH - s * svgH).toFixed(1)}`;
  }
  return pts.join(' ');
}

const SVG_W = 600;
const SVG_H = 300;
const MAX_WEEKS = 26;
const STALE_WEEK = 120 / 7;

// Lerp factor per 60fps frame — fast enough to feel 1:1, smooth enough to look fluid
const LERP = 0.22;

export default function Slide2TimeCurve({ intake, computed, listingAgent, askPrice, setAskPrice, screenKappa }: Props) {
  const liveIntake = useMemo(() => ({ ...intake, targetPrice: askPrice }), [intake, askPrice]);
  const liveComputed = useMemo(() => runEngine(liveIntake), [liveIntake]);

  const polylineRef = useRef<SVGPolylineElement>(null);
  const fillPolyRef = useRef<SVGPolygonElement>(null);
  const p50CircleRef = useRef<SVGCircleElement>(null);
  const p50LabelRef = useRef<SVGTextElement>(null);
  const staleTextRef = useRef<SVGTextElement>(null);

  // Animated kappa — lerps toward target every RAF frame at native 60fps
  const kappaRef = useRef(liveComputed.kappaEff);
  const targetKappaRef = useRef(liveComputed.kappaEff);
  const p50DomRef = useRef(liveComputed.p50Dom);
  const pStaleRef = useRef(liveComputed.pStale120d);
  const rafRef = useRef<number | null>(null);

  // Native 60fps RAF ticker — no frame-rate gate, no elapsed check
  const tick = useCallback(() => {
    const current = kappaRef.current;
    const target = targetKappaRef.current;
    const diff = target - current;

    if (Math.abs(diff) > 0.00005) {
      kappaRef.current = current + diff * LERP;
    } else {
      kappaRef.current = target;
    }

    const kappa = kappaRef.current;
    const pts = buildPolylinePoints(kappa, SVG_W, SVG_H, MAX_WEEKS);

    if (polylineRef.current) {
      polylineRef.current.setAttribute('points', pts);
    }
    if (fillPolyRef.current) {
      fillPolyRef.current.setAttribute('points', `0,${SVG_H} ${pts} ${SVG_W},${SVG_H}`);
    }

    const p50Weeks = p50DomRef.current / 7;
    const p50X = (p50Weeks / MAX_WEEKS) * SVG_W;
    if (p50CircleRef.current) {
      p50CircleRef.current.setAttribute('cx', p50X.toFixed(1));
    }
    if (p50LabelRef.current) {
      p50LabelRef.current.setAttribute('x', (p50X + 10).toFixed(1));
      p50LabelRef.current.textContent = `p50 ${Math.round(p50DomRef.current)}d`;
    }
    if (staleTextRef.current) {
      staleTextRef.current.textContent = `${(pStaleRef.current * 100).toFixed(1)}%`;
    }

    // Keep ticking while not settled
    if (Math.abs(targetKappaRef.current - kappaRef.current) > 0.00005) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // When screenKappa prop changes (Screen Mode broadcast), update target only
  useEffect(() => {
    if (screenKappa !== undefined) {
      targetKappaRef.current = screenKappa;
      startTick();
    }
  }, [screenKappa, startTick]);

  // When local slider/intake changes (Desk Mode), update target immediately — zero throttle
  useEffect(() => {
    if (screenKappa !== undefined) return; // Screen Mode drives via screenKappa prop
    targetKappaRef.current = liveComputed.kappaEff;
    p50DomRef.current = liveComputed.p50Dom;
    pStaleRef.current = liveComputed.pStale120d;
    startTick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [liveComputed.kappaEff, liveComputed.p50Dom, liveComputed.pStale120d, screenKappa, startTick]);

  const minAsk = intake.baselineValue * 0.9;
  const maxAsk = intake.baselineValue * 1.25;
  const overpricePct = ((askPrice - intake.baselineValue) / intake.baselineValue * 100);

  const initialPoints = useMemo(() => buildPolylinePoints(liveComputed.kappaEff, SVG_W, SVG_H, MAX_WEEKS), [liveComputed.kappaEff]);
  const p50Weeks = liveComputed.p50Dom / 7;
  const p50X = (p50Weeks / MAX_WEEKS) * SVG_W;
  const staleX = (STALE_WEEK / MAX_WEEKS) * SVG_W;

  const weekLabels = [0, 4, 8, 12, 17, 22, 26];
  const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <SlideShell stage="Stage 3" title="Time" subtitle="">
      <div className="h-full flex flex-col gap-3 overflow-hidden">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          {[
            { label: 'EXPECTED DOM', value: `${liveComputed.expectedDom.toFixed(0)}d`, sub: 'capped at 26 weeks', color: '#0D9488' },
            { label: '4+ MONTH RISK', value: `${(liveComputed.pStale120d * 100).toFixed(1)}%`, sub: 'P(T > 120d)', color: liveComputed.pStale120d > 0.3 ? '#DC2626' : '#D97706' },
            { label: 'K_EFF', value: liveComputed.kappaEff.toFixed(3), sub: 'time warp at this ask', color: '#2563EB' },
          ].map(kpi => (
            <div key={`s2-kpi-${kpi.label}`} className="rounded-xl p-4" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: kpi.color }} />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0' }}>
                  {kpi.label}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '2rem', lineHeight: 1, color: '#E8EDF7' }}>{kpi.value}</div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8FA1C0', marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Ask price slider — drives GSAP tween via Zustand transient state, zero throttle */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)' }}>
              Live Asking Price · 60fps fluid curve
            </span>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: '#E8EDF7' }}>
                ${askPrice.toLocaleString()}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: overpricePct > 0 ? '#D97706' : '#0D9488' }}>
                {overpricePct > 0 ? '+' : ''}{overpricePct.toFixed(1)}%
              </span>
            </div>
          </div>
          <input
            type="range"
            min={minAsk}
            max={maxAsk}
            step={5000}
            defaultValue={askPrice}
            onChange={e => setAskPrice(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#2563EB' }}
          />
          <div className="flex justify-between text-xs font-mono mt-1" style={{ color: '#8FA1C0' }}>
            <span>${minAsk.toLocaleString()}</span>
            <span>baseline ${intake.baselineValue.toLocaleString()}</span>
            <span>${maxAsk.toLocaleString()}</span>
          </div>
        </div>

        {/* SVG Hazard Curve — 60fps fluid, direct DOM mutation via useRef */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden" style={{ background: '#111A2E', border: '1px solid #22304A' }}>
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8FA1C0' }}>
              S(w) · κ_eff {liveComputed.kappaEff.toFixed(3)} · M_base 27.13w · 60fps fluid
            </span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#D97706' }}>
              ── 120d threshold
            </span>
          </div>
          <div className="relative px-2" style={{ height: 'calc(100% - 60px)', minHeight: 220 }}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="none"
              className="w-full h-full"
              style={{ display: 'block' }}
            >
              <defs>
                <linearGradient id="curveGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
                </linearGradient>
                <clipPath id="curveClip2">
                  <rect x="0" y="0" width={SVG_W} height={SVG_H} />
                </clipPath>
              </defs>

              {/* Grid lines */}
              {yLabels.map(y => {
                const svgY = SVG_H - y * SVG_H;
                return (
                  <g key={`grid-y-${y}`}>
                    <line x1="0" y1={svgY} x2={SVG_W} y2={svgY} stroke="rgba(34,48,74,0.7)" strokeWidth="1" />
                    <text x="4" y={svgY - 3} fill="#8FA1C0" fontSize="10" fontFamily="var(--font-mono)">{y.toFixed(2)}</text>
                  </g>
                );
              })}
              {weekLabels.map(w => {
                const svgX = (w / MAX_WEEKS) * SVG_W;
                return (
                  <g key={`grid-x-${w}`}>
                    <line x1={svgX} y1="0" x2={svgX} y2={SVG_H} stroke="rgba(34,48,74,0.7)" strokeWidth="1" />
                    <text x={svgX + 3} y={SVG_H - 4} fill="#8FA1C0" fontSize="10" fontFamily="var(--font-mono)">{w}w</text>
                  </g>
                );
              })}

              {/* Filled area */}
              <polygon
                ref={fillPolyRef}
                points={`0,${SVG_H} ${initialPoints} ${SVG_W},${SVG_H}`}
                fill="url(#curveGrad2)"
                clipPath="url(#curveClip2)"
              />

              {/* Main survival curve — mutated directly by 60fps RAF ticker */}
              <polyline
                ref={polylineRef}
                points={initialPoints}
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
                clipPath="url(#curveClip2)"
              />

              {/* 120d stale threshold */}
              <line x1={staleX} y1="0" x2={staleX} y2={SVG_H} stroke="#D97706" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x={staleX + 5} y="20" fill="#D97706" fontSize="10" fontFamily="var(--font-mono)">120d</text>
              <text ref={staleTextRef} x={staleX + 5} y="34" fill="#D97706" fontSize="10" fontFamily="var(--font-mono)">
                {(liveComputed.pStale120d * 100).toFixed(1)}%
              </text>

              {/* p50 dot */}
              <circle
                ref={p50CircleRef}
                cx={p50X.toFixed(1)}
                cy={(SVG_H / 2).toFixed(1)}
                r="5"
                fill="#2563EB"
                stroke="#E8EDF7"
                strokeWidth="1.5"
              />
              <text
                ref={p50LabelRef}
                x={(p50X + 10).toFixed(1)}
                y={(SVG_H / 2 - 10).toFixed(1)}
                fill="#2563EB"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                p50 {Math.round(liveComputed.p50Dom)}d
              </text>
            </svg>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}