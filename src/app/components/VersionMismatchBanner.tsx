'use client';
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { VersionMismatchWarning } from '@/store/engineStore';

interface Props {
  warning: VersionMismatchWarning;
  onDismiss: () => void;
}

export default function VersionMismatchBanner({ warning, onDismiss }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{ background: 'rgba(217,119,6,0.12)', borderBottom: '1px solid rgba(217,119,6,0.3)' }}
    >
      <AlertTriangle size={14} style={{ color: '#FCD34D', flexShrink: 0 }} />
      <div className="flex-1">
        <span className="font-semibold" style={{ color: '#FCD34D' }}>Version Mismatch: </span>
        <span style={{ color: 'var(--dark-ink)' }}>
          Scenario &quot;{warning.scenarioName}&quot; was saved with schema v{warning.savedSchemaVersion} / calc v{warning.savedCalcVersion}.
          Current engine is schema v{warning.currentSchemaVersion} / calc v{warning.currentCalcVersion}.
          Results may differ — verify outputs before presenting.
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        style={{ color: 'var(--dark-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
