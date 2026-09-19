'use client';
import React from 'react';
import type { CoreIntake, ComputedOutputs } from '@/engine/types';

interface Props {
  stage: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  intake?: CoreIntake;
  computed?: ComputedOutputs;
}

export default function SlideShell({ stage, title, subtitle, children }: Props) {
  return (
    <div
      className="h-full flex flex-col px-8 py-6 overflow-hidden relative"
      style={{ background: '#0B1220' }}
    >
      {/* CRT Scanline overlay — CSS-based, Screen mode only */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0,0.08) 4px)',
          mixBlendMode: 'multiply',
        }}
        aria-hidden="true"
      />

      {/* SVG Film grain noise overlay */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full z-10"
        style={{ opacity: 0.04, mixBlendMode: 'screen' }}
        aria-hidden="true"
      >
        <filter id="grain-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          >
            <animate
              attributeName="seed"
              values="0;10;20;30;40;50;60;70;80;90;100"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" />
      </svg>

      {/* Header */}
      <div className="flex-shrink-0 mb-5 relative z-20">
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8FA1C0', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          {stage}
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 700, color: '#E8EDF7', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: '#8FA1C0' }}>{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative z-20">
        {children}
      </div>

      {/* MSA Hazard Limitation Disclosure */}
      <div className="flex-shrink-0 mt-3 pt-2 relative z-20" style={{ borderTop: '1px solid rgba(143,161,192,0.2)' }}>
        <p style={{ fontSize: '9px', color: '#8FA1C0', fontFamily: 'var(--font-mono)', lineHeight: 1.5, opacity: 0.7 }}>
          Baseline hazard curve calibrated to national patterns. Local submarket friction calibrated via user-supplied closed median data.
        </p>
      </div>
    </div>
  );
}