import type { CoreIntake, LenderExt, InvestorExt, CommercialExt } from './types';

export const defaultIntake: CoreIntake = {
  zip: '10001',
  baselineValue: 600000,
  targetPrice: 630000,
  listingState: 'pre_listing',
  actualDom: null,
  uiiMonths: 4.8,
  medianDomZip: 40,
  domClockBasis: 'closed_only',
  glaSqft: 2000,
  hvacAge: 8,
  roofAge: 10,
  whAge: 5,
  assetClass: 'residential',
};

export const defaultLenderExt: LenderExt = {
  ltv: 0.80,
  noteRate: 0.0695,
  termMonths: 360,
  appraisedValue: 595000,
  programReserveMonths: 6,
};

export const defaultInvestorExt: InvestorExt = {
  purchasePrice: 630000,
  rentRollMonthly: 4200,
  holdYears: 5,
  exitOvershootPct: 0.06,
  opexRatio: 0.42,
};

export const defaultCommercialExt: CommercialExt = {
  availableSf: 12000,
  monthlyAbsorbedSf: 950,
  waltMonths: 38,
  capRateEntryPct: 0.065,
  tenantRollover: [
    { id: 'tenant-001', sqft: 4200, expiryMonth: 14, annualRent: 126000, credit: 'A' },
    { id: 'tenant-002', sqft: 3100, expiryMonth: 28, annualRent: 89000, credit: 'B' },
    { id: 'tenant-003', sqft: 2800, expiryMonth: 42, annualRent: 78400, credit: 'A' },
    { id: 'tenant-004', sqft: 1900, expiryMonth: 8, annualRent: 49400, credit: 'C' },
  ],
};