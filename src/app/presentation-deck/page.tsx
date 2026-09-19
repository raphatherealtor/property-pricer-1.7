import React from 'react';
import Topbar from '@/components/Topbar';
import PresentationDeck from './components/PresentationDeck';

export default function PresentationDeckPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      <Topbar />
      <PresentationDeck />
    </div>
  );
}