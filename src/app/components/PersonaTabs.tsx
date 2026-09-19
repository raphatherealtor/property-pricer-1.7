'use client';
import React from 'react';
import type {
  CoreIntake, ComputedOutputs, ListingAgentOutputs,
  LenderOutputs, InvestorOutputs, CommercialOutputs
} from '@/engine/types';
import ListingAgentPanel from './personas/ListingAgentPanel';
import LenderPanel from './personas/LenderPanel';
import InvestorPanel from './personas/InvestorPanel';
import CommercialPanel from './personas/CommercialPanel';

interface Props {
  activePersona: 'agent' | 'lender' | 'investor' | 'commercial';
  intake: CoreIntake;
  computed: ComputedOutputs;
  listingAgent: ListingAgentOutputs;
  lender: LenderOutputs;
  investor: InvestorOutputs;
  commercial: CommercialOutputs;
}

export default function PersonaTabs({ activePersona, intake, computed, listingAgent, lender, investor, commercial }: Props) {
  return (
    <div className="animate-fade-in">
      {activePersona === 'agent' && (
        <ListingAgentPanel intake={intake} computed={computed} data={listingAgent} />
      )}
      {activePersona === 'lender' && (
        <LenderPanel intake={intake} computed={computed} data={lender} />
      )}
      {activePersona === 'investor' && (
        <InvestorPanel intake={intake} computed={computed} data={investor} />
      )}
      {activePersona === 'commercial' && (
        <CommercialPanel intake={intake} computed={computed} data={commercial} />
      )}
    </div>
  );
}