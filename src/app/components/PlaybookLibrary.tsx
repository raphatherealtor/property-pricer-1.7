'use client';
import React, { useState, useCallback } from 'react';
import { useEngineStore } from '@/store/engineStore';
import type { ScenarioPayload } from '@/store/engineStore';
import { defaultLenderExt, defaultInvestorExt, defaultCommercialExt } from '@/engine/defaults';
import { X, BookOpen, Zap, TrendingDown, AlertTriangle, Wind, Activity, Lock } from 'lucide-react';

// ─── Strategy Templates ────────────────────────────────────────────────────

const STRATEGY_TEMPLATES: {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  highlight: string;
  payload: Partial<ScenarioPayload>;
}[] = [
  {
    id: 'fix-flip-bridge',
    label: 'Fix-and-Flip Bridge',
    description: 'Investor persona · fully renovated · aggressive LTV/Hold · highlights IRR bridge',
    icon: <Zap size={14} />,
    color: '#0D9488',
    highlight: 'IRR Bridge',
    payload: {
      intake: {
        zip: '10001',
        baselineValue: 600000,
        targetPrice: 630000,
        listingState: 'pre_listing',
        actualDom: null,
        uiiMonths: 3.2,
        medianDomZip: 28,
        domClockBasis: 'closed_only',
        glaSqft: 2000,
        hvacAge: 0,   // fully renovated
        roofAge: 0,
        whAge: 0,
        assetClass: 'residential',
      },
      investorExt: {
        purchasePrice: 580000,
        rentRollMonthly: 4800,
        holdYears: 2,
        exitOvershootPct: 0.08,
        opexRatio: 0.35,
      },
      activePersona: 'investor',
    },
  },
  {
    id: 'appraisal-gap-buffer',
    label: 'Appraisal Gap Buffer',
    description: 'Lender persona · +8% over baseline · highlights Winner\'s Curse scaling and Cash-to-Close delta',
    icon: <TrendingDown size={14} />,
    color: '#2563EB',
    highlight: "Winner's Curse",
    payload: {
      intake: {
        zip: '10001',
        baselineValue: 600000,
        targetPrice: 648000,  // +8%
        listingState: 'pre_listing',
        actualDom: null,
        uiiMonths: 4.8,
        medianDomZip: 40,
        domClockBasis: 'closed_only',
        glaSqft: 2000,
        hvacAge: 8,
        roofAge: 10,
        whAge: 5,
        assetClass: 'residential',
      },
      lenderExt: {
        ltv: 0.80,
        noteRate: 0.0695,
        termMonths: 360,
        appraisedValue: 600000,  // appraisal at baseline, ask at +8%
        programReserveMonths: 6,
      },
      activePersona: 'lender',
    },
  },
  {
    id: 'overpriced-stale-tail',
    label: 'Overpriced Stale Tail',
    description: '+10% ask · slow κ_t ZIP · expands 120-day hazard curve risk immediately',
    icon: <AlertTriangle size={14} />,
    color: '#DC2626',
    highlight: 'P(>120d) Risk',
    payload: {
      intake: {
        zip: '77001',
        baselineValue: 600000,
        targetPrice: 660000,  // +10%
        listingState: 'pre_listing',
        actualDom: null,
        uiiMonths: 5.8,       // slow submarket
        medianDomZip: 65,     // slow kappa_t ZIP
        domClockBasis: 'closed_only',
        glaSqft: 2000,
        hvacAge: 14,
        roofAge: 18,
        whAge: 9,
        assetClass: 'residential',
      },
      activePersona: 'agent',
    },
  },
];

// ─── Market Condition Presets ──────────────────────────────────────────────

const MARKET_PRESETS: {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  uiiMonths: number;
  medianDomZip: number;
}[] = [
  {
    id: 'high-velocity',
    label: 'High-Velocity',
    description: 'UII 2.1mo · 18d median DOM',
    icon: <Wind size={12} />,
    color: '#0D9488',
    uiiMonths: 2.1,
    medianDomZip: 18,
  },
  {
    id: 'steady',
    label: 'Steady',
    description: 'UII 4.8mo · 40d median DOM',
    icon: <Activity size={12} />,
    color: '#2563EB',
    uiiMonths: 4.8,
    medianDomZip: 40,
  },
  {
    id: 'gridlock',
    label: 'Gridlock',
    description: 'UII 7.2mo · 72d median DOM',
    icon: <Lock size={12} />,
    color: '#D97706',
    uiiMonths: 7.2,
    medianDomZip: 72,
  },
];

interface Props {
  onClose: () => void;
}

export default function PlaybookLibrary({ onClose }: Props) {
  const { intake, loadScenario, recompute } = useEngineStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyTemplate = useCallback((template: typeof STRATEGY_TEMPLATES[0]) => {
    const payload: ScenarioPayload = {
      intake: { ...intake, ...(template.payload.intake || {}) },
      lenderExt: template.payload.lenderExt || defaultLenderExt,
      investorExt: template.payload.investorExt || defaultInvestorExt,
      commercialExt: template.payload.commercialExt || defaultCommercialExt,
      activePersona: template.payload.activePersona || 'agent',
      schema_version: '1.6',
      calc_version: '1.6.1',
      savedAt: new Date().toISOString(),
    };

    loadScenario({
      scenario_id: `template-${template.id}`,
      name: template.label,
      description: template.description,
      payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_pinned: false,
      tags: ['template'],
    });
    onClose();
  }, [intake, loadScenario, onClose]);

  const applyMarketPreset = useCallback((preset: typeof MARKET_PRESETS[0]) => {
    setActivePreset(preset.id);
    const newIntake = {
      ...intake,
      uiiMonths: preset.uiiMonths,
      medianDomZip: preset.medianDomZip,
    };
    recompute(newIntake);
    onClose();
  }, [intake, recompute, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#FFFFFF', border: '1px solid #E4E2DC', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E4E2DC' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: '#2563EB' }} />
            <span className="text-base font-bold" style={{ color: '#16181D' }}>Playbook Library</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
              1-click templates
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#6B7280' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Market Condition Presets */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
              Market Condition Presets
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MARKET_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyMarketPreset(preset)}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: activePreset === preset.id ? `${preset.color}10` : '#F9FAFB',
                    border: `1px solid ${activePreset === preset.id ? preset.color : '#E4E2DC'}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2" style={{ color: preset.color }}>
                    {preset.icon}
                    <span className="text-sm font-bold">{preset.label}</span>
                  </div>
                  <div className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Templates */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
              Strategy Templates
            </div>
            <div className="space-y-3">
              {STRATEGY_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.005] active:scale-[0.998] group"
                  style={{ background: '#F9FAFB', border: '1px solid #E4E2DC' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: template.color }}>{template.icon}</span>
                        <span className="text-sm font-bold" style={{ color: '#16181D' }}>{template.label}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{ background: `${template.color}15`, color: template.color }}
                        >
                          {template.highlight}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{template.description}</p>
                    </div>
                    <div
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: template.color, color: '#FFFFFF' }}
                    >
                      Load →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="rounded-xl p-4" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <p className="text-xs" style={{ color: '#0369A1' }}>
              <strong>Templates bypass the intake form</strong> — they hydrate the Zustand engine store directly with a validated scenario payload. All engine math runs immediately on load. You can adjust any value after loading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
