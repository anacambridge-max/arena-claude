/**
 * Prime Scanner Table Component
 * Main table displaying scan results
 */

'use client';

import type { PrimeScanResult } from '@/domain/prime';
import { StateBadge } from './state-badge';
import { formatVolumeRating } from '@/engine/prime/volume';
import { ArrowUpDown } from 'lucide-react';

interface ScannerTableProps {
  results: PrimeScanResult[];
  onSelectStock: (result: PrimeScanResult) => void;
  selectedStock: PrimeScanResult | null;
}

export function ScannerTable({ results, onSelectStock, selectedStock }: ScannerTableProps) {
  if (results.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-slate-800 bg-slate-950/50">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-400">NO PRIME SETUPS CURRENTLY</p>
          <p className="mt-2 text-sm text-slate-500">Run a scan to discover opportunities</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 text-xs font-medium uppercase tracking-wider text-slate-400">
            <tr>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-left">Rank</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-left">Stock</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">LTP</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">Day %</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">YH</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">YL</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-center">Location</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-center">Reaction</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-center">Volume</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-center">20 EMA</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-left">State</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">Entry</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-right">SL</th>
              <th className="sticky top-0 bg-slate-900/50 px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {results.map((result) => (
              <tr
                key={result.instrumentKey}
                onClick={() => onSelectStock(result)}
                className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${
                  selectedStock?.instrumentKey === result.instrumentKey
                    ? 'bg-slate-800/30'
                    : ''
                }`}
              >
                <td className="px-4 py-3 text-slate-400">#{result.rank}</td>
                <td className="px-4 py-3 font-medium text-white">{result.symbol}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-200">
                  ₹{result.ltp.toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    result.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {result.dayChangePercent >= 0 ? '+' : ''}
                  {result.dayChangePercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ₹{result.levels.yesterdayHigh.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ₹{result.levels.yesterdayLow.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.reaction && result.reaction.level !== 'NONE' ? (
                    <span className="text-amber-400">{result.reaction.level}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.reaction && result.reaction.reaction !== 'NONE' ? (
                    <span
                      className={`font-medium ${
                        result.reaction.reaction === 'REJECTION'
                          ? 'text-amber-400'
                          : result.reaction.reaction === 'BREAKOUT'
                          ? 'text-blue-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {result.reaction.reaction}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.volumeAnalysis ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-amber-400">
                        {formatVolumeRating(result.volumeAnalysis.rating)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {result.volumeAnalysis.ratio.toFixed(1)}x
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {result.emaAnalysis ? (
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-xs ${
                          result.emaAnalysis.priceVsEma === 'ABOVE'
                            ? 'text-green-400'
                            : result.emaAnalysis.priceVsEma === 'BELOW'
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {result.emaAnalysis.priceVsEma}
                      </span>
                      <span
                        className={`text-xs ${
                          result.emaAnalysis.direction === 'BULLISH'
                            ? 'text-green-400'
                            : result.emaAnalysis.direction === 'BEARISH'
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {result.emaAnalysis.direction}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StateBadge state={result.state} direction={result.direction} size="sm" />
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  {result.suggestedEntry ? `₹${result.suggestedEntry.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  {result.structuralSL ? `₹${result.structuralSL.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <div className="max-w-md truncate" title={result.reason}>
                    {result.reason}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
