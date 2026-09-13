/**
 * State Badge Component
 * Visual badge for Prime scanner states
 */

import type { ScannerState, Direction } from '@/domain/prime';

interface StateBadgeProps {
  state: ScannerState;
  direction?: Direction;
  size?: 'sm' | 'md' | 'lg';
}

export function StateBadge({ state, direction, size = 'md' }: StateBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  
  const getStateConfig = () => {
    switch (state) {
      case 'CONFIRMED':
        return {
          label: 'CONFIRMED',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        };
      case 'SETUP':
        return {
          label: 'SETUP',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        };
      case 'WATCH':
        return {
          label: 'WATCH',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        };
      case 'FAKE_BREAKOUT':
        return {
          label: 'FAKE BREAKOUT',
          color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };
      case 'INVALID':
        return {
          label: 'INVALID',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
      case 'NO_TRADE':
        return {
          label: 'NO TRADE',
          color: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
        };
    }
  };
  
  const config = getStateConfig();
  
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded border font-medium ${sizeClasses[size]} ${config.color}`}
      >
        {config.label}
      </span>
      
      {direction && direction !== 'NEUTRAL' && (
        <span
          className={`text-xs font-medium ${
            direction === 'BULLISH' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {direction === 'BULLISH' ? '↑ LONG' : '↓ SHORT'}
        </span>
      )}
    </div>
  );
}
