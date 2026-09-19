-- Property Pricer v1.6 — RLS User-Scoped Policies
-- Migration: 20260918040000_rls_user_policies.sql
-- Adds user_id columns and auth.uid() = user_id RLS policies

-- Add user_id to scenario_library (per-user data)
ALTER TABLE public.scenario_library
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to core_intake
ALTER TABLE public.core_intake
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to computed_outputs (inherits via intake_id, but also direct for RLS)
-- computed_outputs links via intake_id so we use a join-based policy

-- Drop old open-access policies
DROP POLICY IF EXISTS "open_access_scenario_library" ON public.scenario_library;
DROP POLICY IF EXISTS "open_access_core_intake" ON public.core_intake;
DROP POLICY IF EXISTS "open_access_computed_outputs" ON public.computed_outputs;
DROP POLICY IF EXISTS "open_access_lender_ext" ON public.lender_ext;
DROP POLICY IF EXISTS "open_access_investor_ext" ON public.investor_ext;
DROP POLICY IF EXISTS "open_access_commercial_ext" ON public.commercial_ext;

-- ─── scenario_library: per-user RLS ───────────────────────────────────────
-- Authenticated users see only their own scenarios
CREATE POLICY "scenario_library_select_own"
  ON public.scenario_library FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "scenario_library_insert_own"
  ON public.scenario_library FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scenario_library_update_own"
  ON public.scenario_library FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scenario_library_delete_own"
  ON public.scenario_library FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous users: allow read/write with null user_id (unauthenticated session)
CREATE POLICY "scenario_library_anon_access"
  ON public.scenario_library FOR ALL
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- ─── core_intake: per-user RLS ─────────────────────────────────────────────
CREATE POLICY "core_intake_select_own"
  ON public.core_intake FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "core_intake_insert_own"
  ON public.core_intake FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "core_intake_update_own"
  ON public.core_intake FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "core_intake_delete_own"
  ON public.core_intake FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "core_intake_anon_access"
  ON public.core_intake FOR ALL
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- ─── computed_outputs: scoped via intake_id join ───────────────────────────
CREATE POLICY "computed_outputs_select_own"
  ON public.computed_outputs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.core_intake ci
      WHERE ci.intake_id = computed_outputs.intake_id
        AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "computed_outputs_insert_own"
  ON public.computed_outputs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.core_intake ci
      WHERE ci.intake_id = computed_outputs.intake_id
        AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "computed_outputs_anon_access"
  ON public.computed_outputs FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ─── Extension tables: open access (no PII, linked to intake) ─────────────
CREATE POLICY "lender_ext_open"
  ON public.lender_ext FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "investor_ext_open"
  ON public.investor_ext FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "commercial_ext_open"
  ON public.commercial_ext FOR ALL TO public USING (true) WITH CHECK (true);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_scenario_library_user_id ON public.scenario_library(user_id);
CREATE INDEX IF NOT EXISTS idx_core_intake_user_id ON public.core_intake(user_id);
