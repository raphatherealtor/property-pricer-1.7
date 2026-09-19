import type {
  CoreIntake, ComputedOutputs, SurvivalPoint
} from './types';

// ─── Hazard parameters (Framework-Sourced [FW]) ───────────────────────────
const H1 = 0.098;
const H2 = 0.084;
const H3 = 0.062;
const HP = 0.018; // persistent plateau

// Precompute survival knots
const S1 = 1 - H1;                          // 0.9020
const S2 = S1 * (1 - H2);                   // 0.8262
const S3 = S2 * (1 - H3);                   // 0.7750 (spec: ~0.7745)

// National baseline median (weeks) — solve S_base(w) = 0.5
// S3 * (1-HP)^(w-3) = 0.5 => w = 3 + ln(0.5/S3)/ln(1-HP)
export const M_BASE_WEEKS = 3 + Math.log(0.5 / S3) / Math.log(1 - HP);
// ≈ 27.1282 weeks (spec value)

/**
 * National baseline survival function S_base(w) at fractional week w
 */
export function sBase(w: number): number {
  if (w <= 0) return 1.0;
  if (w <= 1) return 1.0 - H1 * w;
  if (w <= 2) return S1 - S1 * H2 * (w - 1);
  if (w <= 3) return S2 - S2 * H3 * (w - 2);
  return S3 * Math.pow(1 - HP, w - 3);
}

/**
 * Time-warped survival: S(κ·w)
 */
export function sWarped(kappa: number, w: number): number {
  return sBase(kappa * w);
}

/**
 * Censoring inflation factor: infl(κ) = 1 + 0.45·exp(−(κ−1)/2)
 * [FW] Exact formula from Property-Pricer-Audit-v1.6
 */
function censoringInflation(kappa: number): number {
  return 1 + 0.45 * Math.exp(-(kappa - 1) / 2);
}

/**
 * Fixed-point iteration for κ_t (submarket time-warp calibration)
 * Corrects for MLS closed-sale censoring bias
 */
export function calibrateKappaT(medianDomDays: number): { kappaT: number; inflation: number } {
  const mClosedWeeks = medianDomDays / 7.0;
  let kappa = M_BASE_WEEKS / mClosedWeeks;

  for (let i = 0; i < 8; i++) {
    const infl = censoringInflation(kappa);
    const mAllWeeks = mClosedWeeks * infl;
    kappa = M_BASE_WEEKS / mAllWeeks;
  }

  const inflation = censoringInflation(kappa);
  return { kappaT: kappa, inflation };
}

/**
 * Velocity tension diagnostic: compare UII-implied kappa vs closed-DOM kappa
 * Returns signed tension fraction
 */
function velocityTension(uiiMonths: number, kappaT: number): number {
  // UII-implied kappa: national baseline UII ≈ 4.5 months
  const kappaUii = 4.5 / uiiMonths;
  return (kappaUii - kappaT) / kappaT;
}

/**
 * Effective overpricing exposure u_eff
 * u_eff = clip((target/baseline − 1.03) / 0.20, 0, 1)
 * [EA] Exact formula from Property-Pricer-Audit-v1.6
 */
export function computeUEff(targetPrice: number, baselineValue: number): number {
  return Math.max(0, Math.min(1, (targetPrice / baselineValue - 1.03) / 0.20));
}

/**
 * Time dilation: κ_eff = κ_t · max(0.22, (1 − u_eff)^1.15)
 * [EA] Exact formula from Property-Pricer-Audit-v1.6
 */
export function computeKappaEff(kappaT: number, uEff: number): number {
  const dilation = Math.max(0.22, Math.pow(1 - uEff, 1.15));
  return kappaT * dilation;
}

/**
 * Expected discount function E[d] at DOM t (days)
 * Interpolates: d=1.9% at t≤60d, linear to 8.4% at t=120d, capped at 8.4%
 */
export function discountAtDom(domDays: number): number {
  if (domDays <= 60) return 0.019;
  if (domDays >= 120) return 0.084;
  return 0.019 + (0.084 - 0.019) * (domDays - 60) / 60;
}

/**
 * Adaptive horizon: smallest w where S(κ_eff * w) < 0.01, capped at 104 weeks.
 * Extension loop: extends while S(h) >= 0.01, stops when S(h) < 0.01.
 * Ground truth: use S(h) >= 0.01 (>=, not >) in the extension loop.
 * Equivalently: stop when S(h) < 0.01 (<, not <=).
 * This matters at the boundary: if S(40) ≈ 1.0% exactly, the loop does NOT
 * stop at 40 (since 0.01 is not < 0.01), so horizon = 41 (not 40).
 * Recomputed 2026-09-18: 0%/30d scenario → horizon=41wk, E[DOM]=55.11d.
 * MATH-11b fix: changing <= to < shifts E[DOM] from ~55.8d to 55.11d.
 */
export function adaptiveHorizon(kappaEff: number): number {
  for (let w = 1; w <= 104; w++) {
    if (sWarped(kappaEff, w) < 0.01) return w;
  }
  return 104;
}

// ─── Single Shared Weekly Distribution (v1.6.2) ──────────────────────────

/**
 * Canonical weekly distribution interface.
 * Every consumer (core E[DOM], investor, agent) must call weeklyDistribution().
 * No module may re-implement the horizon logic locally.
 */
export interface WeeklyDistribution {
  /** probs[i] = P(sale in week i+1) = S(i) - S(i+1) */
  probs: number[];
  /** P(unsold at horizon), assigned to horizon-week sale */
  tail: number;
  /** adaptive: extends while S(h) >= 0.01, cap 104 */
  horizonWeeks: number;
  /** Survival function at week w */
  S: (w: number) => number;
}

/**
 * Single shared distribution implementation.
 * ALL modules must call this function — no local horizon logic permitted.
 * Adaptive horizon: extends while S(κ_eff * w) >= 0.01, capped at 104 weeks.
 *
 * v1.6.2: Replaces all 26-week truncation. Any remaining WEEKS_TO_EVALUATE,
 * week <= 26, or horizon = 26 in the codebase is a bug.
 */
export function weeklyDistribution(
  medianClosedDays: number,
  overpricingPct: number
): WeeklyDistribution {
  const { kappaT } = calibrateKappaT(medianClosedDays);
  // uEff uses the canonical clip formula: clip((1+overpricingPct - 1.03)/0.20, 0, 1)
  const uEff = Math.max(0, Math.min(1, (1 + overpricingPct - 1.03) / 0.20));
  const kappaEff = computeKappaEff(kappaT, uEff);
  const horizonWeeks = adaptiveHorizon(kappaEff);

  const probs: number[] = [];
  for (let w = 1; w <= horizonWeeks; w++) {
    probs.push(sWarped(kappaEff, w - 1) - sWarped(kappaEff, w));
  }
  const tail = sWarped(kappaEff, horizonWeeks);

  return {
    probs,
    tail,
    horizonWeeks,
    S: (w: number) => sWarped(kappaEff, w),
  };
}

/**
 * weeklyDistributionFromKappa: build distribution from pre-computed kappaEff.
 * Used internally by runEngine and computeInvestorV2 to share the same distribution.
 */
export function weeklyDistributionFromKappa(kappaEff: number): WeeklyDistribution {
  const horizonWeeks = adaptiveHorizon(kappaEff);
  const probs: number[] = [];
  for (let w = 1; w <= horizonWeeks; w++) {
    probs.push(sWarped(kappaEff, w - 1) - sWarped(kappaEff, w));
  }
  const tail = sWarped(kappaEff, horizonWeeks);
  return {
    probs,
    tail,
    horizonWeeks,
    S: (w: number) => sWarped(kappaEff, w),
  };
}

/**
 * Numerical integration of expected discount over survival density.
 * Uses weeklyDistributionFromKappa — single shared distribution.
 */
function integrateExpectedDiscount(kappaEff: number): number {
  const W_MAX = adaptiveHorizon(kappaEff);
  const dw = 0.1;
  let edSum = 0;
  let probMass = 0;

  for (let w = 0; w <= W_MAX; w += dw) {
    const sw0 = sWarped(kappaEff, w);
    const sw1 = sWarped(kappaEff, w + dw);
    const density = sw0 - sw1; // probability of selling in [w, w+dw]
    let dom = w * 7;
    edSum += density * discountAtDom(dom);
    probMass += density;
  }

  // Residual mass beyond horizon — assign 8.4% discount
  const residual = sWarped(kappaEff, W_MAX);
  edSum += residual * 0.084;
  probMass += residual;

  return probMass > 0 ? edSum / probMass : 0.084;
}

/**
 * Expected DOM — canonical week-sum + tail implementation.
 * Uses weeklyDistributionFromKappa (single shared distribution).
 * Formula: sum_{w=1..H} w * P(w) + H * S(H)
 * This is the ONLY E[DOM] implementation. All consumers must use this path.
 * Ground truth (2026-09-18): 0%/30d → 55.11d (horizon=41wk, tail≈1%).
 *
 * DELETED: integrateExpectedDom() (continuous trapezoidal integral, dw=0.1).
 * That function produced ~51.2d for 0%/30d — a different value because it
 * integrated the continuous density without the discrete tail-week assignment.
 * It has been removed. runEngine() now calls computeExpectedDomFromDist() below.
 */
function computeExpectedDomFromDist(kappaEff: number): { dom: number; tail: number } {
  const dist = weeklyDistributionFromKappa(kappaEff);
  let dom = 0;
  for (let i = 0; i < dist.probs.length; i++) {
    let w = i + 1; // week number (1-indexed)
    dom += dist.probs[i] * w * 7;
  }
  // Tail mass assigned to horizon week (canonical: H * S(H))
  dom += dist.tail * dist.horizonWeeks * 7;
  return { dom, tail: dist.tail };
}

/**
 * P50 DOM: smallest w such that S(κ_eff * w) ≤ 0.5, converted to days
 */
function computeP50Dom(kappaEff: number): number {
  for (let w = 0.1; w <= 200; w += 0.1) {
    if (sWarped(kappaEff, w) <= 0.5) return w * 7;
  }
  return 200 * 7;
}

/**
 * Scaled holdback (escrow trap) from aging mechanical systems
 */
export function computeScaledHoldback(
  glaSqft: number,
  hvacAge: number,
  roofAge: number,
  whAge: number,
  baselineValue: number,
  assetClass: 'residential' | 'commercial',
  terminalFlags: string[]
): number {
  const isCommercial = assetClass === 'commercial';

  // Replacement rates $/SF
  const rates = isCommercial
    ? { hvac: 4.0, roof: 7.5, wh: 0.5 }
    : { hvac: 4.5, roof: 9.5, wh: 1.2 };

  // Expected service lifecycles
  const lives = { hvac: 15, roof: 20, wh: 10 };

  // Class multiplier from baseline $/SF
  const priceSf = baselineValue / glaSqft;
  const classMultiplier = priceSf <= 150 ? 0.75 : priceSf <= 350 ? 1.0 : 1.9;

  function systemHoldback(age: number, life: number, ratePerSf: number, systemName: string): number {
    if (age >= life) {
      terminalFlags.push(`TERMINAL_${systemName.toUpperCase()}`);
      return ratePerSf * glaSqft * classMultiplier;
    }
    const ageFrac = age / life;
    // w_sys = 0 below 80% of lifecycle; linear ramp from 0 at 80% to 1 at 100%
    if (ageFrac < 0.8) return 0;
    const w_sys = (ageFrac - 0.8) / 0.2;
    return ratePerSf * glaSqft * classMultiplier * w_sys;
  }

  const hvacHb = systemHoldback(hvacAge, lives.hvac, rates.hvac, 'hvac');
  const roofHb = systemHoldback(roofAge, lives.roof, rates.roof, 'roof');
  const whHb = systemHoldback(whAge, lives.wh, rates.wh, 'wh');

  return hvacHb + roofHb + whHb;
}

/**
 * Build survival curve points for charting (weeks 0–30, step 0.5)
 */
function buildSurvivalCurve(kappaEff: number): SurvivalPoint[] {
  const points: SurvivalPoint[] = [];
  for (let w = 0; w <= 30; w += 0.5) {
    const s = sWarped(kappaEff, w);
    const h = w === 0 ? H1 : (sWarped(kappaEff, w - 0.5) - s) / sWarped(kappaEff, w - 0.5);
    points.push({ week: w, survival: Math.max(0, s), hazard: Math.max(0, h) });
  }
  return points;
}

/**
 * Main engine computation
 */
export function runEngine(intake: CoreIntake): ComputedOutputs {
  const {
    baselineValue, targetPrice, medianDomZip, uiiMonths,
    glaSqft, hvacAge, roofAge, whAge, assetClass,
    actualDom, domClockBasis
  } = intake;

  const terminalFlags: string[] = [];

  // 1. Submarket calibration
  const { kappaT, inflation } = calibrateKappaT(medianDomZip);

  // 2. Velocity tension
  const tension = velocityTension(uiiMonths, kappaT);
  const velocityTensionFlag = Math.abs(tension) > 0.35;

  // 3. Effective overpricing exposure (clip formula from spec)
  const uEff = computeUEff(targetPrice, baselineValue);

  // 4. Effective kappa
  const kappaEff = computeKappaEff(kappaT, uEff);

  // 5. Survival metrics — use canonical week-sum+tail E[DOM] (single shared implementation)
  const { dom: expectedDom, tail: domTailMass } = computeExpectedDomFromDist(kappaEff);
  const p50Dom = computeP50Dom(kappaEff);
  const pStale120d = sWarped(kappaEff, 120 / 7);
  const pSold2wk = 1 - sWarped(kappaEff, 2);

  // 5a. domIsFloorValue: when tail > 5%, E[DOM] is a floor value (tail-assignment is load-bearing)
  // Display as "> N days" in UI and exports. Recomputed date: 2026-09-18.
  const domIsFloorValue = domTailMass > 0.05;

  // 6. Expected discount — anchored to baseline value (not target price)
  const expectedDiscountPct = integrateExpectedDiscount(kappaEff);
  const expectedSalePrice = baselineValue * (1 - expectedDiscountPct);

  // 7. Holdback
  const scaledHoldback = computeScaledHoldback(
    glaSqft, hvacAge, roofAge, whAge, baselineValue, assetClass, terminalFlags
  );

  // 8. Net proceeds — carry based on baseline value
  const carryMonthly = 0.007 * baselineValue;
  const expectedDomMonths = expectedDom / 30.4;
  const netProceeds = expectedSalePrice - carryMonthly * expectedDomMonths - scaledHoldback;

  // Anchored net proceeds (at baseline, no overpricing)
  const anchoredKappaEff = kappaT; // no overpricing
  const anchoredDiscount = integrateExpectedDiscount(anchoredKappaEff);
  const anchoredSalePrice = baselineValue * (1 - anchoredDiscount);
  const { dom: anchoredDom } = computeExpectedDomFromDist(anchoredKappaEff);
  const anchoredDomMonths = anchoredDom / 30.4;
  const anchoredHoldback = computeScaledHoldback(
    glaSqft, hvacAge, roofAge, whAge, baselineValue, assetClass, []
  );
  const anchoredNetProceeds = anchoredSalePrice - carryMonthly * anchoredDomMonths - anchoredHoldback;

  // 9. Cost of testing
  const costOfTesting = anchoredNetProceeds - netProceeds;

  // 10. Conditional DOM (if already listed)
  let conditionalRemainingDom: number | null = null;
  if (actualDom !== null && actualDom > 0) {
    const sWeeks = actualDom / 7.0;
    const sAtS = sWarped(kappaEff, sWeeks);
    if (sAtS > 0.001) {
      const W_MAX = adaptiveHorizon(kappaEff);
      const dw = 0.1;
      let integral = 0;
      for (let w = sWeeks; w <= W_MAX; w += dw) {
        integral += sWarped(kappaEff, w) * dw;
      }
      const conditionalWeeks = sWeeks + integral / sAtS;
      conditionalRemainingDom = Math.max(0, (conditionalWeeks - sWeeks) * 7);
    }
  }

  // 11. Read confidence
  let readConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  if (domClockBasis === 'unknown' || uEff > 0.15) readConfidence = 'LOW';
  else if (velocityTensionFlag || inflation > 1.4) readConfidence = 'MEDIUM';

  // 12. Survival curve for charting
  const survivalCurve = buildSurvivalCurve(kappaEff);

  return {
    uEff,
    kappaT,
    kappaEff,
    censoringInflation: inflation,
    velocityTension: tension,
    expectedDom,
    domIsFloorValue,
    p50Dom,
    pStale120d,
    pSold2wk,
    expectedDiscountPct,
    expectedSalePrice,
    costOfTesting,
    scaledHoldback,
    netProceeds,
    anchoredNetProceeds,
    conditionalRemainingDom,
    velocityTensionFlag,
    censoringInflationApplied: inflation > 1.05,
    terminalFlags,
    readConfidence,
    survivalCurve,
  };
}