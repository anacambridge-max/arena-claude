'use client';

import { useState, useEffect } from 'react';
import type { PrimeScanResult, MarketStatus } from '@/domain/prime';
import { DashboardHeader } from './dashboard/header';
import { MarketStatusBar } from './dashboard/market-status-bar';
import { SummaryCards } from './dashboard/summary-cards';
import { ScannerTable } from './dashboard/scanner-table';
import { StockDetailPanel } from './dashboard/stock-detail-panel';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ScannerResponse {
  status: string; message?: string;
  data: { summary: { universeCount: number; scannedCount: number; failedCount?: number; buyCount: number; sellCount: number; setupCount: number; confirmedCount: number; watchCount: number; fakeBreakoutCount: number; noTradeCount: number }; marketStatus: MarketStatus; results: PrimeScanResult[]; generatedAt: string };
}

export function DashboardClient() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<ScannerResponse['data'] | null>(null);
  const [selectedStock, setSelectedStock] = useState<PrimeScanResult | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => { checkConnection(); }, []);
  const checkConnection = async () => { try { const res = await fetch('/api/upstox/status', { cache: 'no-store' }); const data = await res.json(); const connected = Boolean(data.data?.connected); setIsConnected(connected); setError(connected ? null : 'UPSTOX_ANALYTICS_TOKEN is not configured on the server.'); } catch { setIsConnected(false); setError('Unable to check Upstox configuration.'); } finally { setIsLoading(false); } };
  const handleConnect = async () => { setIsLoading(true); setError(null); try { const res = await fetch('/api/upstox/connect', { method: 'POST', cache: 'no-store' }); const data = await res.json(); if (data.status === 'success') { setIsConnected(true); await handleScan(); } else setError(data.message || 'Upstox Analytics Token is not configured.'); } catch { setError('Failed to verify Upstox configuration.'); } finally { setIsLoading(false); } };
  const handleScan = async () => { setIsLoading(true); setError(null); try { const res = await fetch('/api/upstox/prime-scan', { cache: 'no-store' }); const data: ScannerResponse = await res.json(); if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Failed to run Prime scan'); setScanData(data.data); setLastUpdate(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to run Prime scan'); } finally { setIsLoading(false); } };
  const defaultMarketStatus: MarketStatus = { isOpen: false, session: 'CLOSED', currentTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }), nextChange: null };

  return <div className="min-h-screen bg-slate-950">
    <DashboardHeader isConnected={isConnected} isLoading={isLoading} onConnect={handleConnect} onRefresh={checkConnection} onScan={handleScan} lastUpdate={lastUpdate} />
    <MarketStatusBar marketStatus={scanData?.marketStatus || defaultMarketStatus} />
    <main className="mx-auto max-w-[1800px] px-4 py-6">
      {error && <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-600/30 bg-red-500/10 p-4 text-red-400"><AlertCircle className="h-5 w-5" /><span>{error}</span></div>}
      {isLoading && !scanData && <div className="flex min-h-[600px] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" /><p className="mt-4 text-slate-400">Loading Prime Scanner...</p></div></div>}
      {!isLoading && !isConnected && !scanData && <div className="flex min-h-[600px] items-center justify-center"><div className="max-w-md text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800"><AlertCircle className="h-8 w-8 text-slate-400" /></div><h2 className="mt-6 text-2xl font-bold text-white">UPSTOX NOT CONFIGURED</h2><p className="mt-2 text-slate-400">Set the Analytics Token as a server-side environment variable, then click verify.</p><button onClick={handleConnect} className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">VERIFY UPSTOX</button></div></div>}
      {scanData && <div className="space-y-6"><SummaryCards summary={scanData.summary} /><div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Prime Scanner Results</h2><div className="text-sm text-slate-400">{scanData.summary.scannedCount} / {scanData.summary.universeCount} F&O stocks scanned{scanData.summary.failedCount ? ` • ${scanData.summary.failedCount} unavailable` : ''}</div></div><ScannerTable results={scanData.results} onSelectStock={setSelectedStock} selectedStock={selectedStock} /></div><div className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-400"><p className="font-semibold">PRIME SIGNAL ENGINE:</p><p className="mt-2">Signals are calculated from the supplied PRIME TECHNICAL v3 Pine logic: completed 5-minute candle, 09:15–10:00 IST window, YH/PDH or YL/PDL breakout, volume ≥1.5x and EMA20 alignment for FAST PRIME; QUALITY PRIME adds candle and range-expansion confirmation.</p></div></div>}
    </main>
    {selectedStock && <StockDetailPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />}
  </div>;
}
