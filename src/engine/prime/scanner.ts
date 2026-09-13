/**
 * Prime Technical Scanner Engine
 * 
 * Main scanner that orchestrates all analysis components:
 * - Levels
 * - Reaction
 * - Candle
 * - Volume
 * - 20 EMA
 * - State determination
 * 
 * Returns PrimeScanResult for dashboard consumption
 */

import {
  Candle,
  PrimeScanResult,
  ScannerState,
  Direction,
  PrimePipeline,
  FakeBreakoutAnalysis,
} from '@/domain/prime';
import { calculatePriceLevels } from './levels';
import { analyzeCandle } from './candle';
import { analyzeVolume } from './volume';
import { analyzeEMA } from './ema';
import { analyzeReaction, detectFakeBreakout } from './reaction';

export interface ScannerInput {
  symbol: string;
  instrumentKey: string;
  exchange: 'NSE_FO' | 'NSE_EQ';
  lotSize: number;
  ltp: number;
  dayChangePercent: number;
  currentCandle: Candle;
  historicalCandles: Candle[]; // includes current candle
  previousDayCandles: Candle[];
}

export function runPrimeScan(input: ScannerInput): PrimeScanResult {
  const {
    symbol,
    instrumentKey,
    exchange,
    lotSize,
    ltp,
    dayChangePercent,
    currentCandle,
    historicalCandles,
    previousDayCandles,
  } = input;
  
  // Calculate levels
  const levels = calculatePriceLevels(previousDayCandles);
  
  // Analyze current candle
  const candleAnalysis = analyzeCandle(currentCandle);
  
  // Analyze volume
  const volumeAnalysis = analyzeVolume(currentCandle, historicalCandles.slice(0, -1));
  
  // Analyze EMA
  const emaAnalysis = analyzeEMA(ltp, historicalCandles);
  
  // Analyze reaction to levels
  const reaction = analyzeReaction(currentCandle, levels, candleAnalysis);
  
  // Detect fake breakout
  const fakeBreakoutDetected = detectFakeBreakout(
    currentCandle,
    historicalCandles.slice(0, -1),
    levels
  );
  
  const fakeBreakout: FakeBreakoutAnalysis = {
    detected: fakeBreakoutDetected,
    originalBreak: fakeBreakoutDetected ? (reaction.level === 'YH' ? 'YH' : 'YL') : null,
    failedToHold: fakeBreakoutDetected,
    reclaimed: fakeBreakoutDetected,
    oppositeSetup: fakeBreakoutDetected,
  };
  
  // Determine state and direction
  const { state, direction, pipeline, reason } = determineState(
    reaction,
    candleAnalysis,
    volumeAnalysis,
    emaAnalysis,
    fakeBreakout
  );
  
  // Risk calculation
  const risk = {
    accountCapital: undefined,
    riskPercent: undefined,
    riskBudget: undefined,
    entry: reaction.reaction === 'REJECTION' || reaction.reaction === 'BREAKOUT' ? ltp : null,
    structuralSL: reaction.structuralSL,
    riskPerShare:
      reaction.structuralSL !== null ? Math.abs(ltp - reaction.structuralSL) : null,
    lotSize,
    calculatedQty: null,
  };
  
  return {
    symbol,
    instrumentKey,
    exchange,
    lotSize,
    ltp,
    dayChangePercent,
    levels,
    candle: currentCandle,
    candleAnalysis,
    volumeAnalysis,
    emaAnalysis,
    reaction,
    fakeBreakout,
    state,
    direction,
    pipeline,
    suggestedEntry: risk.entry,
    structuralSL: risk.structuralSL,
    risk,
    score: null, // Not calculated without verified scoring formula
    reason,
    rank: 0, // Will be set during ranking
    updatedAt: new Date().toISOString(),
  };
}

function determineState(
  reaction: any,
  candleAnalysis: any,
  volumeAnalysis: any,
  emaAnalysis: any,
  fakeBreakout: FakeBreakoutAnalysis
): {
  state: ScannerState;
  direction: Direction;
  pipeline: PrimePipeline;
  reason: string;
} {
  // Fake breakout state
  if (fakeBreakout.detected) {
    return {
      state: 'FAKE_BREAKOUT',
      direction: reaction.direction,
      pipeline: buildPipeline('FAKE_BREAKOUT', reaction, volumeAnalysis),
      reason: `Fake breakout detected at ${reaction.level}; failed to hold; opposite setup developing.`,
    };
  }
  
  // No level interaction
  if (reaction.level === 'NONE') {
    return {
      state: 'NO_TRADE',
      direction: 'NEUTRAL',
      pipeline: buildPipeline('NO_TRADE', reaction, volumeAnalysis),
      reason: 'No YH/YL interaction on current candle.',
    };
  }
  
  // Level touched but no clear reaction
  if (reaction.reaction === 'NONE') {
    return {
      state: 'WATCH',
      direction: 'NEUTRAL',
      pipeline: buildPipeline('WATCH', reaction, volumeAnalysis),
      reason: `${reaction.level} touched; waiting for clear reaction.`,
    };
  }
  
  // Clear rejection detected
  if (reaction.reaction === 'REJECTION') {
    const hasVolume = volumeAnalysis.rating !== 'NORMAL';
    const emaAligned =
      (reaction.direction === 'BULLISH' && emaAnalysis.priceVsEma !== 'BELOW') ||
      (reaction.direction === 'BEARISH' && emaAnalysis.priceVsEma !== 'ABOVE');
    
    if (hasVolume && emaAligned) {
      return {
        state: 'SETUP',
        direction: reaction.direction,
        pipeline: buildPipeline('SETUP', reaction, volumeAnalysis),
        reason: `${reaction.level} ${reaction.direction.toLowerCase()} rejection; volume ${volumeAnalysis.rating}; EMA ${emaAnalysis.direction}; confirmation required.`,
      };
    }
    
    return {
      state: 'WATCH',
      direction: reaction.direction,
      pipeline: buildPipeline('WATCH', reaction, volumeAnalysis),
      reason: `${reaction.level} ${reaction.direction.toLowerCase()} rejection; confirmation criteria pending.`,
    };
  }
  
  // Breakout detected
  if (reaction.reaction === 'BREAKOUT') {
    return {
      state: 'SETUP',
      direction: reaction.direction,
      pipeline: buildPipeline('SETUP', reaction, volumeAnalysis),
      reason: `${reaction.level} ${reaction.direction.toLowerCase()} breakout; confirmation required.`,
    };
  }
  
  // Default
  return {
    state: 'WATCH',
    direction: 'NEUTRAL',
    pipeline: buildPipeline('WATCH', reaction, volumeAnalysis),
    reason: 'Monitoring for setup development.',
  };
}

function buildPipeline(
  state: ScannerState,
  reaction: any,
  volumeAnalysis: any
): PrimePipeline {
  const levelStage = reaction.level !== 'NONE' ? 'PASS' : 'WAIT';
  const reactionStage = reaction.reaction !== 'NONE' ? 'PASS' : 'WAIT';
  const candleStage = reaction.reaction === 'REJECTION' || reaction.reaction === 'BREAKOUT' ? 'PASS' : 'WAIT';
  const volumeStage = volumeAnalysis.rating !== 'NORMAL' ? 'PASS' : 'WAIT';
  const emaStage = 'PASS'; // EMA is informational, not a hard gate
  
  // Confirmation is NEVER automatic - requires verified rule
  const confirmationStage = 'WAIT';
  
  const slStage = reaction.structuralSL !== null ? 'PASS' : 'WAIT';
  const qtyStage = 'WAIT'; // Requires account settings
  
  return {
    level: levelStage,
    reaction: reactionStage,
    candle: candleStage,
    volume: volumeStage,
    ema: emaStage,
    confirmation: confirmationStage,
    sl: slStage,
    qty: qtyStage,
  };
}

export function rankScanResults(results: PrimeScanResult[]): PrimeScanResult[] {
  // State priority
  const statePriority: Record<ScannerState, number> = {
    CONFIRMED: 1,
    SETUP: 2,
    FAKE_BREAKOUT: 3,
    WATCH: 4,
    INVALID: 5,
    NO_TRADE: 6,
  };
  
  const ranked = [...results].sort((a, b) => {
    // First by state priority
    const stateDiff = statePriority[a.state] - statePriority[b.state];
    if (stateDiff !== 0) return stateDiff;
    
    // Then by volume ratio (higher is better for setups)
    const volumeDiff = (b.volumeAnalysis?.ratio || 0) - (a.volumeAnalysis?.ratio || 0);
    if (volumeDiff !== 0) return volumeDiff;
    
    // Then by day change (absolute)
    return Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent);
  });
  
  // Assign ranks
  return ranked.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
}
