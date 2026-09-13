/**
 * Prime Reaction Engine
 * 
 * Core principle: "Do not trade the line. Trade the reaction to the line."
 * 
 * Analyzes price reaction to key levels:
 * - Touch detection
 * - Rejection vs Acceptance vs Breakout
 * - Direction determination
 * - Structural stop loss
 */

import { Candle, CandleAnalysis, ReactionAnalysis, Direction, PriceLevels } from '@/domain/prime';
import { analyzeCandle, isBullishRejectionCandle, isBearishRejectionCandle } from './candle';

const TOUCH_THRESHOLD = 0.002; // 0.2% threshold for level touch

export function checkLevelTouch(
  candle: Candle,
  level: number,
  threshold: number = TOUCH_THRESHOLD
): boolean {
  const margin = level * threshold;
  return candle.high >= level - margin && candle.low <= level + margin;
}

export function analyzeReaction(
  candle: Candle,
  levels: PriceLevels,
  candleAnalysis: CandleAnalysis
): ReactionAnalysis {
  const { yesterdayHigh, yesterdayLow } = levels;
  
  // Check YH touch
  if (checkLevelTouch(candle, yesterdayHigh)) {
    const isBearishReject = isBearishRejectionCandle(candleAnalysis);
    const closedBelow = candle.close < yesterdayHigh;
    
    if (isBearishReject && closedBelow) {
      return {
        level: 'YH',
        levelPrice: yesterdayHigh,
        touched: true,
        reaction: 'REJECTION',
        direction: 'BEARISH',
        structuralSL: candle.high, // SL above the rejection wick
      };
    }
    
    if (candle.close > yesterdayHigh && candleAnalysis.isBullish) {
      return {
        level: 'YH',
        levelPrice: yesterdayHigh,
        touched: true,
        reaction: 'BREAKOUT',
        direction: 'BULLISH',
        structuralSL: yesterdayHigh, // SL below breakout level
      };
    }
    
    // Touched but no clear reaction yet
    return {
      level: 'YH',
      levelPrice: yesterdayHigh,
      touched: true,
      reaction: 'NONE',
      direction: 'NEUTRAL',
      structuralSL: null,
    };
  }
  
  // Check YL touch
  if (checkLevelTouch(candle, yesterdayLow)) {
    const isBullishReject = isBullishRejectionCandle(candleAnalysis);
    const closedAbove = candle.close > yesterdayLow;
    
    if (isBullishReject && closedAbove) {
      return {
        level: 'YL',
        levelPrice: yesterdayLow,
        touched: true,
        reaction: 'REJECTION',
        direction: 'BULLISH',
        structuralSL: candle.low, // SL below the rejection wick
      };
    }
    
    if (candle.close < yesterdayLow && candleAnalysis.isBearish) {
      return {
        level: 'YL',
        levelPrice: yesterdayLow,
        touched: true,
        reaction: 'BREAKOUT',
        direction: 'BEARISH',
        structuralSL: yesterdayLow, // SL above breakout level
      };
    }
    
    // Touched but no clear reaction yet
    return {
      level: 'YL',
      levelPrice: yesterdayLow,
      touched: true,
      reaction: 'NONE',
      direction: 'NEUTRAL',
      structuralSL: null,
    };
  }
  
  // No level interaction
  return {
    level: 'NONE',
    levelPrice: null,
    touched: false,
    reaction: 'NONE',
    direction: 'NEUTRAL',
    structuralSL: null,
  };
}

export function detectFakeBreakout(
  currentCandle: Candle,
  previousCandles: Candle[],
  levels: PriceLevels
): boolean {
  if (previousCandles.length < 2) return false;
  
  const { yesterdayHigh, yesterdayLow } = levels;
  const prev = previousCandles[previousCandles.length - 1];
  
  // Fake YH breakout: broke above YH, then closed back below
  const fakeYHBreak = 
    prev.high > yesterdayHigh && 
    prev.close < yesterdayHigh &&
    currentCandle.close < yesterdayHigh;
  
  // Fake YL breakdown: broke below YL, then closed back above
  const fakeYLBreak = 
    prev.low < yesterdayLow && 
    prev.close > yesterdayLow &&
    currentCandle.close > yesterdayLow;
  
  return fakeYHBreak || fakeYLBreak;
}
