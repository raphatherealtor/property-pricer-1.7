import React from 'react';
import Topbar from '@/components/Topbar';
import DeskWorkbench from './components/DeskWorkbench';

export default function DeskWorkbenchPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Topbar />
      <DeskWorkbench />
    </div>
  );
}