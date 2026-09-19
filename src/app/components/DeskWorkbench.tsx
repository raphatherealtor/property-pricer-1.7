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
        {/* â”€â”€ LEFT RAIL â€” Audit Intake â”€â”€ */}
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

        {/* â”€â”€ CENTER STAGE â”€â”€ */}
        <main className="flex-1 overflow-y-auto light-scroll p-4 xl:p-5" style={{ background: '#FAFAF8' }}>
          {/* Persona Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: '#FFFFFF', border: '1px solid #E4E2DC' }}>
            {([
              ['agent', 'Listing Agent\n(Default)'],
              ['lender', 'Mortgage Lender'],
              ['investor', 'Investor'],
              ['commercial', 'Commercial Broker'],
            ] as [group statuss tail oputputs], [id, label]) => (
              <button
                key={id}
                onClick={() => setActivePersona(id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activePersona === id ? '#16181D' : 'transparent',
                  color: activePersona === id ? '#FFFFFF' : '#6B7280',
                  border: activePersona === id ? '1px solid #16181D' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* KPI Strip */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5">
              {[
                ['Îº_t', intake.medianDomZip.toFixed(1), 'FAIR MARKET PACE'],
                ['u_eff', `${(computed.uEff * 100).toFixed(1)}%`, 'PRICE STRESS'],
                ['E[DOM]', `${computed.expectedDom.toFixed(0)}d', 'EXPECTED MARKETING TIME'],
                ['P(>120d)', `${(computed.pStale120d * 100).toFixed(1)}%`, 'STALE RISK'],
              ].flat().map((_)) => null)}
            </div>

            <div className="fl-row flex items-center gap-2 ml-auto">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#DC2626', color: 'white' }}>
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
                classNam”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ä¸ÔÁà´È¸ÔÁä´ÄÉ½Õ¹‘•µ±œÑ•áĞµáÌ™½¹ĞµÍ•µ¥‰½±ÑÉ…¹Í¥Ñ¥½¸µ…±°ˆ(€€€€€€€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è€É‰„ ÄÌ°ÄĞà°ÄÌØ°À¸Ä¤œ°½±½Èè€œŒÁäĞààœ°‰½É‘•Èè€œÅÁàÍ½±¥É‰„ ÄÌ°ÄĞà°ÄÌØ°À¸È¤œõôø(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€ñA…±•ÑÑ”Í¥é”õìÄÅô€¼ø(€€€€€€€€€€€€€€€	É…¹(€€€€€€€€€€€€€€ğ½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑM¡½İÉµA…¹•°¡ÑÉÕ”¥ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Ä¸ÔÁà´È¸ÔÁä´ÄÉ½Õ¹‘•µ±œÑ•áĞµáÌ™½¹ĞµÍ•µ¥‰½±ÑÉ…¹Í¥Ñ¥½¸µ…±°ˆ(€€€€€€€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è€É‰„ ÈÄÜ°ÄÄä°Ø°À¸Ä¤œ°½±½Èè€œäÜÜÀØœ°‰½É‘•Èè€œÅÁàÍ½±¥É‰„ ÈÄÜ°ÄÄä°Ø°À¸È¤œõô(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€ñ]•‰¡½½¬Í¥é”õìÄÅô€¼ø(€€€€€€€€€€€€€€€I4(€€€€€€€€€€€€€€ğ½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áĞµáÌ™½¹Ğµµ½¹¼ˆÍÑå±”õíì½±½Èè€œŒÙÜÈàÀœõôø(€€€€€€€€€€€€€€€í…Í•%‘ôƒ
ÜØÄ¸Ø¸Ä(€€€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø((€€€€€€€€€ì¼¨1¥Ù”…Í­¥¹œÁÉ¥”Í±¥‘•È€¨½ô(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µˆ´ĞÉ½Õ¹‘•µá°À´ĞˆÍÑå±”õíì‰…­É½Õ¹è€œœ°‰½É‘•Èè€œÅÁàÍ½±¥€ÑÉœõôø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•Ñİ••¸µˆ´Èˆø(€€€€€€€€€€€€€€ñÍÁ…¸ÍÑå±”õíì™½¹ÑM¥é”è€œÄÁÁàœ°™½¹Ñ]•¥¡Ğè€ØÀÀ°±•ÑÑ•ÉMÁ…¥¹œè€œÀ¸Å•´œ°Ñ•áÑQÉ…¹Í™½É´è€ÕÁÁ•É…Í”œ°½±½Èè€œŒÙÜÈàÀœ°™½¹Ñ…µ¥±äè€Ù…È ´µ™½¹Ğµµ½¹¼¤œõôø(€€€€€€€€€€€€€€€1¥Ù”Í­¥¹œAÉ¥”(€€€€€€€€€€€€€€ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Èˆø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áĞµ±œ™½¹Ğµµ½¹¼™½¹Ğµ‰½±ˆÍÑå±”õíì½±½Èè€œŒÄØÄàÅœõôø(€€€€€€€€€€€€€€€€€€‘í¥¹Ñ…­”¹Ñ…É•ÑAÉ¥”¹Ñ½1½…±•MÑÉ¥¹œ ¥ô(€€€€€€€€€€€€€€€€ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áĞµÍ´™½¹Ğµµ½¹¼™½¹ĞµÍ•µ¥‰½±ˆÍÑå±”õíì½±½Èè½Ù•ÉÁÉ¥•AĞ€ø€À€ü€œäÜÜÀØœ€è€œŒÁäĞààœõôø(€€€€€€€€€€€€€€€€€í½Ù•ÉÁÉ¥•AĞ€ø€À€ü€œ¬œ€è€œõí½Ù•ÉÁÉ¥•AĞ¹Ñ½¥á• Ä¥ô”(€€€€€€€€€€€€€€€€ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€ñ¥¹ÁÕĞ(€€€€€€€€€€€€€ÑåÁ”ô‰É…¹”ˆ(€€€€€€€€€€€€€µ¥¸õí¥¹Ñ…­”¹‰…Í•±¥¹•Y…±Õ”€¨€À¸åô(€€€€€€€€€€€€€µ…àõí¥¹Ñ…­”¹‰…Í•±¥¹•Y…±Õ”€¨€Ä¸ÈÕô(€€€€€€€€€€€€€ÍÑ•ÀõìÔÀÀÁô(€€€€€€€€€€€€€Ù…±Õ”õí¥¹Ñ…­”¹Ñ…É•ÑAÉ¥•ô(€€€€€€€€€€€€€½¹¡…¹”õí”€ôøì(€€€€€€€€€€€€€€€½¹ÍĞ¹•İ%¹Ñ…­”€ôì€¸¸¹¥¹Ñ…­”°Ñ…É•ÑAÉ¥”è9Õµ‰•È¡”¹Ñ…É•Ğ¹Ù…±Õ”¤ôì(€€€€€€€€€€€€€€€É•½µÁÕÑ”¡¹•İ%¹Ñ…­”¤ì(€€€€€€€€€€€€€€€‰É½…‘…ÍÑMÑ…Ñ”¡ÑÉÕ”¤ì(€€€€€€€€€€€€€€€Í•Ñ%ÍÉ…¥¹œ¡ÑÉÕ”¤ì(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€½¹5½ÕÍ•UÀõì ¤€ôøì‰É½…‘…ÍÑMÑ…Ñ”¡™…±Í”¤ìÍ•Ñ%ÍÉ…¥¹œ¡™…±Í”¤ìõô(€€€€€€€€€€€€€½¹Q½Õ¡¹õì ¤€ôøì‰É½…‘…ÍÑMÑ…Ñ”¡™…±Í”¤ìÍ•Ñ%ÍÉ…¥¹œ¡™…±Í”¤ìõô(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Üµ™Õ±°ˆ(€€€€€€€€€€€€€ÍÑå±”õíì…•¹Ñ½±½Èè€œŒÈÔØÍœõô(€€€€€€€€€€€€¼ø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à©ÕÍÑ¥™äµ‰•Ñİ••¸Ñ•áĞµáÌ™½¹Ğµµ½¹¼µĞ´ÄˆÍÑå±”õíì½±½Èè€œŒÙÜÈàÀœõôø(€€€€€€€€€€€€€€ñÍÁ…¸ø‘ì¡¥¹Ñ…­”¹‰…Í•±¥¹•Y…±Õ”€¨€À¸ä¤¹Ñ½1½…±•MÑÉ¥¹œ ¥ôğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ñÍÁ…¸ù‰…Í•±¥¹”€‘í¥¹Ñ…­”¹‰…Í•±¥¹•Y…±Õ”¹Ñ½1½…±•MÑÉ¥¹œ ¥ôğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ñÍÁ…¸ø‘ì¡¥¹Ñ…­”¹‰…Í•±¥¹•Y…±Õ”€¨€Ä¸ÈÔ¤¹Ñ½1½…±•MÑÉ¥¹œ ¥ôğ½ÍÁ…¸ø(€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€ğ½‘¥Øø((€€€€€€€€€ì¼¨-A$5…ÑÉ¥à€¨½ô(€€€€€€€€€€ñ-Á¥5…ÑÉ¥à½µÁÕÑ•õí½µÁÕÑ•‘ô¥¹Ñ…­”õí¥¹Ñ…­•ô¥ÍÉ…¥¹œõí¥ÍÉ…¥¹ô€¼ø((€€€€€€€€€ì¼¨MÕÉÙ¥Ù…°ÕÉÙ”€¨½ô(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´ĞÉ½Õ¹‘•µá°À´ĞˆÍÑå±”õíì‰…­É½Õ¹è€œœ°‰½É‘•Èè€œÅÁàÍ½±¥€ÑÉœõôø(€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È©ÕÍÑ¥™äµ‰•Ñİ••¸µˆ´Ìˆø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´Èˆø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áĞµÍ´™½¹ĞµÍ•µ¥‰½±ˆÍÑå±”õíì½±½Èè€œŒÄØÄàÅœõôø(€€€€€€€€€€€€€€€€€Q¥µ”µ]…ÉÁ•MÕÉÙ¥Ù…°ÕÉÙ”(€€€€€€€€€€€€€€€€ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰‰…‘”µ™ÜˆûŠ^<\ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµ•¹Ñ•È…À´ÌÑ•áĞµáÌ™½¹Ğµµ½¹¼ˆÍÑå±”õíì½±½Èè€œŒÙÜÈàÀœõôø(€€€€€€€€€€€€€€€€ñÍÁ…¸û:é}Ğ€ôí½µÁÕÑ•¹­…ÁÁ…P¹Ñ½¥á• Ì¥ôğ½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸û:é}•™˜€ôí½µÁÕÑ•¹­…ÁÁ…™˜¹Ñ½¥á• Ì¥ôğ½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸ùÕ}•™˜€ôì¡½µÁÕÑ•¹Õ™˜€¨€ÄÀÀ¤¹Ñ½¥á• Ä¥ô”ğ½ÍÁ…¸ø(€€€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€€€€€ñMÕÉÙ¥Ù…±ÕÉÙ•¡…ÉĞ(€€€€€€€€€€€€€ÕÉÙ”õí½µÁÕÑ•¹ÍÕÉÙ¥Ù…±ÕÉÙ•ô(€€€€€€€€€€€€€ÀÔÁ½´õí½µÁÕÑ•¹ÀÔÁ½µô(€€€€€€€€€€€€€•áÁ•Ñ•‘½´õí½µÁÕÑ•¹•áÁ•Ñ•‘½µô(€€€€€€€€€€€€€…ÑÕ…±½´õí¥¹Ñ…­”¹…ÑÕ…±½µô(€€€€€€€€€€€€¼ø(€€€€€€€€€€ğ½‘¥Øø((€€€€€€€€€ì¼¨A•ÉÍ½¹„¥…¹½ÍÑ¥ŒA…¹•°€¨½ô(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µĞ´Ğˆø(€€€€€€€€€€€€ñA•ÉÍ½¹…Q…‰Ì(€€€€€€€€€€€€€…Ñ¥Ù•A•ÉÍ½¹„õí…Ñ¥Ù•A•ÉÍ½¹…ô(€€€€€€€€€€€€€¥¹Ñ…­”õí¥¹Ñ…­•ô(€€€€€€€€€€€€€½µÁÕÑ•õí½µÁÕÑ•‘ô(€€€€€€€€€€€€€±¥ÍÑ¥¹•¹Ğõí±¥ÍÑ¥¹•¹Ñô(€€€€€€€€€€€€€±•¹‘•Èõí±•¹‘•É=ÕÑô(€€€€€€€€€€€€€¥¹Ù•ÍÑ½Èõí¥¹Ù•ÍÑ½É=ÕÑô(€€€€€€€€€€€€€½µµ•É¥…°õí½µµ•É¥…±=ÕÑô(€€€€€€€€€€€€¼ø(€€€€€€€€€€ğ½‘¥Øø(€€€€€€€€ğ½µ…¥¸ø((€€€€€€€ì¼¨ƒŠRŠR I%!PI%0ƒŠPÕ‘¥Ğ1½œƒŠRŠR €¨½ô(€€€€€€€€ñ…Í¥‘”(€€€€€€€€€±…ÍÍ9…µ”ô‰Ü´ÜÈ™±•àµÍ¡É¥¹¬´À½Ù•É™±½Üµäµ…ÕÑ¼±¥¡ĞµÍÉ½±°ˆ(€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è€œœ°‰½É‘•É1•™Ğè€œÅÁàÍ½±¥€ÑÉœõô(€€€€€€€€ø(€€€€€€€€€€ñÕ‘¥ÑI…¥°½µÁÕÑ•õí½µÁÕÑ•‘ô¥¹Ñ…­”õí¥¹Ñ…­•ô½¹½Áå)Í½¸õí¡…¹‘±•½Áå)Í½¹ô€¼ø(€€€€€€€€ğ½…Í¥‘”ø(€€€€€€ğ½‘¥Øø((€€€€€íÍ¡½İM•¹…É¥½1¥‰É…Éä€˜˜€ (€€€€€€€€ñM•¹…É¥½1¥‰É…Éä½¹±½Í”õì ¤€ôøÍ•ÑM¡½İM•¹…É¥½1¥‰É…Éä¡™…±Í”¥ô€¼ø(€€€€€€¥ô((€€€€€ì¼¨A¡…Í”€ÄèM¡…É”µ½‘…°€¨½ô(€€€€€íÍ¡½İM¡…É•5½‘…°€˜˜€ (€€€€€€€€ñM¡…É•M•¹…É¥½5½‘…°(€€€€€€€€€Á…å±½…õí•ÑM•¹…É¥½A…å±½… ¥ô(€€€€€€€€€½¹±½Í”õì ¤€ôøÍ•ÑM¡½İM¡…É•5½‘…°¡™…±Í”¥ô(€€€€€€€€¼ø(€€€€€€¥ô((€€€€€ì¼¨A¡…Í”€Èè	É…¹Ñ¡•µ”Á…¹•°€¨½ô(€€€€€íÍ¡½İ	É…¹‘Q¡•µ”€˜˜€ (€€€€€€€€ñ	É…¹‘Q¡•µ•A…¹•°(€€€€€€€€€½¹±½Í”õì ¤€ôøÍ•ÑM¡½İ	É…¹‘Q¡•µ”¡™…±Í”¥ô(€€€€€€€€€½¹M…Ù”õì ¤€ôøÍ•ÑM¡½İ	É…¹‘Q¡•µ”¡™…±Í”¥ô(€€€€€€€€¼ø(€€€€€€¥ô((€€€€€ì¼¨A¡…Í”€ÔèI4İ•‰¡½½¬Á…¹•°€¨½ô(€€€€€íÍ¡½İÉµA…¹•°€˜˜€ (€€€€€€€€ñÉµ]•‰¡½½­A…¹•°(€€€€€€€€€½¹±½Í”õì ¤€ôøÍ•ÑM¡½İÉµA…¹•°¡™…±Í”¥ô(€€€€€€€€€Í•¹…É¥½A…å±½…õí•ÑM•¹…É¥½A…å±½… ¥ô(€€€€€€€€¼ø(€€€€€€¥ô((€€€€€ì¼¨5M!…é…É1¥µ¥Ñ…Ñ¥½¸¥Í±½ÍÕÉ”€¨½ô(€€€€€€ñ‘¥Ø(€€€€€€€±…ÍÍ9…µ”ô‰™±•àµÍ¡É¥¹¬´ÀÁà´ØÁä´ÈÑ•áĞµ•¹Ñ•Èˆ(€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è€œœ°‰½É‘•ÉQ½Àè€œÅÁàÍ½±¥€ÑÉœõô(€€€€€€ø(€€€€€€€€ñÀÍÑå±”õíì™½¹ÑM¥é”è€œÄÁÁàœ°½±½Èè€œŒåÍœ°™½¹Ñ…µ¥±äè€Ù…È ´µ™½¹Ğµµ½¹¼¤œ°±¥¹•!•¥¡Ğè€Ä¸Ôõôø(€€€€€€€€€	…Í•±¥¹”¡…é…ÉÕÉÙ”…±¥‰É…Ñ•Ñ¼¹…Ñ¥½¹…°Á…ÑÑ•É¹Ì¸1½…°ÍÕ‰µ…É­•Ğ™É¥Ñ¥½¸…±¥‰É…Ñ•Ù¥„ÕÍ•ÈµÍÕÁÁ±¥•±½Í•µ•‘¥…¸‘…Ñ„¸(€€€€€€€€ğ½Àø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øø(€€¤ì)ô