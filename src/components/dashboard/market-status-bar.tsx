/**
 * Market Status Bar Component
 * Shows NSE market status and current IST time
 */

'use client';

import { Clock } from 'lucide-react';
import type { MarketStatus } from '@/domain/prime';

interface MarketStatusBarProps {
  marketStatus: MarketStatus;
}

export function MarketStatusBar({ marketStatus }: MarketStatusBarProps) {
  const getStatusColor = () => {
    switch (marketStatus.session) {
      case 'OPEN':
        return 'text-green-400 bg-green-500/10';
      case 'PRE_MARKET':
      case 'POST_MARKET':
        return 'text-amber-400 bg-amber-500/10';
      default:
        return 'text-slate-400 bg-slate-800';
    }
  };
  
  const getStatusText = () => {
    switch (marketStatus.session) {
      case 'OPEN':
        return 'MARKET OPEN';
      case 'PRE_MARKET':
        return 'PRE-MARKET';
      case 'POST_MARKET':
        return 'POST-MARKET';
      default:
        return 'MARKET CLOSED';
    }
  };
  
  return (
    <div className="border-b border-slate-800 bg-slate-950/50">
      <div className="mx-auto max-w-[1800px] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4" />
              <span className="font-medium">NSE MARKET</span>
              <span className="text-slate-500">09:15 — 15:30 IST</span>
            </div>
            
            <div className={`rounded-md px-3 py-1 text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="text-slate-400">
              Current Time:{' '}
              <span className="font-mono text-slate-200">{marketStatus.currentTime}</span>
            </div>
            
            {marketStatus.nextChange && (
              <div className="text-slate-500">
                Next: {marketStatus.nextChange}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
