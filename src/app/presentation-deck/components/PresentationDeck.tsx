'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEngineStore } from '@/store/engineStore';
import { runEngine } from '@/engine/core';
import { computeListingAgent } from '@/engine/personas';

import { createClient } from '@/lib/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Slide0Visibility from './Slide0Visibility';
import Slide1Conversion from './Slide1Conversion';
import Slide2TimeCurve from './Slide2TimeCurve';
import Slide3PriceBridge from './Slide3PriceBridge';
import Slide4Escrow from './Slide4Escrow';
import Slide5Decision from './Slide5Decision';
import type { ScenarioPayload } from '@/store/engineStore';

const BROADCAST_CHANNEL = 'property-pricer-sync';

const SLIDE_TITLES = [
  'Stage 1 · Visibility',
  'Stage 2 · Conversion',
  'Stage 3 · Time',
  'Stage 3 · Price',
  'Stage 4 · Escrow & Close',
  'The Decision Matrix',
];

// power2.out easing: t => 1 - (1-t)^2
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export default function PresentationDeck() {
  const { intake, recompute } = useEngineStore();
  const [slide, setSlide] = React.useState(0);
  const [direction, setDirection] = React.useState<'left' | 'right'>('right');
  const [askPrice, setAskPrice] = React.useState(intake.targetPrice);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);

  // Screen Mode: smoothly interpolated kappa passed to Slide2TimeCurve
  // undefined = Desk Mode (slider drives directly), number = Screen Mode (broadcast-driven)
  const [screenKappa, setScreenKappa] = useState<number | undefined>(undefined);

  // Tween refs for Screen Mode kappa interpolation
  const tweenFromRef = useRef<number>(0);
  const tweenToRef = useRef<number>(0);
  const tweenStartRef = useRef<number>(0);
  const tweenRafRef = useRef<number | null>(null);
  const TWEEN_DURATION = 150; // ms — fast, fluid, power2.out

  const startKappaTween = useCallback((from: number, to: number) => {
    if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
    tweenFromRef.current = from;
    tweenToRef.current = to;
    tweenStartRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - tweenStartRef.current;
      const t = Math.min(elapsed / TWEEN_DURATION, 1);
      const easedT = easeOut(t);
      const interpolated = tweenFromRef.current + (tweenToRef.current - tweenFromRef.current) * easedT;
      setScreenKappa(interpolated);

      if (t < 1) {
        tweenRafRef.current = requestAnimationFrame(step);
      } else {
        tweenRafRef.current = null;
        setScreenKappa(tweenToRef.current);
      }
    };

    tweenRafRef.current = requestAnimationFrame(step);
  }, []);

  const liveIntake = { ...intake, targetPrice: askPrice };
  const computed = runEngine(liveIntake);
  const listingAgent = computeListingAgent(liveIntake, computed);

  const goTo = useCallback((next: number) => {
    if (next < 0 || next > 5) return;
    setDirection(next > slide ? 'right' : 'left');
    setSlide(next);
  }, [slide]);

  // Subscribe to Realtime broadcast from Desk
  useEffect(() => {
    const channel = supabaseRef.current.channel(BROADCAST_CHANNEL);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'engine_state' }, (msg: { payload: ScenarioPayload }) => {
        if (msg.payload?.intake) {
          const newIntake = msg.payload.intake;
          recompute(newIntake);
          setAskPrice(newIntake.targetPrice);

          // Smooth interpolation: tween from current kappa to new broadcast kappa
          // instead of snapping — eliminates visual stutter between ~18Hz network ticks
          const newComputed = runEngine(newIntake);
          const currentKappa = tweenToRef.current || newComputed.kappaEff;
          startKappaTween(currentKappa, newComputed.kappaEff);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (tweenRafRef.current) cancelAnimationFrame(tweenRafRef.current);
    };
  }, [recompute, startKappaTween]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(slide + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(slide - 1);
      if (e.key === 'd') window.location.href = '/';
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slide, goTo]);

  const slideProps = { intake: liveIntake, computed, listingAgent, askPrice, setAskPrice };

  const slides = [
    <Slide0Visibility key="slide-0" {...slideProps} />,
    <Slide1Conversion key="slide-1" {...slideProps} />,
    // Pass screenKappa only when we have received at least one broadcast (Screen Mode)
    // In Desk Mode (no broadcast yet), screenKappa is undefined and the slider drives directly
    <Slide2TimeCurve key="slide-2" {...slideProps} screenKappa={screenKappa} />,
    <Slide3PriceBridge key="slide-3" {...slideProps} />,
    <Slide4Escrow key="slide-4" {...slideProps} />,
    <Slide5Decision key="slide-5" {...slideProps} />,
  ];

  return (
    <div className="fixed inset-0 pt-12" style={{ background: 'var(--dark)' }}>
      <div
        key={`slide-content-${slide}`}
        className={direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
        style={{ height: '100%' }}
      >
        {slides[slide]}
      </div>

      {/* Navigation */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-8 z-20">
        <button
          onClick={() => goTo(slide - 1)}
          disabled={slide === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: 'transparent',
            color: slide === 0 ? 'rgba(255,255,255,0.2)' : '#E8EDF7',
            border: 'none',
            opacity: slide === 0 ? 0.3 : 1,
          }}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {SLIDE_TITLES.map((title, i) => (
            <button
              key={`dot-${i}`}
              onClick={() => goTo(i)}
              title={title}
              className="transition-all duration-300"
              style={{
                width: i === slide ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: i === slide ? 'white' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(slide + 1)}
          disabled={slide === 5}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: slide === 5 ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
            color: slide === 5 ? 'rgba(255,255,255,0.2)' : '#16181D',
            border: 'none',
          }}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Navigation hint */}
      <div className="absolute top-16 right-6 text-xs font-mono flex items-center gap-2" style={{ color: '#8FA1C0' }}>
        <span style={{ fontSize: '10px' }}>⬛</span>
        <span>← → slides · D desk</span>
      </div>
    </div>
  );
}