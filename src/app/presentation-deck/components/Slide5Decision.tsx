'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import SlideShell from './SlideShell';
import type { CoreIntake, ComputedOutputs, ListingAgentOutputs } from '@/engine/types';
import { CheckCircle, XCircle } from 'lucide-react';
import PdfExportButton from '@/app/components/PdfExportButton';

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

interface ScenarioRow {
  label: string;
  fresh: string;
  ambitious: string;
  freshGood: boolean;
  freshRef: React.RefObject<HTMLTableCellElement | null>;
  ambiRef: React.RefObject<HTMLTableCellElement | null>;
}

// SVG neon highlighter sweep component
function HighlighterSweep({ active, color }: { active: boolean; color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.2s' }}
    >
      <defs>
        <linearGradient id={`sweep-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="40%" stopColor={color} stopOpacity="0.25" />
          <stop offset="60%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="0" y="0" width="100%" height="100%"
        fill={`url(#sweep-${color.replace('#', '')})`}
        style={{
          animation: active ? 'highlighterSweep 0.5s ease-out forwards' : 'none',
        }}
      />
    </svg>
  );
}

export default function Slide5Decision({ intake, computed, listingAgent }: Props) {
  const [activePath, setActivePath] = useState<'fresh' | 'ambitious'>('fresh');
  const [sweepKey, setSweepKey] = useState(0);

  const staleCarry = 0.007 * intake.targetPrice * (120 / 30.4);
  const staleSale = intake.targetPrice * (1 - 0.084);
  const staleNet = staleSale - staleCarry - computed.scaledHoldback;

  const caseId = `PP-${btoa(JSON.stringify({ zip: intake.zip, baseline: intake.baselineValue })).slice(0, 8).toUpperCase()}`;

  // Refs for each highlighted cell
  const freshNetRef = useRef<HTMLTableCellElement>(null);
  const ambiNetRef = useRef<HTMLTableCellElement>(null);
  const freshRiskRef = useRef<HTMLTableCellElement>(null);
  const ambiRiskRef = useRef<HTMLTableCellElement>(null);

  const rows = [
    { label: 'Asking Price', fresh: fmt$(intake.baselineValue), ambitious: fmt$(intake.targetPrice), freshGood: true },
    { label: 'Expected DOM', fresh: `${computed.p50Dom.toFixed(0)}d`, ambitious: `${computed.expectedDom.toFixed(0)}d`, freshGood: true },
    { label: 'P(>120d Stale)', fresh: `${(computed.pStale120d * 0.5 * 100).toFixed(1)}%`, ambitious: `${(computed.pStale120d * 100).toFixed(1)}%`, freshGood: true, freshRef: freshRiskRef, ambiRef: ambiRiskRef },
    { label: 'Expected Discount', fresh: '1.9%', ambitious: `${(computed.expectedDiscountPct * 100).toFixed(1)}%`, freshGood: true },
    { label: 'Escrow Holdback', fresh: fmt$(computed.scaledHoldback), ambitious: fmt$(computed.scaledHoldback), freshGood: false },
    { label: 'Net Proceeds', fresh: fmt$(listingAgent.freshNetProceeds), ambitious: fmt$(staleNet), freshGood: true, freshRef: freshNetRef, ambiRef: ambiNetRef },
  ];

  const handleToggle = useCallback((path: 'fresh' | 'ambitious') => {
    setActivePath(path);
    setSweepKey(k => k + 1);
  }, []);

  return (
    <SlideShell
      stage="The Decision Matrix"
      title="Fresh Path vs Ambitious Path"
      subtitle="Side-by-side scenario comparison. Every number is engine-computed — not a heuristic estimate."
    >
      {/* Inject highlighter sweep keyframe */}
      <style>{`
        @keyframes highlighterSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="h-full flex flex-col gap-5">
        {/* Path toggle */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>Highlight:</span>
          {(['fresh', 'ambitious'] as const).map(path => (
            <button
              key={path}
              onClick={() => handleToggle(path)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activePath === path ? (path === 'fresh' ? '#34D399' : '#F87171') : 'transparent',
                color: activePath === path ? '#0B1220' : 'var(--dark-muted)',
                border: `1px solid ${path === 'fresh' ? '#34D399' : '#F87171'}`,
              }}
            >
              {path === 'fresh' ? '✓ Fresh Path' : '✗ Ambitious Path'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-xl" style={{ border: '1px solid var(--dark-line)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--dark-panel)', borderBottom: '1px solid var(--dark-line)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--dark-muted)' }}>
                  Metric
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#34D399' }}>
                  Fresh Path
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#F87171' }}>
                  Ambitious Path
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isNetRow = row.label === 'Net Proceeds';
                const isRiskRow = row.label === 'P(>120d Stale)';
                const shouldHighlight = isNetRow || isRiskRow;

                return (
                  <tr
                    key={`decision-row-${i}`}
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(34,48,74,0.5)',
                    }}
                  >
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--dark-muted)' }}>{row.label}</td>
                    <td
                      ref={isNetRow ? freshNetRef : isRiskRow ? freshRiskRef : undefined}
                      className="px-5 py-3 text-center relative overflow-hidden"
                      style={{
                        background: shouldHighlight && activePath === 'fresh' ? 'rgba(52,211,153,0.08)' : 'transparent',
                        transition: 'background 0.3s',
                      }}
                    >
                      {shouldHighlight && activePath === 'fresh' && (
                        <HighlighterSweep key={`fresh-${sweepKey}`} active color="#34D399" />
                      )}
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {row.freshGood ? <CheckCircle size={14} style={{ color: '#34D399' }} /> : <XCircle size={14} style={{ color: '#F87171' }} />}
                        <span className="font-mono font-semibold text-sm" style={{ color: row.freshGood ? '#34D399' : '#F87171' }}>{row.fresh}</span>
                      </div>
                    </td>
                    <td
                      ref={isNetRow ? ambiNetRef : isRiskRow ? ambiRiskRef : undefined}
                      className="px-5 py-3 text-center relative overflow-hidden"
                      style={{
                        background: shouldHighlight && activePath === 'ambitious' ? 'rgba(248,113,113,0.08)' : 'transparent',
                        transition: 'background 0.3s',
                      }}
                    >
                      {shouldHighlight && activePath === 'ambitious' && (
                        <HighlighterSweep key={`ambi-${sweepKey}`} active color="#F87171" />
                      )}
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {!row.freshGood ? <CheckCircle size={14} style={{ color: '#34D399' }} /> : <XCircle size={14} style={{ color: '#F87171' }} />}
                        <span className="font-mono font-semibold text-sm" style={{ color: !row.freshGood ? '#34D399' : '#F87171' }}>{row.ambitious}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PDF export */}
        <div className="flex-shrink-0 flex items-center justify-between rounded-xl p-4" style={{ background: 'var(--dark-panel)', border: '1px solid var(--dark-line)' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--dark-ink)' }}>
              Export Audit-Stamped Report
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
              Engine v1.6.1 · Case {caseId} · 2-page landscape PDF
            </div>
          </div>
          <PdfExportButton intake={intake} computed={computed} listingAgent={listingAgent} caseId={caseId} />
        </div>
      </div>
    </SlideShell>
  );
}