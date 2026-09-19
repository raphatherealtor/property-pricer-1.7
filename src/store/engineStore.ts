import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CoreIntake, LenderExt, InvestorExt, CommercialExt, ComputedOutputs } from '@/engine/types';
import { defaultIntake, defaultLenderExt, defaultInvestorExt, defaultCommercialExt } from '@/engine/defaults';
import { runEngine } from '@/engine/core';

export const CURRENT_SCHEMA_VERSION = '1.6';
export const CURRENT_CALC_VERSION = '1.6.1';

export interface ScenarioPayload {
  intake: CoreIntake;
  lenderExt: LenderExt;
  investorExt: InvestorExt;
  commercialExt: CommercialExt;
  activePersona: 'agent' | 'lender' | 'investor' | 'commercial';
  schema_version: string;
  calc_version: string;
  savedAt: string;
}

export interface SavedScenario {
  scenario_id: string;
  name: string;
  description?: string;
  payload: ScenarioPayload;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  tags: string[];
}

export interface VersionMismatchWarning {
  scenarioId: string;
  scenarioName: string;
  savedSchemaVersion: string;
  savedCalcVersion: string;
  currentSchemaVersion: string;
  currentCalcVersion: string;
}

interface EngineStore {
  // Core state
  intake: CoreIntake;
  lenderExt: LenderExt;
  investorExt: InvestorExt;
  commercialExt: CommercialExt;
  computed: ComputedOutputs;
  activePersona: 'agent' | 'lender' | 'investor' | 'commercial';

  // Scenario library
  scenarios: SavedScenario[];
  versionMismatchWarning: VersionMismatchWarning | null;
  isLoadingScenarios: boolean;
  isSavingScenario: boolean;

  // Realtime sync
  realtimeChannel: string | null;
  lastBroadcastAt: number;

  // Actions
  setIntake: (intake: CoreIntake) => void;
  setLenderExt: (ext: LenderExt) => void;
  setInvestorExt: (ext: InvestorExt) => void;
  setCommercialExt: (ext: CommercialExt) => void;
  setActivePersona: (persona: 'agent' | 'lender' | 'investor' | 'commercial') => void;
  recompute: (intake: CoreIntake) => void;
  resetToDefaults: () => void;

  // Scenario actions
  loadScenario: (scenario: SavedScenario) => void;
  dismissVersionWarning: () => void;
  setScenarios: (scenarios: SavedScenario[]) => void;
  setIsLoadingScenarios: (loading: boolean) => void;
  setIsSavingScenario: (saving: boolean) => void;

  // Realtime
  setLastBroadcastAt: (ts: number) => void;

  // Getters
  getScenarioPayload: () => ScenarioPayload;
}

export const useEngineStore = create<EngineStore>()(
  persist(
    (set, get) => ({
      intake: defaultIntake,
      lenderExt: defaultLenderExt,
      investorExt: defaultInvestorExt,
      commercialExt: defaultCommercialExt,
      computed: runEngine(defaultIntake),
      activePersona: 'agent',

      scenarios: [],
      versionMismatchWarning: null,
      isLoadingScenarios: false,
      isSavingScenario: false,

      realtimeChannel: null,
      lastBroadcastAt: 0,

      setIntake: (intake) => {
        set({ intake });
      },

      setLenderExt: (lenderExt) => set({ lenderExt }),
      setInvestorExt: (investorExt) => set({ investorExt }),
      setCommercialExt: (commercialExt) => set({ commercialExt }),
      setActivePersona: (activePersona) => set({ activePersona }),

      recompute: (intake) => {
        const computed = runEngine(intake);
        set({ intake, computed });
      },

      resetToDefaults: () => {
        const computed = runEngine(defaultIntake);
        set({
          intake: defaultIntake,
          lenderExt: defaultLenderExt,
          investorExt: defaultInvestorExt,
          commercialExt: defaultCommercialExt,
          computed,
          activePersona: 'agent',
          versionMismatchWarning: null,
        });
      },

      loadScenario: (scenario) => {
        const { payload } = scenario;

        // Version mismatch check
        const schemaMismatch = payload.schema_version !== CURRENT_SCHEMA_VERSION;
        const calcMismatch = payload.calc_version !== CURRENT_CALC_VERSION;

        if (schemaMismatch || calcMismatch) {
          set({
            versionMismatchWarning: {
              scenarioId: scenario.scenario_id,
              scenarioName: scenario.name,
              savedSchemaVersion: payload.schema_version,
              savedCalcVersion: payload.calc_version,
              currentSchemaVersion: CURRENT_SCHEMA_VERSION,
              currentCalcVersion: CURRENT_CALC_VERSION,
            },
          });
        } else {
          set({ versionMismatchWarning: null });
        }

        // Hydrate store from payload
        const computed = runEngine(payload.intake);
        set({
          intake: payload.intake,
          lenderExt: payload.lenderExt,
          investorExt: payload.investorExt,
          commercialExt: payload.commercialExt,
          activePersona: payload.activePersona,
          computed,
        });
      },

      dismissVersionWarning: () => set({ versionMismatchWarning: null }),

      setScenarios: (scenarios) => set({ scenarios }),
      setIsLoadingScenarios: (isLoadingScenarios) => set({ isLoadingScenarios }),
      setIsSavingScenario: (isSavingScenario) => set({ isSavingScenario }),

      setLastBroadcastAt: (lastBroadcastAt) => set({ lastBroadcastAt }),

      getScenarioPayload: (): ScenarioPayload => {
        const { intake, lenderExt, investorExt, commercialExt, activePersona } = get();
        return {
          intake,
          lenderExt,
          investorExt,
          commercialExt,
          activePersona,
          schema_version: CURRENT_SCHEMA_VERSION,
          calc_version: CURRENT_CALC_VERSION,
          savedAt: new Date().toISOString(),
        };
      },
    }),
    {
      name: 'property-pricer-engine',
      partialize: (state) => ({
        intake: state.intake,
        lenderExt: state.lenderExt,
        investorExt: state.investorExt,
        commercialExt: state.commercialExt,
        activePersona: state.activePersona,
      }),
    }
  )
);
