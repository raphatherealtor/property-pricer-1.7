'use client';
import { createClient } from '@/lib/supabase/client';
import type { SavedScenario, ScenarioPayload } from '@/store/engineStore';

const supabase = createClient();

export const scenarioService = {
  async list(): Promise<SavedScenario[]> {
    const { data, error } = await supabase
      .from('scenario_library')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading scenarios:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      scenario_id: row.scenario_id,
      name: row.name,
      description: row.description,
      payload: row.payload as ScenarioPayload,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_pinned: row.is_pinned,
      tags: row.tags || [],
    }));
  },

  async save(name: string, payload: ScenarioPayload, description?: string): Promise<SavedScenario | null> {
    const { data, error } = await supabase
      .from('scenario_library')
      .insert({
        name,
        description: description || null,
        payload,
        schema_version: payload.schema_version,
        calc_version: payload.calc_version,
        is_pinned: false,
        tags: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving scenario:', error.message);
      return null;
    }

    return {
      scenario_id: data.scenario_id,
      name: data.name,
      description: data.description,
      payload: data.payload as ScenarioPayload,
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_pinned: data.is_pinned,
      tags: data.tags || [],
    };
  },

  async delete(scenarioId: string): Promise<boolean> {
    const { error } = await supabase
      .from('scenario_library')
      .delete()
      .eq('scenario_id', scenarioId);

    if (error) {
      console.error('Error deleting scenario:', error.message);
      return false;
    }
    return true;
  },

  async togglePin(scenarioId: string, isPinned: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('scenario_library')
      .update({ is_pinned: isPinned })
      .eq('scenario_id', scenarioId);

    if (error) {
      console.error('Error toggling pin:', error.message);
      return false;
    }
    return true;
  },
};
