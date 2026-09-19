'use client';
import React from 'react';
import type { CoreIntake, ComputedOutputs, CommercialOutputs } from '@/engine/types';
import { Clock, AlertTriangle } from 'lucide-react';

function fmt$(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

interface Props { intake: CoreIntake; computed: ComputedOutputs; data: CommercialOutputs; }

export default function CommercialPanel({ intake, computed, data }: Props) {
  const riskColor = data.twoClockRisk === 'HIGH' ? '#F87171' : data.twoClockRisk === 'MEDIUM' ? '#FCD34D' : '#34D399';
  const riskBg = data.twoClockRisk === 'HIGH' ? 'rgba(220,38,38,0.06)' : data.twoClockRisk === 'MEDIUM' ? 'rgba(217,119,6,0.06)' : 'rgba(13,148,136,0.06)';
  const riskBorder = data.twoClockRisk === 'HIGH' ? 'rgba(220,38,38,0.2)' : data.twoClockRisk === 'MEDIUM' ? 'rgba(217,119,6,0.2)' : 'rgba(13,148,136,0.2)';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="desk-card">
          <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--dark-muted)' }}>SF Absorption</div>
          <div className="kpi-value text-lg" style={{ color: 'var(--dark-ink)' }}>{data.absorptionMonths.toFixed(1)} mo</div>
          <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
            To clear available SF
          </div>
        </div>

        <div className="desk-card" style={{ background: riskBg, borderColor: riskBorder }}>
          <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: riskColor }}>Two-Clock Risk</div>
          <div className="kpi-value text-lg" style={{ color: riskColor }}>{data.twoClockRisk}</div>
          <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
            Mktg vs WALT runway
          </div>
        </div>

        <div className="desk-card">
          <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--dark-muted)' }}>DSCR After Reserves</div>
          <div className="kpi-value text-lg" style={{ color: data.dscrAfterReserves >= 1.25 ? '#34D399' : data.dscrAfterReserves >= 1.0 ? '#FCD34D' : '#F87171' }}>
            {data.dscrAfterReserves.toFixed(2)}x
          </div>
          <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
            5-yr replacement reserves
          </div>
        </div>

        <div className="desk-card">
          <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--dark-muted)' }}>Tenant HHI</div>
          <div className="kpi-value text-lg" style={{ color: data.topTenantConcentrationHhi > 3000 ? '#F87171' : '#34D399' }}>
            {data.topTenantConcentrationHhi}
          </div>
          <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
            {data.topTenantConcentrationHhi > 3000 ? 'Concentrated' : 'Diversified'}
          </div>
        </div>
      </div>

      {/* Two-Clock Display */}
      <div className="desk-card">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={13} style={{ color: 'var(--dark-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--dark-ink)' }}>Two-Clock Risk Display</span>
          <span className="badge-fw">● FW</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Marketing clock */}
          <div>
            <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--dark-muted)' }}>
              Marketing Clock (at ask)
            </div>
            <div className="text-lg font-mono font-bold mb-1" style={{ color: '#60A5FA' }}>
              {data.marketingWeeksAtAsk.toFixed(1)} wk
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (data.marketingWeeksAtAsk / 26) * 100)}%`,
                  background: 'var(--primary)',
                }}
              />
            </div>
            <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
              {computed.expectedDom.toFixed(0)}d E[DOM] · 26wk horizon
            </div>
          </div>

          {/* WALT runway */}
          <div>
            <div className="text-2xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--dark-muted)' }}>
              WALT Runway
            </div>
            <div className="text-lg font-mono font-bold mb-1" style={{ color: riskColor }}>
              {data.waltRunwayMonths.toFixed(1)} mo
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (data.waltRunwayMonths / 60) * 100)}%`,
                  background: riskColor,
                }}
              />
            </div>
            <div className="text-2xs font-mono mt-1" style={{ color: 'var(--dark-muted)' }}>
              vs mktg {(data.marketingWeeksAtAsk / 4.33).toFixed(1)} mo
            </div>
          </div>
        </div>

        {data.vacancyTransmission > 0 && (
          <div className="flag-warning mt-3">
            <AlertTriangle size={11} style={{ marginTop: 1, flexShrink: 0 }} />
            Vacancy transmission exposure: {data.vacancyTransmission.toFixed(1)} months of potential vacancy
            before absorption closes the gap
          </div>
        )}
      </div>
    </div>
  );
}