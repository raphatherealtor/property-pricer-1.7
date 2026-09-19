-- Property Pricer v1.6.1 — Persona Extension Column Additions
-- Migration: 20260918190000_persona_ext_columns.sql
-- Adds new columns to existing investor_ext and lender_ext tables.
-- The _ext tables already exist (created in 20260918033223) with intake_id as PK.
-- This migration only adds the v1.6.1 columns idempotently.

-- ─── investor_ext: add v1.6.1 columns ─────────────────────────────────────
ALTER TABLE public.investor_ext
  ADD COLUMN IF NOT EXISTS stabilized_noi DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.investor_ext
  ADD COLUMN IF NOT EXISTS loan_term_months INT NOT NULL DEFAULT 360;

ALTER TABLE public.investor_ext
  ADD COLUMN IF NOT EXISTS loan_rate_bps INT NOT NULL DEFAULT 650;

ALTER TABLE public.investor_ext
  ADD COLUMN IF NOT EXISTS ltv_ratio DECIMAL(6,4) NOT NULL DEFAULT 0.70;

-- ─── lender_ext: add v1.6.1 columns ──────────────────────────────────────
ALTER TABLE public.lender_ext
  ADD COLUMN IF NOT EXISTS mortgage_rate_bps INT;

ALTER TABLE public.lender_ext
  ADD COLUMN IF NOT EXISTS gross_monthly_income DECIMAL(14,2);

-- ─── Updated-at trigger function (idempotent) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_ext_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
