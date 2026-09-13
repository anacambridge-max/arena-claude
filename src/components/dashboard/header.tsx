'use client';

import { Activity, RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onRefresh: () => void;
  onScan: () => void;
  lastUpdate: string | null;
}

export function DashboardHeader({ isConnected, isLoading, onConnect, onRefresh, onScan, lastUpdate }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-[1800px] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">PRIME TECHNICAL MASTER</h1>
            <p className="mt-1 text-sm text-slate-400">NSE F&O • Prime Technical Scanner • Upstox Market Data</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  UPSTOX CONNECTED
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-slate-500" />
                  UPSTOX NOT CONFIGURED
                </div>
              )}
            </div>
            {!isConnected ? (
              <button onClick={onConnect} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                <Zap className="h-4 w-4" /> VERIFY UPSTOX
              </button>
            ) : (
              <>
                <button onClick={onRefresh} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> REFRESH
                </button>
                <button onClick={onScan} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  <Activity className="h-4 w-4" /> SCAN NOW
                </button>
              </>
            )}
          </div>
        </div>
        {lastUpdate && <div className="mt-3 text-xs text-slate-500">Last update: {lastUpdate}</div>}
      </div>
    </header>
  );
}
