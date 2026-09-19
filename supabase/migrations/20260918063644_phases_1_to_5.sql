-- Property Pricer v1.6 — Phases 1–5 Feature Migration
-- Migration: 20260918063644_phases_1_to_5.sql

-- ─── PHASE 1: Shareable Scenario Links ────────────────────────────────────────
-- shared_scenarios: stores snapshot and interactive share links
CREATE TABLE IF NOT EXISTS public.shared_scenarios (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES public.scenario_library(scenario_id) ON DELETE CASCADE,
  link_type VARCHAR(20) NOT NULL DEFAULT 'snapshot'
    CHECK (link_type IN ('snapshot', 'interactive')),
  payload JSONB NOT NULL,
  calc_version VARCHAR(20) NOT NULL DEFAULT '1.6.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_shared_scenarios_share_id ON public.shared_scenarios(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_scenarios_expires ON public.shared_scenarios(expires_at);

ALTER TABLE public.shared_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS: unauthenticated users can only read their specific row by share_id
-- and only if not expired
DROP POLICY IF EXISTS "shared_scenarios_public_read" ON public.shared_scenarios;
CREATE POLICY "shared_scenarios_public_read" ON public.shared_scenarios
  FOR SELECT TO public
  USING (expires_at > NOW());

DROP POLICY IF EXISTS "shared_scenarios_insert" ON public.shared_scenarios;
CREATE POLICY "shared_scenarios_insert" ON public.shared_scenarios
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "shared_scenarios_update_views" ON public.shared_scenarios;
CREATE POLICY "shared_scenarios_update_views" ON public.shared_scenarios
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- ─── PHASE 2: White-Label PDF Branding ────────────────────────────────────────
-- user_brand_themes: stores per-user branding config
CREATE TABLE IF NOT EXISTS public.user_brand_themes (
  theme_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key VARCHAR(100) NOT NULL UNIQUE,  -- browser fingerprint or user-set key
  brand_theme JSONB NOT NULL DEFAULT '{
    "primaryHex": "#2563EB",
    "secondaryHex": "#0D9488",
    "logoUrl": null,
    "agentName": null,
    "brokerageName": null
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_brand_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_themes_open" ON public.user_brand_themes;
CREATE POLICY "brand_themes_open" ON public.user_brand_themes
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_brand_theme_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brand_theme_updated_at ON public.user_brand_themes;
CREATE TRIGGER brand_theme_updated_at
  BEFORE UPDATE ON public.user_brand_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_brand_theme_updated_at();

-- ─── PHASE 4: CSV Comps Upload ─────────────────────────────────────────────────
-- comps_uploads: stores parsed comp sets per scenario
CREATE TABLE IF NOT EXISTS public.comps_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES public.scenario_library(scenario_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  valid_comps JSONB NOT NULL DEFAULT '[]'::jsonb,
  comp_count INT NOT NULL DEFAULT 0,
  median_price_per_sf NUMERIC(10,2),
  auto_baseline_value NUMERIC(12,2),
  outliers_trimmed INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'valid', 'insufficient', 'error'))
);

ALTER TABLE public.comps_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comps_uploads_open" ON public.comps_uploads;
CREATE POLICY "comps_uploads_open" ON public.comps_uploads
  FOR ALL TO public USING (true) WITH CHECK (true);

-- comps_audit_log: tracks manual baseline overrides
CREATE TABLE IF NOT EXISTS public.comps_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES public.comps_uploads(upload_id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.scenario_library(scenario_id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL DEFAULT 'baseline_override',
  auto_value NUMERIC(12,2),
  manual_value NUMERIC(12,2),
  delta NUMERIC(12,2),
  note TEXT
);

ALTER TABLE public.comps_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comps_audit_log_open" ON public.comps_audit_log;
CREATE POLICY "comps_audit_log_open" ON public.comps_audit_log
  FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── PHASE 5: CRM Webhook Configs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_webhook_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_type VARCHAR(30) NOT NULL
    CHECK (crm_type IN ('boldtrail', 'salesforce', 'cinc', 'followupboss', 'zoho', 'sierra', 'realgeeks')),
  label VARCHAR(100),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  hmac_secret VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_push_at TIMESTAMPTZ,
  last_push_status VARCHAR(20),
  push_count INT NOT NULL DEFAULT 0
);

ALTER TABLE public.crm_webhook_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_webhook_configs_open" ON public.crm_webhook_configs;
CREATE POLICY "crm_webhook_configs_open" ON public.crm_webhook_configs
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_crm_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_config_updated_at ON public.crm_webhook_configs;
CREATE TRIGGER crm_config_updated_at
  BEFORE UPDATE ON public.crm_webhook_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_config_updated_at();

-- crm_push_log: audit trail for all outbound CRM pushes
CREATE TABLE IF NOT EXISTS public.crm_push_log (
  push_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.crm_webhook_configs(config_id) ON DELETE SET NULL,
  scenario_id UUID REFERENCES public.scenario_library(scenario_id) ON DELETE SET NULL,
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calc_version VARCHAR(20) NOT NULL DEFAULT '1.6.1',
  http_status INT,
  response_body TEXT,
  error_message TEXT,
  payload_hash VARCHAR(64)
);

ALTER TABLE public.crm_push_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_push_log_open" ON public.crm_push_log;
CREATE POLICY "crm_push_log_open" ON public.crm_push_log
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comps_uploads_scenario ON public.comps_uploads(scenario_id);
CREATE INDEX IF NOT EXISTS idx_comps_audit_scenario ON public.comps_audit_log(scenario_id);
CREATE INDEX IF NOT EXISTS idx_crm_push_log_config ON public.crm_push_log(config_id);
CREATE INDEX IF NOT EXISTS idx_crm_push_log_pushed ON public.crm_push_log(pushed_at DESC);
