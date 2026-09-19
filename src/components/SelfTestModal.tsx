'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Zap, Loader2, AlertTriangle } from 'lucide-react';
import type { SelfTestResult } from '@/engine/selftest';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Reference parity case: +5% ask, UII 4.8, closed median 40d → P(>120d) ≈ 24.4%
const REFERENCE_CASE = {
  baseline: 600000,
  ask: 630000,
  overpricePct: 5,
  uii: 4.8,
  medianDom: 40,
  expectedP120d: 0.244,
  tolerance: 0.05,
};

export default function SelfTestModal({ isOpen, onClose }: Props) {
  const [results, setResults] = useState<SelfTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setResults([]);
    setTimeout(async () => {
      const { runSelfTests } = await import('@/engine/selftest');
      const r = runSelfTests();
      setResults(r);
      setLoading(false);
    }, 600);
  }, [isOpen]);

  if (!isOpen) return null;

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = total > 0 && passed === total;

  // Find T08 (reference parity check)
  const t08 = results.find(r => r.id === 'T08');
  const parityPassed = t08?.passed ?? false;
  const parityActual = t08?.actual ?? '—';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: 'var(--dark-panel)', border: '1px solid var(--dark-line)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--dark-line)' }}>
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: '#34D399' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--dark-ink)' }}>
              Engine v1.6 Self-Test Suite
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(37,99,235,0.15)', color: '#60A5FA' }}>
              ?selftest=1
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && total > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
                style={{
                  background: allPassed ? 'rgba(13,148,136,0.15)' : 'rgba(220,38,38,0.15)',
                  color: allPassed ? '#34D399' : '#F87171',
                  border: `1px solid ${allPassed ? 'rgba(13,148,136,0.3)' : 'rgba(220,38,38,0.3)'}`,
                }}
              >
                {passed}/{total} Passed
              </div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--dark-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Reference Parity Check Banner */}
        {!loading && total > 0 && (
          <div
            className="flex-shrink-0 flex items-start gap-3 px-5 py-3 border-b"
            style={{
              background: parityPassed ? 'rgba(13,148,136,0.08)' : 'rgba(220,38,38,0.08)',
              borderColor: parityPassed ? 'rgba(13,148,136,0.2)' : 'rgba(220,38,38,0.2)',
            }}
          >
            {parityPassed
              ? <CheckCircle size={14} style={{ color: '#34D399', flexShrink: 0, marginTop: 1 }} />
              : <AlertTriangle size={14} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
            }
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: parityPassed ? '#34D399' : '#F87171' }}>
                Reference Parity Check (T08) — {parityPassed ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
                Input: +{REFERENCE_CASE.overpricePct}% ask (${REFERENCE_CASE.ask.toLocaleString()}), UII {REFERENCE_CASE.uii}mo, ZIP median {REFERENCE_CASE.medianDom}d
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--dark-muted)' }}>
                Expected P(&gt;120d) ≈ {(REFERENCE_CASE.expectedP120d * 100).toFixed(1)}% ± {(REFERENCE_CASE.tolerance * 100).toFixed(0)}pp · Got: {parityActual}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-mono" style={{ color: 'var(--dark-muted)' }}>
                Running 14 assertion checks…
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={`test-${r.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: r.passed ? 'rgba(13,148,136,0.06)' : 'rgba(220,38,38,0.06)',
                    border: `1px solid ${r.passed ? 'rgba(13,148,136,0.15)' : 'rgba(220,38,38,0.15)'}`,
                    outline: r.id === 'T08' ? `2px solid ${r.passed ? 'rgba(13,148,136,0.4)' : 'rgba(220,38,38,0.4)'}` : 'none',
                  }}
                >
                  {r.passed
                    ? <CheckCircle size={14} style={{ color: '#34D399', marginTop: 1, flexShrink: 0 }} />
                    : <XCircle size={14} style={{ color: '#F87171', marginTop: 1, flexShrink: 0 }} />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold" style={{ color: r.id === 'T08' ? '#60A5FA' : 'var(--dark-muted)' }}>{r.id}</span>
                      <span className="text-xs" style={{ color: 'var(--dark-ink)' }}>{r.description}</span>
                      {r.id === 'T08' && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(37,99,235,0.15)', color: '#60A5FA' }}>
                          parity
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
                        Expected: <span style={{ color: '#60A5FA' }}>{r.expected}</span>
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
                        Got: <span style={{ color: r.passed ? '#34D399' : '#F87171' }}>{r.actual}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && total > 0 && (
          <div className="px-5 py-3 space-y-1" style={{ borderTop: '1px solid var(--dark-line)' }}>
            <p className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
              Reference case: Baseline=$600k · Ask=$630k (+5%) · UII=4.8mo · ZIP median=40d → P(&gt;120d) ≈ 24.4%
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--dark-muted)' }}>
              Trigger via URL: <span style={{ color: '#60A5FA' }}>?selftest=1</span> · Engine v1.6.1 · {total} assertions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}