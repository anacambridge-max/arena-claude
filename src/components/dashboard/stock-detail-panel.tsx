/**
 * Stock Detail Panel Component
 * Shows detailed analysis for selected stock
 */

'use client';

import type { PrimeScanResult } from '@/domain/prime';
import { StateBadge } from './state-badge';
import { formatVolumeRating } from '@/engine/prime/volume';
import { X, TrendingUp, TrendingDown, Activity, BarChart3, Target } from 'lucide-react';

interface StockDetailPanelProps {
  stock: PrimeScanResult;
  onClose: () => void;
}

export function StockDetailPanel({ stock, onClose }: StockDetailPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{stock.symbol}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {stock.exchange} • Lot Size: {stock.lotSize}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-800"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <div>
            <div className="text-3xl font-bold text-white">
              ₹{stock.ltp.toFixed(2)}
            </div>
            <div
              className={`text-sm font-medium ${
                stock.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {stock.dayChangePercent >= 0 ? '+' : ''}
              {stock.dayChangePercent.toFixed(2)}%
            </div>
          </div>
          
          <div className="ml-auto">
            <StateBadge state={stock.state} direction={stock.direction} size="lg" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Prime Pipeline */}
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            <Activity className="h-4 w-4" />
            Prime Pipeline
          </h3>
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            {Object.entries(stock.pipeline).map(([stage, status]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-sm uppercase text-slate-400">{stage}</span>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    status === 'PASS'
                      ? 'bg-green-500/20 text-green-400'
                      : status === 'WAIT'
                      ? 'bg-amber-500/20 text-amber-400'
                      : status === 'FAIL'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>
        
        {/* Levels */}
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            <BarChart3 className="h-4 w-4" />
            Price Levels
          </h3>
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <LevelRow
              label="Yesterday High"
              value={stock.levels.yesterdayHigh}
              currentPrice={stock.ltp}
            />
            <LevelRow
              label="Yesterday Low"
              value={stock.levels.yesterdayLow}
              currentPrice={stock.ltp}
            />
            
            {!stock.levels.mid && (
              <div className="mt-4 rounded border border-amber-600/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                MID/R1/R2/R3/S1/S2/S3 — RULE NOT VERIFIED
              </div>
            )}
          </div>
        </section>
        
        {/* Latest Candle */}
        {stock.candle && stock.candleAnalysis && (
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
              <Activity className="h-4 w-4" />
              Latest 5-Minute Candle
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <DataPoint label="Open" value={`₹${stock.candle.open.toFixed(2)}`} />
              <DataPoint label="High" value={`₹${stock.candle.high.toFixed(2)}`} />
              <DataPoint label="Low" value={`₹${stock.candle.low.toFixed(2)}`} />
              <DataPoint label="Close" value={`₹${stock.candle.close.toFixed(2)}`} />
              <DataPoint label="Range" value={`₹${stock.candleAnalysis.range.toFixed(2)}`} />
              <DataPoint label="Body %" value={`${stock.candleAnalysis.bodyPercent.toFixed(1)}%`} />
              <DataPoint label="Close Loc" value={`${stock.candleAnalysis.closeLocation.toFixed(0)}%`} />
              <DataPoint
                label="Type"
                value={
                  stock.candleAnalysis.isBullish
                    ? '↑ BULLISH'
                    : stock.candleAnalysis.isBearish
                    ? '↓ BEARISH'
                    : 'NEUTRAL'
                }
                valueColor={
                  stock.candleAnalysis.isBullish
                    ? 'text-green-400'
                    : stock.candleAnalysis.isBearish
                    ? 'text-red-400'
                    : 'text-slate-400'
                }
              />
            </div>
          </section>
        )}
        
        {/* Volume Analysis */}
        {stock.volumeAnalysis && (
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
              <BarChart3 className="h-4 w-4" />
              Volume Analysis
            </h3>
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Rating</span>
                <span className="text-lg font-medium text-amber-400">
                  {formatVolumeRating(stock.volumeAnalysis.rating)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Ratio</span>
                <span className="text-sm text-slate-200">
                  {stock.volumeAnalysis.ratio.toFixed(2)}x Average
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current</span>
                <span className="font-mono text-sm text-slate-200">
                  {stock.volumeAnalysis.current.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">20-Period Avg</span>
                <span className="font-mono text-sm text-slate-200">
                  {stock.volumeAnalysis.average20.toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        )}
        
        {/* EMA Analysis */}
        {stock.emaAnalysis && (
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
              <TrendingUp className="h-4 w-4" />
              20 EMA
            </h3>
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">EMA Value</span>
                <span className="font-mono text-sm text-slate-200">
                  ₹{stock.emaAnalysis.ema20.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Price vs EMA</span>
                <span
                  className={`text-sm font-medium ${
                    stock.emaAnalysis.priceVsEma === 'ABOVE'
                      ? 'text-green-400'
                      : stock.emaAnalysis.priceVsEma === 'BELOW'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stock.emaAnalysis.priceVsEma}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Direction</span>
                <span
                  className={`text-sm font-medium ${
                    stock.emaAnalysis.direction === 'BULLISH'
                      ? 'text-green-400'
                      : stock.emaAnalysis.direction === 'BEARISH'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stock.emaAnalysis.direction}
                </span>
              </div>
            </div>
          </section>
        )}
        
        {/* Reaction */}
        {stock.reaction && stock.reaction.level !== 'NONE' && (
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
              <Target className="h-4 w-4" />
              Reaction Analysis
            </h3>
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Level</span>
                <span className="text-sm font-medium text-amber-400">{stock.reaction.level}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Reaction</span>
                <span className="text-sm font-medium text-slate-200">{stock.reaction.reaction}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Direction</span>
                <span
                  className={`text-sm font-medium ${
                    stock.reaction.direction === 'BULLISH'
                      ? 'text-green-400'
                      : stock.reaction.direction === 'BEARISH'
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                >
                  {stock.reaction.direction}
                </span>
              </div>
              {stock.reaction.structuralSL && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Structural SL</span>
                  <span className="font-mono text-sm text-slate-200">
                    ₹{stock.reaction.structuralSL.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Risk Calculation */}
        {stock.risk && stock.risk.riskPerShare && (
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
              <Target className="h-4 w-4" />
              Risk Calculator
            </h3>
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              {stock.risk.entry && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Entry</span>
                  <span className="font-mono text-sm text-slate-200">
                    ₹{stock.risk.entry.toFixed(2)}
                  </span>
                </div>
              )}
              {stock.risk.structuralSL && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Structural SL</span>
                  <span className="font-mono text-sm text-slate-200">
                    ₹{stock.risk.structuralSL.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Risk / Share</span>
                <span className="font-mono text-sm text-red-400">
                  ₹{stock.risk.riskPerShare.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 rounded border border-amber-600/30 bg-amber-500/10 p-2 text-xs text-amber-400">
                QTY calculation requires account settings
              </div>
            </div>
          </section>
        )}
        
        {/* Reason */}
        <section>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Scanner Reason
          </h3>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm leading-relaxed text-slate-300">{stock.reason}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function LevelRow({ label, value, currentPrice }: { label: string; value: number; currentPrice: number }) {
  const diff = ((currentPrice - value) / value) * 100;
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-slate-200">₹{value.toFixed(2)}</span>
        <span
          className={`text-xs font-medium ${
            diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'
          }`}
        >
          {diff > 0 ? '+' : ''}
          {diff.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function DataPoint({
  label,
  value,
  valueColor = 'text-slate-200',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-sm ${valueColor}`}>{value}</div>
    </div>
  );
}
