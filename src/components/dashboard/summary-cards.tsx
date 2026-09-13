/**
 * Summary Cards Component
 * Shows key metrics from scanner results
 */

'use client';

import { TrendingUp, TrendingDown, Eye, CheckCircle, AlertTriangle, XCircle, Database } from 'lucide-react';

interface SummaryCardsProps {
  summary: {
    universeCount: number;
    scannedCount: number;
    buyCount: number;
    sellCount: number;
    setupCount: number;
    confirmedCount: number;
    watchCount: number;
    fakeBreakoutCount: number;
    noTradeCount: number;
  };
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'F&O UNIVERSE',
      value: summary.universeCount,
      icon: Database,
      color: 'text-slate-400',
      bgColor: 'bg-slate-800/50',
    },
    {
      label: 'PRIME BUY',
      value: summary.buyCount,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'PRIME SELL',
      value: summary.sellCount,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'SETUPS',
      value: summary.setupCount,
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'CONFIRMED',
      value: summary.confirmedCount,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'WATCH',
      value: summary.watchCount,
      icon: Eye,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'FAKE BREAKOUT',
      value: summary.fakeBreakoutCount,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'NO TRADE',
      value: summary.noTradeCount,
      icon: XCircle,
      color: 'text-slate-500',
      bgColor: 'bg-slate-800/30',
    },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-lg border border-slate-800 ${card.bgColor} p-4`}
          >
            <div className="flex items-center justify-between">
              <Icon className={`h-4 w-4 ${card.color}`} />
              <span className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-400">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
