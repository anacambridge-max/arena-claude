'use client';

import { useState, useEffect, useRef } from 'react';
import type { PrimeScanResult, MarketStatus } from '@/domain/prime';
import { DashboardHeader } from './dashboard/header';
import { MarketStatusBar } from './dashboard/market-status-bar';
import { SummaryCards } from './dashboard/summary-cards';
import { ScannerTable } from './dashboard/scanner-table';
import { StockDetailPanel } from './dashboard/stock-detail-panel';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ScannerResponse {
  status: string;
  error?: unknown;
  message?: unknown;
  data?: { summary: { universeCount: number; scannedCount: number; failedCount?: number; buyCount: number; sellCount: number; setupCount: number; confirmedCount: number; watchCount: number; fakeBreakoutCount: number; noTradeCount: number }; marketStatus: MarketStatus; results: PrimeScanResult[]; generatedAt: string; asOfDate?: string };
}

function stringifyError(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Error && value.message) return value.message;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'description']) {
      const nested = stringifyError(obj[key]);
      if (nested) return nested;
    }
    try { return JSON.stringify(value); } catch { return null; }
  }
  return null;
}

async function readApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`Server returned an empty response (HTTP ${res.status}).`);
  try { return JSON.parse(text) as T; }
  catch { throw new Error(`Server returned a non-JSON response (HTTP ${res.status}). ${text.replace(/\s+/g, ' ').slice(0, 180)}`); }
}

function liveMarketStatus(): MarketStatus {
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hour = Number(get('hour')), minute = Number(get('minute')), second = Number(get('second'));
  const weekday = get('weekday');
  const weekend = weekday === 'Sat' || weekday === 'Sun';
  const total = hour * 60 + minute;
  let session: MarketStatus['session'] = 'CLOSED';
  let isOpen = false;
  let nextChange: string | null = 'Tomorrow 09:00';
  if (!weekend) {
    if (total < 540) { session = 'CLOSED'; nextChange = '09:00 (Pre-market)'; }
    else if (total < 555) { session = 'PRE_MARKET'; nextChange = '09:15 (Market Open)'; }
    else if (total < 930) { session = 'OPEN'; isOpen = true; nextChange = '15:30 (Market Close)'; }
    else if (total < 960) { session = 'POST_MARKET'; nextChange = null; }
  } else nextChange = 'Monday 09:00';
  return { isOpen, session, currentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`, nextChange };
}

export function DashboardClient() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<NonNullable<ScannerResponse['data']> | null>(null);
  const [selectedStock, setSelectedStock] = useState<PrimeScanResult | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [currentMarketStatus, setCurrentMarketStatus] = useState<MarketStatus>(liveMarketStatus());
  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkConnection();
    const timer = window.setInterval(() => setCurrentMarketStatus(liveMarketStatus()), 1000);
    return () => {
      window.clearInterval(timer);
      scanAbortRef.current?.abort();
    };
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/upstox/status', { cache: 'no-store' });
      const data = await readApiResponse<{ data?: { connected?: boolean }; message?: unknown }>(res);
      const connected = Boolean(data.data?.connected);
      setIsConnected(connected);
      setError(connected ? null : stringifyError(data.message) || 'UPSTOX_ANALYTICS_TOKEN is not configured on the server.');
    } catch (err) { setIsConnected(false); setError(stringifyError(err) || 'Unable to check Upstox configuration.'); }
    finally { setIsLoading(false); }
  };

  const handleConnect = async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/upstox/connect', { method: 'POST', cache: 'no-store' });
      const data = await readApiResponse<{ status: string; message?: unknown }>(res);
      if (res.ok && data.status === 'success') { setIsConnected(true); await handleScan(); }
      else setError(stringifyError(data.message) || `Upstox verification failed (HTTP ${res.status}).`);
    } catch (err) { setError(stringifyError(err) || 'Failed to verify Upstox configuration.'); }
    finally { setIsLoading(false); }
  };

  const handleScan = async () => {
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;
    // Full F&O scans may take time on a cold Vercel function. The server route
    // permits up to 300s, so do not abort a legitimate scan prematurely.
    const timeout = window.setTimeout(() => controller.abort(), 180000);
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/upstox/prime-scan', { cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal });
      const data = await readApiResponse<ScannerResponse>(res);
      if (!res.ok || data.status !== 'success' || !data.data) throw new Error(stringifyError(data.message) || stringifyError(data.error) || `Failed to run Prime scan (HTTP ${res.status}).`);
      setScanData(data.data);
      setLastUpdate(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    } catch (err) {
      if ((err instanceof DOMException && err.name === 'AbortError') || (err instanceof Error && err.name === 'AbortError')) {
        if (scanAbortRef.current === controller) setError('Scan was restarted or timed out.');
      } else setError(stringifyError(err) || 'Failed to run Prime scan');
    } finally {
      window.clearTimeout(timeout);
      if (scanAbortRef.current === controller) {
        scanAbortRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const defaultMarketStatus: MarketStatus = { isOpen: false, session: 'CLOSED', currentTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }), nextChange: null };

  return <div className="min-h-screen bg-slate-950">
    <DashboardHeader isConnected={isConnected} isLoading={isLoading} onConnect={handleConnect} onRefresh={checkConnection} onScan={handleScan} lastUpdate={lastUpdate} />
    <MarketStatusBar marketStatus={currentMarketStatus || scanData?.marketStatus || defaultMarketStatus} />
    <main className="mx-auto max-w-[1800px] px-4 py-6">
      {error && <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-600/30 bg-red-500/10 p-4 text-red-400"><AlertCircle className="h-5 w-5" /><span className="break-words">{error}</span></div>}
      {isLoading && !scanData && <div className="flex min-h-[600px] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" /><p className="mt-4 text-slate-400">Loading Prime Scanner...</p></div></div>}
      {!isLoading && !isConnected && !scanData && <div className="flex min-h-[600px] items-center justify-center"><div className="max-w-md text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800"><AlertCircle className="h-8 w-8 text-slate-400" /></div><h2 className="mt-6 text-2xl font-bold text-white">UPSTOX NOT CONFIGURED</h2><p className="mt-2 text-slate-400">Set the Analytics Token as a server-side environment variable, then click verify.</p><button onClick={handleConnect} className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">VERIFY UPSTOX</button></div></div>}
      {scanData && <div className="space-y-6"><SummaryCards summary={scanData.summary} /><div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Prime Scanner Results</h2><div className="text-sm text-slate-400">{scanData.summary.scannedCount} / {scanData.summary.universeCount} F&O stocks scanned{scanData.summary.failedCount ? ` • ${scanData.summary.failedCount} unavailable` : ''}{scanData.asOfDate ? ` • Signal date ${new Date(`${scanData.asOfDate}T00:00:00+05:30`).toLocaleDateString('en-IN')}` : ''}</div></div><ScannerTable results={scanData.results} onSelectStock={setSelectedStock} selectedStock={selectedStock} /></div><div className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-400"><p className="font-semibold">PRIME SIGNAL ENGINE:</p><p className="mt-2">Signals use the supplied PRIME TECHNICAL v3 FAST PRIME logic on the NSE cash 5-minute chart, with F&O stocks defining the scan universe. YH/PDH or YL/PDL close-break + volume ≥1.5x + EMA20 alignment are required for confirmation.</p></div></div>}
    </main>
    {selectedStock && <StockDetailPanel stock={selectedStock} onClose={() => setSelectedStock(null)} />}
  </div>;
}
