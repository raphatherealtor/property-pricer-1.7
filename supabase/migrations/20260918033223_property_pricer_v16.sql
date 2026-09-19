-- Property Pricer v1.6 Database Schema
-- Migration: 20260918033223_property_pricer_v16.sql

-- Core Intake Table
CREATE TABLE IF NOT EXISTS public.core_intake (
  intake_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zip VARCHAR(10) NOT NULL,
  baseline_value NUMERIC(12,2) NOT NULL CHECK (baseline_value > 0),
  target_price NUMERIC(12,2) NOT NULL CHECK (target_price > 0),
  listing_state VARCHAR(20) NOT NULL DEFAULT 'pre_listing'
    CHECK (listing_state IN ('pre_listing', 'active', 'pending', 'closed', 'withdrawn')),
  actual_dom INT DEFAULT NULL CHECK (actual_dom IS NULL OR actual_dom >= 0),
  uii_months NUMERIC(4,2) NOT NULL CHECK (uii_months > 0),
  median_dom_zip INT NOT NULL CHECK (median_dom_zip > 0),
  dom_clock_basis VARCHAR(20) NOT NULL DEFAULT 'closed_only'
    CHECK (dom_clock_basis IN ('closed_only', 'cumulative', 'unknown')),
  gla_sqft INT NOT NULL DEFAULT 2000 CHECK (gla_sqft > 0),
  hvac_age INT NOT NULL CHECK (hvac_age >= 0),
  roof_age INT NOT NULL CHECK (roof_age >= 0),
  wh_age INT NOT NULL CHECK (wh_age >= 0),
  asset_class VARCHAR(20) NOT NULL DEFAULT 'residential'
    CHECK (asset_class IN ('residential', 'commercial')),
  input_hash VARCHAR(64) NOT NULL
);

-- Append-Only Computed Output Audit Store
CREATE TABLE IF NOT EXISTS public.computed_outputs (
  output_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.core_intake(intake_id) ON DELETE CASCADE,
  calc_version VARCHAR(20) NOT NULL DEFAULT '1.6.1',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  u_eff NUMERIC(6,4) NOT NULL,
  kappa_t NUMERIC(6,4) NOT NULL,
  kappa_eff NUMERIC(6,4) NOT NULL,
  expected_dom NUMERIC(6,1) NOT NULL,
  p50_dom NUMERIC(6,1) NOT NULL,
  p_stale_120d NUMERIC(6,4) NOT NULL,
  p_sold_2wk NUMERIC(6,4) NOT NULL,
  expected_discount_pct NUMERIC(6,4) NOT NULL,
  expected_sale_price NUMERIC(12,2) NOT NULL,
  cost_of_testing NUMERIC(12,2) NOT NULL,
  scaled_holdback NUMERIC(12,2) NOT NULL,
  terminal_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_confidence VARCHAR(10) NOT NULL DEFAULT 'HIGH',
  UNIQUE (intake_id, calc_version)
);

-- Scenario Library Table (Phase 1)
CREATE TABLE IF NOT EXISTS public.scenario_library (
  scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES public.core_intake(intake_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  payload JSONB NOT NULL,
  schema_version VARCHAR(20) NOT NULL DEFAULT '1.6',
  calc_version VARCHAR(20) NOT NULL DEFAULT '1.6.1',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Lender Extension
CREATE TABLE IF NOT EXISTS public.lender_ext (
  intake_id UUID PRIMARY KEY REFERENCES public.core_intake(intake_id) ON DELETE CASCADE,
  ltv NUMERIC(5,4) NOT NULL,
  note_rate NUMERIC(6,4) NOT NULL,
  term_months INT NOT NULL DEFAULT 360,
  loan_type VARCHAR(20) NOT NULL DEFAULT 'conventional',
  appraised_value NUMERIC(12,2) NOT NULL,
  program_reserve_months INT NOT NULL DEFAULT 6
);

-- Investor Extension
CREATE TABLE IF NOT EXISTS public.investor_ext (
  intake_id UUID PRIMARY KEY REFERENCES public.core_intake(intake_id) ON DELETE CASCADE,
  purchase_price NUMERIC(12,2) NOT NULL,
  rent_roll_monthly NUMERIC(10,2) NOT NULL,
  hold_years INT NOT NULL DEFAULT 5,
  exit_overshoot_pct NUMERIC(5,4) NOT NULL DEFAULT 0.06,
  opex_ratio NUMERIC(5,4) NOT NULL DEFAULT 0.45
);

-- Commercial Extension
CREATE TABLE IF NOT EXISTS public.commercial_ext (
  intake_id UUID PRIMARY KEY REFERENCES public.core_intake(intake_id) ON DELETE CASCADE,
  available_sf INT NOT NULL,
  monthly_absorbed_sf INT NOT NULL,
  walt_months NUMERIC(6,2) NOT NULL,
  cap_rate_entry_pct NUMERIC(6,4) NOT NULL,
  tenant_rollover JSONB NOT NULL DEFAULT '[]'::jsonb,
  roof_inventory JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_core_intake_zip ON public.core_intake(zip);
CREATE INDEX IF NOT EXISTS idx_computed_outputs_lookup ON public.computed_outputs(intake_id, calc_version);
CREATE INDEX IF NOT EXISTS idx_scenario_library_created ON public.scenario_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_library_pinned ON public.scenario_library(is_pinned) WHERE is_pinned = true;

-- Enable RLS
ALTER TABLE public.core_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_ext ENABLE ROW LEVEL SECURITY;

-- RLS Policies (open access for anonymous use - no auth required for this app)
DROP POLICY IF EXISTS "open_access_core_intake" ON public.core_intake;
CREATE POLICY "open_access_core_intake" ON public.core_intake FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_computed_outputs" ON public.computed_outputs;
CREATE POLICY "open_access_computed_outputs" ON public.computed_outputs FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_scenario_library" ON public.scenario_library;
CREATE POLICY "open_access_scenario_library" ON public.scenario_library FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_lender_ext" ON public.lender_ext;
CREATE POLICY "open_access_lender_ext" ON public.lender_ext FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_investor_ext" ON public.investor_ext;
CREATE POLICY "open_access_investor_ext" ON public.investor_ext FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_commercial_ext" ON public.commercial_ext;
CREATE POLICY "open_access_commercial_ext" ON public.commercial_ext FOR ALL TO public USING (true) WITH CHECK (true);

-- Updated_at trigger for scenario_library
CREATE OR REPLACE FUNCTION public.update_scenario_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scenario_library_updated_at ON public.scenario_library;
CREATE TRIGGER scenario_library_updated_at
  BEFORE UPDATE ON public.scenario_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scenario_updated_at();
