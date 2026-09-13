'use client';

import type { PrimeScanResult } from '@/domain/prime';
import { StateBadge } from './state-badge';
import { formatVolumeRating } from '@/engine/prime/volume';

interface ScannerTableProps {
  results: PrimeScanResult[];
  onSelectStock: (result: PrimeScanResult) => void;
  selectedStock: PrimeScanResult | null;
}

export function ScannerTable({ results, onSelectStock, selectedStock }: ScannerTableProps) {
  if (results.length === 0) {
    return <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-slate-800 bg-slate-950/50"><div className="text-center"><p className="text-lg font-medium text-slate-400">NO PRIME SIGNALS CURRENTLY</p><p className="mt-2 text-sm text-slate-500">No 5-minute Pine-equivalent signal was found in the 09:15–10:00 window.</p></div></div>;
  }

  return <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-900/50 text-xs font-medium uppercase tracking-wider text-slate-400"><tr>
    <th className="px-4 py-3 text-left">Rank</th><th className="px-4 py-3 text-left">Stock</th><th className="px-4 py-3 text-center">Signal</th><th className="px-4 py-3 text-right">Signal Time</th><th className="px-4 py-3 text-right">LTP</th><th className="px-4 py-3 text-right">Day %</th><th className="px-4 py-3 text-right">YH</th><th className="px-4 py-3 text-right">YL</th><th className="px-4 py-3 text-center">Volume</th><th className="px-4 py-3 text-center">20 EMA</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Grade</th><th className="px-4 py-3 text-center">State</th><th className="px-4 py-3 text-right">Entry</th><th className="px-4 py-3 text-right">SL</th><th className="px-4 py-3 text-left">Reason</th>
  </tr></thead><tbody className="divide-y divide-slate-800/50 text-sm">{results.map(result => {
    const signal = result.state === 'CONFIRMED' ? (result.direction === 'BULLISH' ? 'PRIME BUY' : 'PRIME SELL') : result.state === 'FAKE_BREAKOUT' ? (result.direction === 'BULLISH' ? 'FAKE BULL' : 'FAKE BEAR') : result.state === 'SETUP' ? (result.direction === 'BULLISH' ? 'BUY SETUP' : 'SELL SETUP') : 'WATCH';
    const signalTime = result.candle ? new Date(result.candle.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '—';
    const grade = result.score == null ? '—' : result.score >= 90 ? 'PRIME A+' : result.score >= 80 ? 'PRIME A' : result.score >= 70 ? 'STRONG' : result.score >= 60 ? 'GOOD' : result.score >= 50 ? 'WATCH' : 'WEAK';
    const signalClass = result.state === 'CONFIRMED' && result.direction === 'BULLISH' ? 'text-green-400 font-bold' : result.state === 'CONFIRMED' && result.direction === 'BEARISH' ? 'text-red-400 font-bold' : result.state === 'FAKE_BREAKOUT' ? 'text-orange-400 font-bold' : 'text-blue-400 font-semibold';
    return <tr key={result.instrumentKey} onClick={() => onSelectStock(result)} className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${selectedStock?.instrumentKey === result.instrumentKey ? 'bg-slate-800/30' : ''}`}>
      <td className="px-4 py-3 text-slate-400">#{result.rank}</td><td className="px-4 py-3 font-medium text-white">{result.symbol}</td><td className={`px-4 py-3 text-center ${signalClass}`}>{signal}</td><td className="px-4 py-3 text-right font-mono text-slate-400">{signalTime}</td><td className="px-4 py-3 text-right font-mono text-slate-200">₹{result.ltp.toFixed(2)}</td><td className={`px-4 py-3 text-right font-mono ${result.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{result.dayChangePercent >= 0 ? '+' : ''}{result.dayChangePercent.toFixed(2)}%</td><td className="px-4 py-3 text-right font-mono text-slate-300">₹{result.levels.yesterdayHigh.toFixed(2)}</td><td className="px-4 py-3 text-right font-mono text-slate-300">₹{result.levels.yesterdayLow.toFixed(2)}</td><td className="px-4 py-3 text-center"><div className="flex flex-col items-center gap-1"><span className="text-amber-400">{formatVolumeRating(result.volumeAnalysis.rating)}</span><span className="text-xs text-slate-500">{result.volumeAnalysis.ratio.toFixed(2)}x</span></div></td><td className="px-4 py-3 text-center"><div className="flex flex-col items-center gap-1"><span className={`text-xs ${result.emaAnalysis.priceVsEma === 'ABOVE' ? 'text-green-400' : 'text-red-400'}`}>{result.emaAnalysis.priceVsEma}</span><span className="text-xs text-slate-500">EMA20 ₹{result.emaAnalysis.ema20.toFixed(2)}</span></div></td><td className="px-4 py-3 text-center font-mono text-white">{result.score == null ? '—' : result.score.toFixed(0) + '/100'}</td><td className="px-4 py-3 text-center font-semibold text-amber-300">{grade}</td><td className="px-4 py-3"><StateBadge state={result.state} direction={result.direction} size="sm" /></td><td className="px-4 py-3 text-right font-mono text-slate-300">{result.suggestedEntry ? `₹${result.suggestedEntry.toFixed(2)}` : '—'}</td><td className="px-4 py-3 text-right font-mono text-slate-300">{result.structuralSL ? `₹${result.structuralSL.toFixed(2)}` : '—'}</td><td className="px-4 py-3 text-slate-400"><div className="max-w-md truncate" title={result.reason}>{result.reason}</div></td>
    </tr>;
  })}</tbody></table></div></div>;
}
