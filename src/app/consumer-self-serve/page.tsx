import React from 'react';
import Topbar from '@/components/Topbar';
import ConsumerSelfServe from './components/ConsumerSelfServe';

export default function ConsumerPage() {
  return (
    <div className="consumer-bg min-h-screen">
      <Topbar />
      <ConsumerSelfServe />
    </div>
  );
}