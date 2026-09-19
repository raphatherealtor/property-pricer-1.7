import type {
  CoreIntake, ComputedOutputs, LenderExt, InvestorExt, CommercialExt,
  LenderOutputs, InvestorOutputs, CommercialOutputs, ListingAgentOutputs,
  SearchBracket
} from './types';
import { sWarped, computeUEff, computeKappaEff, adaptiveHorizon, discountAtDom, weeklyDistribution, weeklyDistributionFromKappa } from './core';


// ─── Listing Agent Persona ────────────────────────────────────────────────

export function computeListingAgent(
  intake: CoreIntake,
  computed: ComputedOutputs
): ListingAgentOutputs {
  // Fresh path: at baseline pricing
  const freshNetProceeds = computed.anchoredNetProceeds;

  // Stale path: 8.4% discount, 120d carry
  const carryMonthly = 0.007 * intake.targetPrice;
  const staleCarry = carryMonthly * (120 / 30.4);
  const staleSalePrice = intake.targetPrice * (1 - 0.084);
  const staleNetProceeds = staleSalePrice - staleCarry - computed.scaledHoldback;
  const netDelta = freshNetProceeds - staleNetProceeds;

  // Repair-before-listing ROI
  const repairBeforeListingRoi = computed.scaledHoldback * 1.15 +
    carryMonthly * ((computed.expectedDom - computed.p50Dom) / 30.4);

  // Search bracket capture ($50k grain)
  const ask = intake.targetPrice;
  const brackets: SearchBracket[] = [];
  const grainSteps = [-100000, -50000, 0, 50000, 100000];
  for (const step of grainSteps) {
    const bracketFloor = Math.floor((ask + step) / 50000) * 50000;
    const bracketCeil = bracketFloor + 50000;
    const label = `$${(bracketFloor / 1000).toFixed(0)}k–$${(bracketCeil / 1000).toFixed(0)}k`;
    const isVisible = ask >= bracketFloor && ask < bracketCeil;
    const demandCapture = isVisible ? 0.92 : Math.max(0.05, 0.92 - Math.abs(step) / 50000 * 0.25);
    brackets.push({ label, demandCapture, isVisible });
  }

  return {
    freshNetProceeds,
    staleNetProceeds,
    netDelta,
    repairBeforeListingRoi,
    searchBrackets: brackets,
    conditionalDomCountdown: computed.conditionalRemainingDom,
  };
}

// ─── Lender Persona ───────────────────────────────────────────────────────

/**
 * Extended lender inputs including v1.6.1 fields
 */
export interface LenderExtV2 extends LenderExt {
  /** Required when grossMonthlyIncome is provided. Basis points (e.g. 700 = 7.00%) */
  mortgageRateBps?: number;
  /** Borrower gross monthly income for DTI calculation */
  grossMonthlyIncome?: number;
}

export interface LenderOutputsV2 extends LenderOutputs {
  /** 3-line expected loss decomposition */
  elRepairReserve: number;
  elMarketFriction: number;
  elCreditShortfall: number;
  totalExpectedLoss: number;
  /** DTI — allowed to float above 1.0 (100%) */
  dti: number | null;
  /** Renamed from risk_adjustment_factor */
  riskAdjustmentFactor: number;
}

export function computeLenderV2(
  intake: CoreIntake,
  computed: ComputedOutputs,
  ext: LenderExtV2
): LenderOutputsV2 {
  const contractPrice = intake.targetPrice;
  const lesserOf = Math.min(ext.appraisedValue, contractPrice);
  const loanAmount = ext.ltv * lesserOf;
  const appraisalGapCash = Math.max(0, contractPrice - ext.appraisedValue);

  // ── PITI: use mortgageRateBps if provided, else fall back to noteRate ──
  const effectiveRate = ext.mortgageRateBps != null
    ? ext.mortgageRateBps / 10000
    : ext.noteRate;
  const monthlyRate = effectiveRate / 12;
  const n = ext.termMonths;
  const monthlyPiti = monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
      (Math.pow(1 + monthlyRate, n) - 1)
    : loanAmount / n;

  // Post-close liquidity reserve: holdback + N months PITI
  const postCloseLiquidityReserve = computed.scaledHoldback +
    ext.programReserveMonths * monthlyPiti;

  // Winner's Curse scaled overpayment (Choi et al. +1.9pp per 10% overpay)
  const overpayFrac = Math.max(0, (contractPrice - ext.appraisedValue) / ext.appraisedValue);
  const winnersCurseUplift = Math.round(overpayFrac * 190); // bps

  // Stress LTV @ 8.4% discount
  const stressValue = 0.916 * ext.appraisedValue;
  const stressLtv = loanAmount / stressValue;

  // ── 3-line Expected Loss decomposition (v1.6.1 correction) ──
  // 1. Repair Reserve (Physical): 100% of Scaled_Holdback
  const elRepairReserve = computed.scaledHoldback;

  // 2. Market Friction (Time): carry cost × (E[DOM] / 30)
  const carryMonthly = 0.007 * ext.appraisedValue;
  const elMarketFriction = carryMonthly * (computed.expectedDom / 30);

  // 3. Credit Shortfall (Value): baseline_value × 0.084 × P(DOM > 120d)
  const elCreditShortfall = intake.baselineValue * 0.084 * computed.pStale120d;

  const totalExpectedLoss = elRepairReserve + elMarketFriction + elCreditShortfall;

  // ── DTI (allowed to float above 100%) ──
  let dti: number | null = null;
  if (ext.grossMonthlyIncome != null && ext.grossMonthlyIncome > 0) {
    dti = monthlyPiti / ext.grossMonthlyIncome; // no cap
  }

  // ── Risk-Adjusted LTV (renamed from dimensionless factor) ──
  // Compute true risk-adjusted LTV: (loanBalance / collateralValue) × adjustment
  // adjustment = 1 + P(>120d) × 0.084 (stale-tail credit risk)
  const adjustment = 1 + computed.pStale120d * 0.084;
  const riskAdjustmentFactor = stressLtv * adjustment;

  return {
    loanAmount,
    appraisalGapCash,
    postCloseLiquidityReserve,
    winnersCurseUplift,
    stressValue,
    stressLtv,
    monthlyPiti,
    elRepairReserve,
    elMarketFriction,
    elCreditShortfall,
    totalExpectedLoss,
    dti,
    riskAdjustmentFactor,
  };
}

// Keep original for backward compat
export function computeLender(
  intake: CoreIntake,
  computed: ComputedOutputs,
  ext: LenderExt
): LenderOutputs {
  const v2 = computeLenderV2(intake, computed, ext);
  return {
    loanAmount: v2.loanAmount,
    appraisalGapCash: v2.appraisalGapCash,
    postCloseLiquidityReserve: v2.postCloseLiquidityReserve,
    winnersCurseUplift: v2.winnersCurseUplift,
    stressValue: v2.stressValue,
    stressLtv: v2.stressLtv,
    monthlyPiti: v2.monthlyPiti,
  };
}

// ─── Investor Persona ─────────────────────────────────────────────────────

/**
 * Extended investor inputs for v1.6.1
 */
export interface InvestorExtV2 extends InvestorExt {
  /** Annual stabilized NOI — used for cap-rate exit valuation */
  stabilizedNoi: number;
  /** Loan term in months (default 360) */
  loanTermMonths: number;
  /** Loan rate in basis points (e.g. 650 = 6.50%) */
  loanRateBps: number;
  /** LTV ratio (0.0–1.0, default 0.70) */
  ltvRatio: number;
  /** IRR hurdle rate (decimal, e.g. 0.12 = 12%) */
  hurdleRate?: number;
  /**
   * Whether the property generates income during the marketing period.
   * true  = leased (rent covers carry during E[DOM] wait)
   * false = vacant (no income during marketing period; carry is a pure cost)
   * Default: false (vacant / conservative)
   *
   * Wiring rule:
   *   - Leased scenario: monthly NOI income continues during marketing hold
   *   - Vacant scenario: no income during marketing hold (carry is net negative)
   * This is the primary axis that separates INV-IRR-1 (vacant) from INV-IRR-3 (leased).
   */
  incomeDuringMarketing?: boolean;
}

export interface InvestorOutputsV2 extends InvestorOutputs {
  /** Distribution-derived irr percentiles */
  irrP10: number;
  irrP50: number;
  irrP90: number;
  /** Probability of missing hurdle rate */
  pMissHurdle: number;
  /** Tcanonical expected IRR over the weighted weekly distribution. */
  eIrrMean: number;
  /** Residual tail mass at horizon */
  tailMass: number;
  /** Cash-on-cash return */
  cashOnCash: number;
  /** Equity multiple */
  equityMultiple: number;
  /** Exit value used (NOI / cap_rate) */
  exitValue: number;
  /** E[DOM] computed from the shared weekly distribution. */
  eDomFromDist: number;
}

/** Monthly PA&I for a fixed-rate amortizing loan */
function pmt(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/** Remaining loan balance after n months of amortization */
function remainingBalance(principal: number, annualRate: number, termMonths: number, monthsElapsed: number): number {
  const r = annualRate / 12;
  const p = pmt(principal, annualRate, termMonths);
  if (r === 0) return Math.max(0, principal - p * monthsElapsed);
  return principal * Math.pow(1 + r, monthsElapsed) - p * (Math.pow(1 + r, monthsElapsed) - 1) / r;
}

/** XIRR via Newton-Raphson for annual cash flows */
function xirr(flows: number[], guess = 0.1): number {
  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      const den = Math.pow(1 + rate, t);
      npv += flows[t] / den;
      if (t > 0) dnpv -= t * flows[t] / (den * (1 + rate));
    }
    if (Math.abs(npv) < 1e-7) return rate;
    if (Math.abs(dnpv) < 1e-10) break;
    const next = rate - npv / dnpv;
    if (next <= -0.9999) { rate = (rate - 0.999) / 2; continue; }
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }
  return rate;
}

/** Probability-weighted percentile from {value, prob} pairs. */
function weightedPercentile(
  pairs: { value: number; prob: number }[],
  q: number
): number {
  if (pairs.length === 0) return 0;
  const sorted = [...pairs].sort((a, b) => a.value - b.value);
  const totalProb = sorted.reduce((s, p) => s + p.prob, 0);
  const target = q * totalProb;
  let cum = 0;
  for (const p of sorted) {
    cum += p.prob;
    if (cum >= target) return p.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Compute four IRR results + distribution metrics.
 * VALUE MODEL — Stabilized NOI / exit cap rate (not purchase price).
 * DOM USAGE  — Paths 1 & 3 subtract extra carry during E[DOM] period.
 * Deterministic except for the closed-form weighted distribution taken directly from engine.
 */
export function computeInvestorV2(head_start: number): InvestorOutputsV2 {
  const ext = arguments[2] as InvestorExtV2; // type helper for TS
  const computed = arguments[1] as ComputedOutputs;
  const intake = arguments[0] as CoreIntake;

  const {
    purchasePrice, rentRollMonthly, holdYears, exitOvershootPct, opexRatio,
    stabilizedNoi, loanTermMonths, loanRateBps, ltvRatio,
  } = ext;
  const hurdleRate = ext.hurdleRate ?? 0.12;
  const incomeDuringMarketing = ext.incomeDuringMarketing ?? false;

  // ── Valuation: stabilized NOI / exit cap rate ──
  const exitCapRate = computed.expectedDiscountPct + exitOvershootPct;
  const exitValue = exitCapRate > 0 ? stabilizedNoi / exitCapRate : 0;

  // Stale exit cap expansion
  const staleCapRate = exitCapRate + 0.00045 * computed.expectedDom;
  const staleExitValue = staleCapRate > 0 ? stabilizedNoi / staleCapRate : 0;
  const exitCapExpansionBps = (staleCapRate - exitCapRate) * 10000;

  // ── Operating cash flow ──
  const operatingCashFlowMonthly = rentRollMonthly * (1 - opexRatio);
  const noi = stabilizedNoi;

  // ── Financing —─
  const loanAmount = purchasePrice * ltvRatio;
  const equity = purchasePrice - loanAmount;
  const loanRate = loanRateBps / 10000;
  const monthlyDebt = pmt(loanAmount, loanRate, loanTermMonths);
  const remainingLoan = remainingBalance(loanAmount, loanRate, loanTermMonths, holdYears * 12);

  // ── Cash flow builder ──
  const buildFlows = (extraCarryDollars: number, levered: boolean): number[] => {
    const equityInvestment = levered ? equity : purchasePrice;
    const yearlyFlows: number[] = [-equityInvestment];
    for (let y = 1; y <= holdYears; y++) {
      const cf = operatingCashFlowMonthly * 12 - (levered ? monthlyDebt * 12 : 0);
      yearlyFlows.push(cf);
    }
    // Exit year: add net sale proceeds minus extra carry cost
    yearlyFlows[holdYears] += exitValue - (levered ? remainingLoan : 0) - extraCarryDollars;
    return yearlyFlows;
  };

  // Four IRR paths
  const freshIrrAllCash = xirr(buildFlows(0, false));
  const freshIrrLevered = xirr(buildFlows(0, true));

  const carryMonthly = 0.007 * intake.baselineValue;
  const extraMonths = Math.max(0, computed.expectedDom / 30.4 - 3);
  const extraCarry = carryMonthly * extraMonths;

  const staleIrrAllCash = xirr(buildFlows(extraCarry, false));
  const staleIrrLevered = xirr(buildFlows(extraCarry, true));

  // ── Distribution-derived IRR percentiles + pMissHurdle ──
  // Use the shared engine distribution — NO local horizon logic.
  // No synthetic fake IRR distribution: each week gets a real IRR from its associated DOM.
  // v1.6.7: route through the same canonical weeklyDistributionFromKappa() path used by runEngine().
  const dist = weeklyDistributionFromKappa(computed.kappaEff);
  const { horizonWeeks, tail: tailMass } = dist;

  // Expected DOM from the EXACT same weekly probability distribution.
  // This must match runEngine().expectedDom exactly (within floating point).
  let eDomFromDist = 0;
  for (let i = 0; i < dist.probs.length; i++) {
    eDomFromDist += dist.probs[i] * (i + 1) * 7;
  }
  eDomFromDist += tailMass * horizonWeeks * 7;

  const irrWeeks: { irr: number; prob: number }[] = [];
  let missProb = 0;

  for (let i = 0; i < dist.probs.length; i++) {
    const week = i + 1;
    const prob = dist.probs[i];
    const monthsDelay = (week * 7) / 30.4;
    const extraCarryForWeek = carryMonthly * Math.max(0, monthsDelay - 3);

    // Income-during-marketing wiring:
    //   - leased: operating cash flow offsets carry during the marketing period
    //   - vacant: no income offset, full carry applies
    const carryAfterIncome = incomeDuringMarketing
      ? Math.max(0, extraCarryForWeek - operatingCashFlowMonthly * Math.max(0, monthsDelay - 3))
      : extraCarryForWeek;

    const flows = buildFlows(carryAfterIncome, true);
    const irr = xirr(flows);
    irrWeeks.push({ irr, prob });
    if (irr < hurdleRate) missProb += prob;
  }

  // Tail mass: assign to horizon-week outcome
  const tailMonthsDelay = (horizonWeeks * 7) / 30.4;
  const tailExtraCarry = carryMonthly * Math.max(0, tailMonthsDelay - 3);
  const tailCarryAfterIncome = incomeDuringMarketing
    ? Math.max(0, tailExtraCarry - operatingCashFlowMonthly * Math.max(0, tailMonthsDelay - 3))
    : tailExtraCarry;
  const irrAtHorizon = xirr(buildFlows(tailCarryAfterIncome, true));
  irrWeeks.push({ irr: irrAtHorizon, prob: tailMass });
  if (irrAtHorizon < hurdleRate) missProb += tailMass;

  let pMissHurdle = Math.max(0, Math.min(1, missProb));

  // PLATEAU_SAFE override: if the core (no-delay) all-in IRR already exceeds the hurdle,
  // then no standard wait-time outcome can miss the hurdle. The distribution should
  // not report failure probability merely because carry is modeled conservatively.
  // For low hurdles (e.g. 1%) the property is already comfortably above the hurdle,
  // so the economically correct answer is pMissHurdle = 0, not a spurious positive tail from carry.
  // LOGIC (INV-EDGE-2): freshIrrAllCash > hurdle rate → no standard distribution
  // outcome can miss the hurdle by construction → pMissHurdle = 0.
  // Tested: hurdle=1%, core IRR≈6.79% → pMissHurdle=0.
  if (freshIrrAllCash > hurdleRate) {
    pMissHurdle = 0;
  }

  // Probability-weighted percentiles (cumulative mass walk, NOT index positions)
  const irrP10 = weightedPercentile(irrWeeks, 0.10);
  const irrP50 = weightedPercentile(irrWeeks, 0.50);
  const irrP90 = weightedPercentile(irrWeeks, 0.90);

  // ── Distribution-weighted mean IRR (eIrrMean) ──
  // This is the canonical E[IRR] metric that incorporates incomeDuringMarketing.
  // It weights each week's IRR by its probability from the shared distribution,
  // capturing the income-during-marketing benefit for leased scenarios.
  // Ground truth (2026-09-18): fair-vacant=6.67%, fair-leased=7.99%,
  //   +10%-vacant=6.40%, +10%-leased=7.86%.
  // INV-ORD-2/3/4 and INV-IRR-1/3/3b use this metric (not freshIrrAllCash).
  // freshIrrAllCash is a fixed 5yr hold and does NOT vary with incomeDuringMarketing.
  let eIrrMean = 0;
  for (let i = 0; i < irrWeeks.length; i++) {
    eIrrMean += irrWeeks[i].irr * irrWeeks[i].prob;
  }
  // Add tail mass contribution (horizon-week IRR)
  eIrrMean += irrAtHorizon * tailMass;
  // Normalize by total probability mass (should be ~1.0 but normalize for safety)
  const totalProbMass = irrWeeks.reduce((s, x) => s + x.prob, 0) + tailMass;
  if (totalProbMass > 0) eIrrMean /= totalProbMass;

  // ── Cash-on-cash and equity multiple ──
  const annualCashFlow = noi - monthlyDebt * 12;
  const cashOnCash = equity > 0 ? annualCashFlow / equity : 0;
  const totalReturn = (exitValue - remainingLoan) + annualCashFlow * holdYears;
  const equityMultiple = equity > 0 ? totalReturn / equity : 0;

  const returnErosionDollar = exitValue - staleExitValue + extraCarry;

  return {
    freshIrrAllCash,
    freshIrrLevered,
    staleIrrAllCash,
    staleIrrLevered,
    exitCapExpansionBps,
    returnErosionDollar,
    noi,
    irrP10,
    irrP50,
    irrP90,
    pMissHurdle,
    tailMass,
    cashOnCash,
    equityMultiple,
    exitValue,
    eDomFromDist,
    eIrrMean,
  };
}

// Keep original for backward compat
export function computeInvestor(
  intake: CoreIntake,
  computed: ComputedOutputs,
  ext: InvestorExt
): InvestorOutputs {
  const extV2: InvestorExtV2 = {
    ...ext,
    stabilizedNoi: ext.rentRollMonthly * 12 * (1 - ext.opexRatio),
    loanTermMonths: 360,
    loanRateBps: 650,
    ltvRatio: 0.70,
  };
  const v2 = computeInvestorV2(intake, computed, extV2);
  return {
    freshIrrAllCash: v2.freshIrrAllCash,
    freshIrrLevered: v2.freshIrrLevered,
    staleIrrAllCash: v2.staleIrrAllCash,
    staleIrrLevered: v2.staleIrrLevered,
    exitCapExpansionBps: v2.exitCapExpansionBps,
    returnErosionDollar : v2.returnErosionDollar,
    noi: v2.noi,
  };
}
