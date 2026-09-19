export type ListingState = 'pre_listing' | 'active' | 'pending' | 'closed' | 'withdrawn';
export type DomClockBasis = 'closed_only' | 'cumulative' | 'unknown';
export type ReadConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AssetClass = 'residential' | 'commercial';
export type EquipmentCondition = 'turnkey' | 'average' | 'aging';

export interface CoreIntake {
  zip: string;
  baselineValue: number;       // P_baseline
  targetPrice: number;         // P_target (ask)
  listingState: ListingState;
  actualDom: number | null;    // days already on market (null if pre-listing)
  uiiMonths: number;           // Unsold Inventory Index in months
  medianDomZip: number;        // closed-sale median DOM for ZIP (days)
  domClockBasis: DomClockBasis;
  glaSqft: number;             // Gross Leasable Area
  hvacAge: number;             // years
  roofAge: number;             // years
  whAge: number;               // water heater age years
  assetClass: AssetClass;
}

export interface LenderExt {
  ltv: number;                 // 0.0–1.0
  noteRate: number;            // annual decimal
  termMonths: number;
  appraisedValue: number;
  programReserveMonths: number;
}

export interface InvestorExt {
  purchasePrice: number;
  rentRollMonthly: number;
  holdYears: number;
  exitOvershootPct: number;    // decimal
  opexRatio: number;           // decimal
}

export interface CommercialExt {
  availableSf: number;
  monthlyAbsorbedSf: number;
  waltMonths: number;
  capRateEntryPct: number;     // decimal
  tenantRollover: TenantLease[];
}

export interface TenantLease {
  id: string;
  sqft: number;
  expiryMonth: number;         // months from now
  annualRent: number;
  credit: 'A' | 'B' | 'C';
}

export interface SurvivalPoint {
  week: number;
  survival: number;
  hazard: number;
}

export interface ComputedOutputs {
  // Engine intermediates
  uEff: number;                // effective overpricing fraction
  kappaT: number;              // submarket time-warp calibration
  kappaEff: number;            // effective dilation (overpricing + submarket)
  censoringInflation: number;  // multiplier applied
  velocityTension: number;     // |tension| fraction

  // Survival metrics
  expectedDom: number;         // days
  /**
   * v1.6.2: When tail > 5% at the 104-week cap, E[DOM] is a floor value.
   * Display as "> N days" in UI and exports. The tail-assignment convention
   * (all tail mass sells at horizon week) is materially load-bearing.
   * Disclosure: "Expected marketing time exceeds the modeled horizon."
   */
  domIsFloorValue: boolean;
  p50Dom: number;              // median DOM days
  pStale120d: number;          // P(DOM > 120d)
  pSold2wk: number;            // P(DOM ≤ 14d)
  expectedDiscountPct: number; // fraction
  expectedSalePrice: number;   // dollars

  // Financial outputs
  costOfTesting: number;       // dollar penalty of overpricing vs baseline
  scaledHoldback: number;      // escrow trap dollars
  netProceeds: number;         // expected net
  anchoredNetProceeds: number; // at baseline pricing

  // Conditional (if already listed)
  conditionalRemainingDom: number; // link?_CLIAMP REINSTATES SHARL
  // System flags
  velocityTensionFlag: boolean;
  censoringInflationApplied: boolean;
  terminalFlags: string[];
  readConfidence: ReadConfidence;

  // Survival curve points (weeks 0–30)
  survivalCurve: SurvivalPoint[];
}

export interface LenderOutputs {
  loanAmount: number;
  appraisalGapCash: number;
  postCloseLiquidityReserve: number;
  winnersCurseUplift: number;   // bps
  stressValue: number;
  stressLtv: number;
  monthlyPiti: number;
}

export interface InvestorOutputs {
  freshIrrAllCash: number;     // decimal
  freshIrrLevered: number;     // decimal
  staleIrrAllCash: number;
  staleIrrLevered: number;
  exitCapExpansionBps: number;
  returnErosionDollar: number;
  noi: number;
}

export interface CommercialOutputs {
  absorptionMonths: number;
  waltRunwayMonths: number;
  marketingWeeksAtAsk: number;
  twoClockRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  vacancyTransmission: number; // months of vacancy exposure
  dscrAfterReserves: number;
  topTenantConcentrationHhi: number;
}

export interface ListingAgentOutputs {
  freshNetProceeds: number;
  staleNetProceeds: number;
  netDelta: number;
  repairBeforeListingRoi: number;
  searchBrackets: SearchBracket[];
  conditionalDomCountdown: number | null;
}

export interface SearchBracket {
  label: string;
  demandCapture: number; // 0–1
  isVisible: boolean;
}

export interface FullEngineResult {
  intake: CoreIntake;
  computed: ComputedOutputs;
  listingAgent: ListingAgentOutputs;
  lender?: LenderOutputs;
  investor?: InvestorOutputs;
  commercial?: CommercialOutputs;
  engineVersion: string;
  computedAt: string;
  inputHash: string;
}
