'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { SurvivalPoint } from '@/engine/types';

interface Props {
  curve: SurvivalPoint[];
  p50Dom: number;
  expectedDom: number;
  actualDom: number | null;
}

interface TooltipPayload {
  value: number;
  name: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const survival = payload[0]?.value;
  const weeks = Number(label);
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono shadow-xl" style={{
      background: 'var(--dark-panel)',
      border: '1px solid var(--dark-line)',
      color: 'var(--dark-ink)',
    }}>
      <div className="font-semibold mb-1">Week {weeks.toFixed(1)} ({(weeks * 7).toFixed(0)}d)</div>
      <div style={{ color: '#60A5FA' }}>S(w) = {(Number(survival) * 100).toFixed(1)}%</div>
      <div style={{ color: 'var(--dark-muted)' }}>
        {(100 - Number(survival) * 100).toFixed(1)}% sold by this week
      </div>
    </div>
  );
}

export default function SurvivalCurveChart({ curve, p50Dom, expectedDom, actualDom }: Props) {
  const chartData = curve.map(pt => ({
    week: pt.week,
    survival: Math.round(pt.survival * 1000) / 1000,
  })).filter((_, i) => i % 2 === 0); // downsample for performance

  const p50Weeks = p50Dom / 7;
  const eDomWeeks = expectedDom / 7;
  const actualWeeks = actualDom ? actualDom / 7 : null;

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="survivalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis
            dataKey="week"
            tick={{ fill: 'var(--dark-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={v => `${v}w`}
            interval={3}
          />
          <YAxis
            tick={{ fill: 'var(--dark-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            domain={[0, 1]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="survival"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#survivalGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }}
          />
          {/* p50 marker */}
          <ReferenceLine
            x={p50Weeks}
            stroke="#34D399"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `p50 ${p50Dom.toFixed(0)}d`, position: 'top', fill: '#34D399', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          />
          {/* E[DOM] marker */}
          <ReferenceLine
            x={eDomWeeks}
            stroke="#FCD34D"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `E[DOM] ${expectedDom.toFixed(0)}d`, position: 'top', fill: '#FCD34D', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          />
          {/* 120d threshold */}
          <ReferenceLine
            x={120 / 7}
            stroke="#F87171"
            strokeDasharray="6 3"
            strokeWidth={1}
            label={{ value: '120d stale', position: 'insideTopRight', fill: '#F87171', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          />
          {/* Actual DOM cursor */}
          {actualWeeks && (
            <ReferenceLine
              x={actualWeeks}
              stroke="#A78BFA"
              strokeWidth={2}
              label={{ value: `Now ${actualDom}d`, position: 'top', fill: '#A78BFA', fontSize: 9, fontFamily: 'var(--font-mono)' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}