'use client';

import { ProfessionalRiskDashboard } from '@/components/ProfessionalRiskDashboard';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  return (
    <main>
      <ProfessionalRiskDashboard />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0e14',
            color: '#00ff41',
            border: '1px solid #1a1a1a',
            fontFamily: 'JetBrains Mono, monospace',
          },
        }}
      />
    </main>
  );
}