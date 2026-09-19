'use client';
import React, { useState } from 'react';
import type { CoreIntake, LenderExt, InvestorExt, CommercialExt } from '@/engine/types';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  intake: CoreIntake;
  lenderExt: LenderExt;
  investorExt: InvestorExt;
  commercialExt: CommercialExt;
  onIntakeChange: (intake: CoreIntake) => void;
  onLenderChange: (ext: LenderExt) => void;
  onInvestorChange: (ext: InvestorExt) => void;
  onCommercialChange: (ext: CommercialExt) => void;
}

function FieldLabel({ children, badge, right }: { children: React.ReactNode; badge?: 'fw' | 'ea'; right?: string }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1">
        <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
          {children}
        </label>
        {badge && <span className={badge === 'fw' ? 'badge-fw' : 'badge-ea'}>{badge === 'fw' ? '● FW' : '◌ EA'}</span>}
      </div>
      {right && <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#6B7280' }}>{right}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-all"
      style={{ background: '#FFFFFF', border: '1px solid #E4E2DC', color: '#16181D', fontFamily: 'var(--font-mono)' }}
      onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.12)'; }}
      onBlur={e => { e.target.style.borderColor = '#E4E2DC'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function NumberInput({ value, onChange, step = 1, min = 0, suffix, prefix }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; suffix?: string; prefix?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-sm font-mono" style={{ color: '#6B7280' }}>{prefix}</span>
      )}
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-all"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E2DC',
          color: '#16181D',
          fontFamily: 'var(--font-mono)',
          paddingLeft: prefix ? '20px' : '12px',
          paddingRight: suffix ? '36px' : '12px',
        }}
        onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = '#E4E2DC'; e.target.style.boxShadow = 'none'; }}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-mono" style={{ color: '#6B7280' }}>{suffix}</span>
      )}
    </div>
  );
}

function SpinnerInput({ label, value, onChange, life, badge }: { label: string; value: number; onChange: (v: number) => void; life: number; badge?: 'fw' | 'ea' }) {
  return (
    <div className="flex-1">
      <div className="text-center mb-1" style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label} <span style={{ color: '#9CA3AF' }}>{life}Y</span>
      </div>
      <div className="flex items-center gap-1 justify-center">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors"
          style={{ background: '#F5F4F0', color: '#16181D', border: '1px solid #E4E2DC' }}
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-mono font-semibold" style={{ color: '#16181D' }}>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors"
          style={{ background: '#F5F4F0', color: '#16181D', border: '1px solid #E4E2DC' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-xs font-semibold uppercase tracking-widest transition-colors"
        style={{ color: '#6B7280', borderBottom: '1px solid #E4E2DC', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
      >
        {title}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="pt-3 space-y-3">{children}</div>}
    </div>
  );
}

const ZIP_PRESETS = [
  { zip: '92373', label: '92373', medianDom: 40, uii: 4.8 },
  { zip: '10001', label: 'NYC', medianDom: 32, uii: 3.2 },
  { zip: '90210', label: 'LA', medianDom: 28, uii: 2.8 },
  { zip: '60601', label: 'CHI', medianDom: 45, uii: 5.1 },
  { zip: '77001', label: 'HOU', medianDom: 52, uii: 4.4 },
];

export default function IntakeForm({ intake, lenderExt, investorExt, commercialExt, onIntakeChange, onLenderChange, onInvestorChange, onCommercialChange }: Props) {
  const update = (fields: Partial<CoreIntake>) => onIntakeChange({ ...intake, ...fields });

  return (
    <div className="space-y-1">
      {/* ZIP Code */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
            ZIP code
          </label>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#6B7280' }}>AUTO-CALIBRATES</span>
        </div>
        <TextInput value={intake.zip} onChange={v => update({ zip: v })} placeholder="92373" maxLength={10} />
        <div className="flex flex-wrap gap-1 mt-2">
          {ZIP_PRESETS.map(p => (
            <button
              key={`zip-chip-${p.zip}`}
              onClick={() => update({ zip: p.zip, medianDomZip: p.medianDom, uiiMonths: p.uii })}
              className="px-2 py-0.5 rounded text-xs font-mono transition-all"
              style={{
                background: intake.zip === p.zip ? 'rgba(37,99,235,0.08)' : '#F5F4F0',
                color: intake.zip === p.zip ? '#2563EB' : '#6B7280',
                border: `1px solid ${intake.zip === p.zip ? 'rgba(37,99,235,0.3)' : '#E4E2DC'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Closed Median + UII chips */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-3" style={{ background: '#F5F4F0', border: '1px solid #E4E2DC' }}>
          <div className="flex items-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#0D9488' }} />
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
              Closed<br />Median
            </span>
          </div>
          <div className="text-lg font-mono font-bold" style={{ color: '#16181D' }}>{intake.medianDomZip}d</div>
          <div style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>censoring-corrected</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: '#F5F4F0', border: '1px solid #E4E2DC' }}>
          <div className="flex items-center gap-1 mb-1">
            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
              ◌ UII
            </span>
          </div>
          <div className="text-lg font-mono font-bold" style={{ color: '#16181D' }}>{intake.uiiMonths} mo</div>
          <div style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>inventory prior</div>
        </div>
      </div>

      {/* Baseline Value */}
      <div className="mb-3">
        <FieldLabel right="AS-IS">Baseline value</FieldLabel>
        <NumberInput value={intake.baselineValue} onChange={v => update({ baselineValue: v })} step={5000} min={50000} prefix="$" />
      </div>

      {/* Target Ask */}
      <div className="mb-3">
        <FieldLabel right="LIVE">Target ask</FieldLabel>
        <NumberInput value={intake.targetPrice} onChange={v => update({ targetPrice: v })} step={5000} min={50000} prefix="$" />
      </div>

      {/* Listing State + Actual DOM */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <FieldLabel>Listing state</FieldLabel>
          <select
            value={intake.listingState}
            onChange={e => update({ listingState: e.target.value as CoreIntake['listingState'] })}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{ background: '#FFFFFF', border: '1px solid #E4E2DC', color: '#16181D', fontFamily: 'var(--font-sans)' }}
          >
            <option value="pre_listing">pre listing</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        <div>
          <FieldLabel right="DAYS">Actual DOM</FieldLabel>
          <NumberInput value={intake.actualDom ?? 0} onChange={v => update({ actualDom: v > 0 ? v : null })} step={1} min={0} />
        </div>
      </div>

      {/* GLA */}
      <div className="mb-3">
        <FieldLabel right="SF">Gross living area</FieldLabel>
        <NumberInput value={intake.glaSqft} onChange={v => update({ glaSqft: v })} step={100} min={200} />
      </div>

      {/* Mechanical Ages */}
      <div className="mb-3">
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          Mechanical Ages
        </div>
        <div className="flex gap-3">
          <SpinnerInput label="HVAC" value={intake.hvacAge} onChange={v => update({ hvacAge: v })} life={15} />
          <SpinnerInput label="Roof" value={intake.roofAge} onChange={v => update({ roofAge: v })} life={20} />
          <SpinnerInput label="W.H." value={intake.whAge} onChange={v => update({ whAge: v })} life={10} />
        </div>
      </div>

      {/* Persona Extensions */}
      <CollapsibleSection title="Lender Extension">
        <div>
          <FieldLabel>LTV</FieldLabel>
          <NumberInput value={lenderExt.ltv * 100} onChange={v => onLenderChange({ ...lenderExt, ltv: v / 100 })} step={1} min={50} suffix="%" />
        </div>
        <div>
          <FieldLabel>Note Rate</FieldLabel>
          <NumberInput value={lenderExt.noteRate * 100} onChange={v => onLenderChange({ ...lenderExt, noteRate: v / 100 })} step={0.125} min={1} suffix="%" />
        </div>
        <div>
          <FieldLabel>Appraised Value</FieldLabel>
          <NumberInput value={lenderExt.appraisedValue} onChange={v => onLenderChange({ ...lenderExt, appraisedValue: v })} step={5000} min={50000} prefix="$" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Investor Extension">
        <div>
          <FieldLabel>Monthly Rent Roll</FieldLabel>
          <NumberInput value={investorExt.rentRollMonthly} onChange={v => onInvestorChange({ ...investorExt, rentRollMonthly: v })} step={100} min={0} prefix="$" />
        </div>
        <div>
          <FieldLabel>Hold Years</FieldLabel>
          <NumberInput value={investorExt.holdYears} onChange={v => onInvestorChange({ ...investorExt, holdYears: v })} step={1} min={1} suffix="yr" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Commercial Extension">
        <div>
          <FieldLabel>Available SF</FieldLabel>
          <NumberInput value={commercialExt.availableSf} onChange={v => onCommercialChange({ ...commercialExt, availableSf: v })} step={500} min={0} suffix="SF" />
        </div>
        <div>
          <FieldLabel>Monthly Absorbed SF</FieldLabel>
          <NumberInput value={commercialExt.monthlyAbsorbedSf} onChange={v => onCommercialChange({ ...commercialExt, monthlyAbsorbedSf: v })} step={100} min={1} suffix="SF" />
        </div>
        <div>
          <FieldLabel>WALT Months</FieldLabel>
          <NumberInput value={commercialExt.waltMonths} onChange={v => onCommercialChange({ ...commercialExt, waltMonths: v })} step={1} min={0} suffix="mo" />
        </div>
      </CollapsibleSection>
    </div>
  );
}