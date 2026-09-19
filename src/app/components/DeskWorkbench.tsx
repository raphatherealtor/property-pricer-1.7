'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { createClient } from '@/lib/supabase/client';
import { computeListingAgent, computeLender, computeInvestor, computeCommercial } from '@/engine/personas';
import { toast } from 'sonner';
import IntakeForm from './IntakeForm';
import KpiMatrix from './KpiMatrix';
import SurvivalCurveChart from './SurvivalCurveChart';
import PersonaTabs from './PersonaTabs';
import AuditRail from './AuditRail';
import ScenarioLibrary from './ScenarioLibrary';
import VersionMismatchBanner from './VersionMismatchBanner';
import type { FullEngineResult } from '@/engine/types';
import { RefreshCw } from 'lucide-react';
import { Share2, Palette, Webhook, Upload } from 'lucide-react';
import ShareScenarioModal from './ShareScenarioModal';
import BrandThemePanel from './BrandThemePanel';
import CrmWebhookPanel from './CrmWebhookPanel';
import CompsUpload from './CompsUpload';


const BROADCAST_CHANNEL = 'property-pricer-sync';
const THROTTLE_MS = 55;

export default function DeskWorkbench() {
  const {
    intake, lenderExt, investorExt, commercialExt, computed, activePersona,
    versionMismatchWarning,
    recompute, setLenderExt, setInvestorExt, setCommercialExt, setActivePersona,
    resetToDefaults, getScenarioPayload, setLastBroadcastAt, lastBroadcastAt,
    dismissVersionWarning,
  } = useEngineStore();

  const [showScenarioLibrary, setShowScenarioLibrary] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBrandTheme, setShowBrandTheme] = useState(false);
  const [showCrmPanel, setShowCrmPanel] = useState(false);
  const [showCompsUpload, setShowCompsUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const broadcastThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

  const handleIntakeChange = useCallback((newIntake: typeof intake) => {
    recompute(newIntake);
  }, [recompute]);

  const handleCompsAutoBaseline = useCallback((value: number, _uploadId: string) => {
    const newIntake = { ...intake, baselineValue: value };
    recompute(newIntake);
    toast.success(`Baseline updated to $${value.toLocaleString()} from comps [DATA]`);
  }, [intake, recompute]);

  const broadcastState = useCallback((isSliderDrag = false) => {
    const now = Date.now();
    const throttleMs = isSliderDrag ? THROTTLE_MS : 0;
    if (isSliderDrag && now - lastBroadcastAt < throttleMs) {
      if (broadcastThrottleRef.current) clearTimeout(broadcastThrottleRef.current);
      broadcastThrottleRef.current = setTimeout(() => { broadcastState(false); }, throttleMs);
      return;
    }
    setLastBroadcastAt(now);
    const channel = supabaseRef.current.channel(BROADCAST_CHANNEL);
    channel.send({ type: 'broadcast', event: 'engine_state', payload: getScenarioPayload() }).catch(() => {});
  }, [lastBroadcastAt, setLastBroadcastAt, getScenarioPayload]);

  useEffect(() => { broadcastState(false); }, [intake.targetPrice]);

  const listingAgent = computeListingAgent(intake, computed);
  const lenderOut = computeLender(intake, computed, lenderExt);
  const investorOut = computeInvestor(intake, computed, investorExt);
  const commercialOut = computeCommercial(intake, computed, commercialExt);

  const handleCopyJson = useCallback(() => {
    const inputHash = btoa(JSON.stringify(intake)).slice(0, 16);
    const payload: FullEngineResult = {
      intake, computed, listingAgent,
      lender: lenderOut, investor: investorOut, commercial: commercialOut,
      engineVersion: '1.6.1',
      computedAt: new Date().toISOString(),
      inputHash,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      toast.success('Scenario JSON copied to clipboard', { duration: 3000 });
    });
  }, [intake, computed, listingAgent, lenderOut, investorOut, commercialOut]);

  const caseId = `PP-2BC7F193`;
  const overpricePct = ((intake.targetPrice - intake.baselineValue) / intake.baselineValue * 100);

  return (
    <div className="pt-12 min-h-screen flex flex-col" style={{ background: '#FAFAF8' }}>
      {versionMismatchWarning && (
        <VersionMismatchBanner warning={versionMismatchWarning} onDismiss={dismissVersionWarning} />
      )}

      <div className="flex-1 flex overflow-hidden" style={{ height: versionMismatchWarning ? 'calc(100vh - 96px)' : 'calc(100vh - 48px)' }}>
        {/* ── LEFT RAIL — Audit Intake ── */}
        <aside
          className="w-72 flex-shrink-0 overflow-y-auto light-scroll"
          style={{ background: '#FFFFFF', borderRight: '1px solid #E4E2DC' }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                Audit Intake
              </span>
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs"
                style={{ color: '#6B7280', border: '1px solid #E4E2DC', background: 'transparent' }}
              >
                <RefreshCw size={10} />
                Reset
              </button>
            </div>
            <div className="text-xl font-bold mb-4" style={{ color: '#16181D' }}>Case inputs</div>

            {/* Phase 4: Comps Upload toggle */}
            <button
              onClick={() => setShowCompsUpload(!showCompsUpload)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-semibold transition-all"
              style={{ background: showCompsUpload ? 'rgba(29,78,216,0.1)' : 'rgba(0,0,0,0.04)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}
            >
              <Upload size={11} />
              Comp CSV Upload
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: '#1D4ED8', color: '#93C5FD', fontSize: '9px' }}>DATA</span>
            </button>

            {showCompsUpload && (
              <div className="mb-4">
                <CompsUpload
                  glaSqft={intake.glaSqft}
                  onBaselineAutoSet={handleCompsAutoBaseline}
                  onOverrideLogged={() => toast.success('Override logged in audit trail')}
                />
              </div>
            )}

            <IntakeForm
              intake={intake}
              lenderExt={lenderExt}
              investorExt={investorExt}
              commercialExt={commercialExt}
              onIntakeChange={handleIntakeChange}
              onLenderChange={setLenderExt}
              onInvestorChange={setInvestorExt}
              onCommercialChange={setCommercialExt}
            />
          </div>
        </aside>

        {/* ── CENTER STAGE ── */}
        <main className="flex-1 overflow-y-auto light-scroll p-4 xl:p-5" style={{ background: '#FAFAF8' }}>
          {/* Persona Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: '#FFFFFF', border: '1px solid #E4E2DC' }}>
            {([
              ['agent', 'Listing Agent\n(Default)'],
              ['lender', 'Mortgage Lender'],
              ['investor', 'Equity Investor'],
              ['commercial', 'Commercial Broker'],
            ] as const).map(([key, label]) => (
              <button
                key={`persona-tab-${key}`}
                onClick={() => setActivePersona(key)}
                className={`persona-tab ${activePersona === key ? 'active' : ''}`}
                style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.2, fontSize: '12px' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: '#DC2626', color: 'white' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                HOT
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                READ {computed.readConfidence}
              </span>
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-4 h-1.5 rounded-sm" style={{ background: i <= (computed.readConfidence === 'HIGH' ? 4 : computed.readConfidence === 'MEDIUM' ? 2 : 1) ? '#0D9488' : '#E4E2DC' }} />
                ))}
              </div>
            </div>

            {/* Phase 1/2/5 action buttons */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(37,99,235,0.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}
              >
                <Share2 size={11} />
                Share
              </button>
              <button
                onClick={() => setShowBrandTheme(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(13,148,136,0.1)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.2)' }}
              >
                <Palette size={11} />
                Brand
              </button>
              <button
                onClick={() => setShowCrmPanel(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(217,119,6,0.1)', color: '#D97706', border: '1px solid rgba(217,119,6,0.2)' }}
              >
                <Webhook size={11} />
                CRM
              </button>
              <div className="text-xs font-mono" style={{ color: '#6B7280' }}>
                {caseId} · v1.6.1
              </div>
            </div>
          </div>

          {/* Live asking price slider */}
          <div className="mb-4 rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E4E2DC' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                Live Asking Price
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold" style={{ color: '#16181D' }}>
                  ${intake.targetPrice.toLocaleString()}
                </span>
                <span className="text-sm font-mono font-semibold" style={{ color: overpricePct > 0 ? '#D97706' : '#0D9488' }}>
                  {overpricePct > 0 ? '+' : ''}{overpricePct.toFixed(1)}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={intake.baselineValue * 0.9}
              max={intake.baselineValue * 1.25}
              step={5000}
              value={intake.targetPrice}
              onChange={e => {
                const newIntake = { ...intake, targetPrice: Number(e.target.value) };
                recompute(newIntake);
                broadcastState(true);
                setIsDragging(true);
              }}
              onMouseUp={() => { broadcastState(false); setIsDragging(false); }}
              onTouchEnd={() => { broadcastState(false); setIsDragging(false); }}
              className="w-full"
              style={{ accentColor: '#2563EB' }}
            />
            <div className="flex justify-between text-xs font-mono mt-1" style={{ color: '#6B7280' }}>
              <span>${(intake.baselineValue * 0.9).toLocaleString()}</span>
              <span>baseline ${intake.baselineValue.toLocaleString()}</span>
              <span>${(intake.baselineValue * 1.25).toLocaleString()}</span>
            </div>
          </div>

          {/* KPI Matrix */}
          <KpiMatrix computed={computed} intake={intake} isDragging={isDragging} />

          {/* Survival Curve */}
          <div className="mt-4 rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E4E2DC' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#16181D' }}>
                  Time-Warped Survival Curve
                </span>
                <span className="badge-fw">● FW</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono" style={{ color: '#6B7280' }}>
                <span>κ_t = {computed.kappaT.toFixed(3)}</span>
                <span>κ_eff = {computed.kappaEff.toFixed(3)}</span>
                <span>u_eff = {(computed.uEff * 100).toFixed(1)}%</span>
              </div>
            </div>
            <SurvivalCurveChart
              curve={computed.survivalCurve}
              p50Dom={computed.p50Dom}
              expectedDom={computed.expectedDom}
              actualDom={intake.actualDom}
            />
          </div>

          {/* Persona Diagnostic Panel */}
          <div className="mt-4">
            <PersonaTabs
              activePersona={activePersona}
              intake={intake}
              computed={computed}
              listingAgent={listingAgent}
              lender={lenderOut}
              investor={investorOut}
              commercial={commercialOut}
            />
          </div>
        </main>

        {/* ── RIGHT RAIL — Audit Log ── */}
        <aside
          className="w-72 flex-shrink-0 overflow-y-auto light-scroll"
          style={{ background: '#FFFFFF', borderLeft: '1px solid #E4E2DC' }}
        >
          <AuditRail computed={computed} intake={intake} onCopyJson={handleCopyJson} />
        </aside>
      </div>

      {showScenarioLibrary && (
        <ScenarioLibrary onClose={() => setShowScenarioLibrary(false)} />
      )}

      {/* Phase 1: Share modal */}
      {showShareModal && (
        <ShareScenarioModal
          payload={getScenarioPayload()}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Phase 2: Brand theme panel */}
      {showBrandTheme && (
        <BrandThemePanel
          onClose={() => setShowBrandTheme(false)}
          onSave={() => setShowBrandTheme(false)}
        />
      )}

      {/* Phase 5: CRM webhook panel */}
      {showCrmPanel && (
        <CrmWebhookPanel
          onClose={() => setShowCrmPanel(false)}
          scenarioPayload={getScenarioPayload()}
        />
      )}

      {/* MSA Hazard Limitation Disclosure */}
      <div
        className="flex-shrink-0 px-6 py-2 text-center"
        style={{ background: '#FFFFFF', borderTop: '1px solid #E4E2DC' }}
      >
        <p style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
          Baseline hazard curve calibrated to national patterns. Local submarket friction calibrated via user-supplied closed median data.
        </p>
      </div>
    </div>
  );
}