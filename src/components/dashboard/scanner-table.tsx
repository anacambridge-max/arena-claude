'use client';

import { useMemo, useState } from 'react';
import type { PrimeScanResult } from '@/domain/prime';
import { StateBadge } from './state-badge';
import { formatVolumeRating } from '@/engine/prime/volume';

interface ScannerTableProps {
  results: PrimeScanResult[];
  onSelectStock: (result: PrimeScanResult) => void;
  selectedStock: PrimeScanResult | null;
}

type SignalFilter = 'ALL' | 'BUY_SETUP' | 'SELL_SETUP' | 'BUY_CONFIRMED' | 'SELL_CONFIRMED' | 'FAKE_BULL' | 'FAKE_BEAR' | 'WATCH';
type SortKey = 'rank' | 'symbol' | 'signal' | 'signalTime' | 'ltp' | 'dayChangePercent' | 'yesterdayHigh' | 'yesterdayLow' | 'volume' | 'ema20' | 'score' | 'entry' | 'sl';
type SortDir = 'asc' | 'desc';

function signalFor(result: PrimeScanResult): SignalFilter {
  if (result.state === 'CONFIRMED') return result.direction === 'BULLISH' ? 'BUY_CONFIRMED' : 'SELL_CONFIRMED';
  if (result.state === 'SETUP') return result.direction === 'BULLISH' ? 'BUY_SETUP' : 'SELL_SETUP';
  if (result.state === 'FAKE_BREAKOUT') return result.direction === 'BULLISH' ? 'FAKE_BULL' : 'FAKE_BEAR';
  return 'WATCH';
}

function signalLabel(filter: SignalFilter): string {
  return ({ ALL: 'ALL SIGNALS', BUY_SETUP: 'BUY SETUP', SELL_SETUP: 'SELL SETUP', BUY_CONFIRMED: 'BUY CONFIRMED', SELL_CONFIRMED: 'SELL CONFIRMED', FAKE_BULL: 'FAKE BULL', FAKE_BEAR: 'FAKE BEAR', WATCH: 'WATCH' })[filter];
}

export function ScannerTable({ results, onSelectStock, selectedStock }: ScannerTableProps) {
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [minVolume, setMinVolume] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const counts = useMemo(() => {
    const c: Record<SignalFilter, number> = { ALL: results.length, BUY_SETUP: 0, SELL_SETUP: 0, BUY_CONFIRMED: 0, SELL_CONFIRMED: 0, FAKE_BULL: 0, FAKE_BEAR: 0, WATCH: 0 };
    for (const r of results) c[signalFor(r)]++;
    return c;
  }, [results]);

  const filteredResults = useMemo(() => {
    const filtered = results.filter(r => {
      const volumeRatio = r.volumeAnalysis?.ratio ?? 0;
      return (signalFilter === 'ALL' || signalFor(r) === signalFilter) && volumeRatio >= minVolume;
    });
    const value = (r: PrimeScanResult): string | number => {
      switch (sortKey) {
        case 'symbol': return r.symbol;
        case 'signal': return signalLabel(signalFor(r));
        case 'signalTime': return r.candle?.timestamp ?? '';
        case 'ltp': return r.ltp;
        case 'dayChangePercent': return r.dayChangePercent;
        case 'yesterdayHigh': return r.levels.yesterdayHigh;
        case 'yesterdayLow': return r.levels.yesterdayLow;
        case 'volume': return r.volumeAnalysis?.ratio ?? 0;
        case 'ema20': return r.emaAnalysis?.ema20 ?? 0;
        case 'score': return r.score ?? -1;
        case 'entry': return r.suggestedEntry ?? -1;
        case 'sl': return r.structuralSL ?? -1;
        default: return r.rank;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a); const bv = value(b);
      const cmp = typeof av === 'string' || typeof bv === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [results, signalFilter, minVolume, sortKey, sortDir]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'symbol' || key === 'signal' || key === 'signalTime' ? 'asc' : 'desc'); }
  };
  const sortMark = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const filterButton = (key: SignalFilter, cls: string) => (
    <button onClick={() => setSignalFilter(key)} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${signalFilter === key ? `${cls} border-current` : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
      {signalLabel(key)} <span className="ml-1 opacity-70">{counts[key]}</span>
    </button>
  );

  if (results.length === 0) {
    return <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-slate-800 bg-slate-950/50"><div className="text-center"><p className="text-lg font-medium text-slate-400">NO PRIME SIGNALS CURRENTLY</p><p className="mt-2 text-sm text-slate-500">No 5-minute Pine-equivalent signal was found in the 09:15–10:00 window.</p></div></div>;
  }

  return <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
    <div className="border-b border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">SIGNAL FILTER</span>
        {filterButton('ALL', 'bg-slate-700 text-white')}
        {filterButton('BUY_SETUP', 'bg-blue-500/15 text-blue-300')}
        {filterButton('SELL_SETUP', 'bg-blue-500/15 text-blue-300')}
        {filterButton('BUY_CONFIRMED', 'bg-emerald-500/15 text-emerald-300')}
        {filterButton('SELL_CONFIRMED', 'bg-red-500/15 text-red-300')}
        {filterButton('FAKE_BULL', 'bg-orange-500/15 text-orange-300')}
        {filterButton('FAKE_BEAR', 'bg-orange-500/15 text-orange-300')}
        {filterButton('WATCH', 'bg-amber-500/15 text-amber-300')}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">MIN VOLUME</span>
        {[0, 1, 1.5, 2, 3, 5].map(v => <button key={v} onClick={() => setMinVolume(v)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${minVolume === v ? 'border-amber-400 bg-amber-500/15 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>{v === 0 ? 'ALL' : `≥ ${v}x`}</button>)}
        <span className="ml-auto text-xs text-slate-500">Showing {filteredResults.length} / {results.length}</span>
      </div>
    </div>
    {filteredResults.length === 0 ? <div className="flex min-h-[220px] items-center justify-center text-slate-500">No stocks match the selected filters.</div> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-900/50 text-xs font-medium uppercase tracking-wider text-slate-400"><tr>
      <th className="cursor-pointer px-4 py-3 text-left hover:text-white" onClick={() => setSort('rank')}>Rank{sortMark('rank')}</th><th className="cursor-pointer px-4 py-3 text-left hover:text-white" onClick={() => setSort('symbol')}>Stock{sortMark('symbol')}</th><th className="cursor-pointer px-4 py-3 text-center hover:text-white" onClick={() => setSort('signal')}>Signal{sortMark('signal')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('signalTime')}>Signal Time{sortMark('signalTime')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('ltp')}>LTP{sortMark('ltp')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('dayChangePercent')}>Day %{sortMark('dayChangePercent')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('yesterdayHigh')}>YH{sortMark('yesterdayHigh')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('yesterdayLow')}>YL{sortMark('yesterdayLow')}</th><th className="cursor-pointer px-4 py-3 text-center hover:text-white" onClick={() => setSort('volume')}>Volume{sortMark('volume')}</th><th className="cursor-pointer px-4 py-3 text-center hover:text-white" onClick={() => setSort('ema20')}>20 EMA{sortMark('ema20')}</th><th className="cursor-pointer px-4 py-3 text-center hover:text-white" onClick={() => setSort('score')}>Score{sortMark('score')}</th><th className="px-4 py-3 text-center">Grade</th><th className="px-4 py-3 text-center">State</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('entry')}>Entry{sortMark('entry')}</th><th className="cursor-pointer px-4 py-3 text-right hover:text-white" onClick={() => setSort('sl')}>SL{sortMark('sl')}</th><th className="px-4 py-3 text-left">Reason</th>
    </tr></thead><tbody className="divide-y divide-slate-800/50 text-sm">{filteredResults.map(result => {
      const signal = signalLabel(signalFor(result));
      const signalTime = result.candle ? new Date(result.candle.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '—';
      const grade = result.score == null ? '—' : result.score >= 90 ? 'PRIME A+' : result.score >= 80 ? 'PRIME A' : result.score >= 70 ? 'STRONG' : result.score >= 60 ? 'GOOD' : result.score >= 50 ? 'WATCH' : 'WEAK';
      const sf = signalFor(result);
      const signalClass = sf === 'BUY_CONFIRMED' ? 'text-green-400 font-bold' : sf === 'SELL_CONFIRMED' ? 'text-red-400 font-bold' : sf === 'FAKE_BULL' || sf === 'FAKE_BEAR' ? 'text-orange-400 font-bold' : 'text-blue-400 font-semibold';
      const volume = result.volumeAnalysis;
      const ema = result.emaAnalysis;
      return <tr key={result.instrumentKey} onClick={() => onSelectStock(result)} className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${selectedStock?.instrumentKey === result.instrumentKey ? 'bg-slate-800/30' : ''}`}>
        <td className="px-4 py-3 text-slate-400">#{result.rank}</td><td className="px-4 py-3 font-medium text-white">{result.symbol}</td><td className={`px-4 py-3 text-center ${signalClass}`}>{signal}</td><td className="px-4 py-3 text-right font-mono text-slate-400">{signalTime}</td><td className="px-4 py-3 text-right font-mono text-slate-200">₹{result.ltp.toFixed(2)}</td><td className={`px-4 py-3 text-right font-mono ${result.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{result.dayChangePercent >= 0 ? '+' : ''}{result.dayChangePercent.toFixed(2)}%</td><td className="px-4 py-3 text-right font-mono text-slate-300">₹{result.levels.yesterdayHigh.toFixed(2)}</td><td className="px-4 py-3 text-right font-mono text-slate-300">₹{result.levels.yesterdayLow.toFixed(2)}</td><td className="px-4 py-3 text-center">{volume ? <div className="flex flex-col items-center gap-1"><span className="text-amber-400">{formatVolumeRating(volume.rating)}</span><span className="text-xs text-slate-500">{volume.ratio.toFixed(2)}x</span></div> : <span className="text-slate-600">—</span>}</td><td className="px-4 py-3 text-center">{ema ? <div className="flex flex-col items-center gap-1"><span className={`text-xs ${ema.priceVsEma === 'ABOVE' ? 'text-green-400' : ema.priceVsEma === 'BELOW' ? 'text-red-400' : 'text-slate-400'}`}>{ema.priceVsEma}</span><span className="text-xs text-slate-500">EMA20 ₹{ema.ema20.toFixed(2)}</span></div> : <span className="text-slate-600">—</span>}</td><td className="px-4 py-3 text-center font-mono text-white">{result.score == null ? '—' : result.score.toFixed(0) + '/100'}</td><td className="px-4 py-3 text-center font-semibold text-amber-300">{grade}</td><td className="px-4 py-3"><StateBadge state={result.state} direction={result.direction} size="sm" /></td><td className="px-4 py-3 text-right font-mono text-slate-300">{result.suggestedEntry ? `₹${result.suggestedEntry.toFixed(2)}` : '—'}</td><td className="px-4 py-3 text-right font-mono text-slate-300">{result.structuralSL ? `₹${result.structuralSL.toFixed(2)}` : '—'}</td><td className="px-4 py-3 text-slate-400"><div className="max-w-md truncate" title={result.reason}>{result.reason}</div></td>
      </tr>;
    })}</tbody></table></div>}
  </div>;
}
