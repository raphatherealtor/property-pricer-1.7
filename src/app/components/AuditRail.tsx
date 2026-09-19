'use client';
import React from 'react';
import type { ComputedOutputs, CoreIntake } from '@/engine/types';
import { Copy, AlertTriangle, CheckCircle, Terminal, Monitor, FileText } from 'lucide-react';
import Link from 'next/link';

interface Props {
  computed: ComputedOutputs;
  intake: CoreIntake;
  onCopyJson: () => void;
}

function TraceRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(34,48,74,0.4)' }}>
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0D9488' }}>FW</span>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#8FA1C0' }}>{label}</span>
      </div>
      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: color || '#E8EDF7' }}>
        {value}
      </span>
    </div>
  );
}

export default function AuditRail({ computed, intake, onCopyJson }: Props) {
  const inputHash = typeof window !== 'undefined'
    ? btoa(JSON.stringify({ zip: intake.zip, baseline: intake.baselineValue, target: intake.targetPrice })).slice(0, 8).toUpperCase()
    : '2BC7F193';

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <Terminal size={11} style={{ color: '#6B7280' }} />
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
          Live Rule Trace
        </span>
      </div>
      <div className="text-xl font-bold mb-4" style={{ color: '#16181D' }}>Audit log</div>

      {/* Engine Flags */}
      <div className="mb-4">
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
          Engine Flags
        </div>
        <div className="space-y-1.5">
          {computed.velocityTensionFlag ? (
            <div className="flag-warning">
              <AlertTriangle size={10} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div className="font-semibold" style={{ fontSize: '11px' }}>VELOCITY_TENSION</div>
                <div style={{ fontSize: '10px', opacity: 0.85, marginTop: 2 }}>Closed-DOM speed and UII prior disagree by more than 35%.</div>
              </div>
            </div>
          ) : (
            <div className="flag-ok">
              <CheckCircle size={10} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '11px' }}>VELOCITY_OK</span>
            </div>
          )}
          {computed.censoringInflationApplied && (
            <div className="flag-warning">
              <AlertTriangle size={10} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: '11px' }}>CENSORING_INFLATION ({computed.censoringInflation.toFixed(2)}×)</span>
            </div>
          )}
          {computed.terminalFlags.map(flag => (
            <div key={`flag-${flag}`} className="flag-error">
              <AlertTriangle size={10} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: '11px' }}>{flag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copy JSON button */}
      <button
        onClick={onCopyJson}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-3 font-semibold text-sm transition-all"
        style={{ background: '#16181D', color: '#FFFFFF', border: 'none' }}
      >
        <Copy size={13} />
        Copy Scenario JSON
      </button>

      {/* Dark terminal trace panel */}
      <div
        className="rounded-xl overflow-y-auto dark-scroll"
        style={{ background: '#111A2E', border: '1px solid #22304A', maxHeight: 240, padding: '10px 12px' }}
      >
        <TraceRow label="h, week-1 hazard" value="0.098" />
        <TraceRow label="h, week-2 hazard" value="0.084" />
        <TraceRow label="h, week-3 hazard" value="0.062" />
        <TraceRow label="h, plateau hazard" value="0.018" />
        <TraceRow label="M_base (nation..." value="27.1282 wk" />
        <TraceRow label="Closed median (Z..." value={`${(intake.medianDomZip / 7).toFixed(3)} wk`} />
        <TraceRow label="Censoring infl(κ)" value={computed.censoringInflation.toFixed(4)} />
        <TraceRow label="All-listings med..." value={`${(intake.medianDomZip / 7 * computed.censoringInflation).toFixed(3)} wk`} />
        <TraceRow label="κ_t submarket warp" value={computed.kappaT.toFixed(4)} />
        <TraceRow label="u_eff overprice" value={`${(computed.uEff * 100).toFixed(2)}%`} />
        <TraceRow label="κ_eff dilated" value={computed.kappaEff.toFixed(4)} />
        <TraceRow label="E[DOM]" value={`${computed.expectedDom.toFixed(1)}d`} />
        <TraceRow label="p50 DOM" value={`${computed.p50Dom.toFixed(1)}d`} />
        <TraceRow label="P(>120d)" value={`${(computed.pStale120d * 100).toFixed(2)}%`} />
        <TraceRow label="E[discount]" value={`${(computed.expectedDiscountPct * 100).toFixed(3)}%`} />
        <TraceRow label="Holdback" value={`$${computed.scaledHoldback.toFixed(0)}`} />
        <TraceRow label="Net proceeds" value={`$${computed.netProceeds.toFixed(0)}`} />
      </div>

      {/* Launch client deck */}
      <Link
        href="/presentation-deck"
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mt-3 font-semibold text-sm transition-all"
        style={{ background: '#16181D', color: '#FFFFFF', border: 'none', textDecoration: 'none' }}
      >
        <Monitor size={13} />
        Launch client deck
      </Link>

      {/* Export PDF */}
      <button
        onClick={() => window.print()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mt-2 font-semibold text-sm transition-all"
        style={{ background: 'transparent', color: '#16181D', border: '1px solid #E4E2DC' }}
      >
        <FileText size={13} />
        Export 2-page PDF
      </button>

      {/* Engine stamp */}
      <div className="mt-3 text-xs font-mono" style={{ color: '#6B7280', lineHeight: 1.5 }}>
        Hash {inputHash.toLowerCase()}2bc7f193 · {new Date().toISOString().slice(0, 19)}Z ·
        reproducibility stamp v1.6.1.
      </div>
    </div>
  );
}