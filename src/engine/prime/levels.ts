/**
 * Prime Levels Engine
 * 
 * Calculates key price levels:
 * - Yesterday High (YH)
 * - Yesterday Low (YL)
 * 
 * NOTE: MID, R1/R2/R3, S1/S2/S3 formulas are NOT VERIFIED
 * from the Prime Technical source material.
 * 
 * Do not calculate these levels without verified rules.
 */

import { Candle, PriceLevels } from '@/domain/prime';

export function calculateYesterdayLevels(previousDayCandles: Candle[]): {
  yesterdayHigh: number;
  yesterdayLow: number;
} {
  if (previousDayCandles.length === 0) {
    return {
      yesterdayHigh: 0,
      yesterdayLow: 0,
    };
  }
  
  const high = Math.max(...previousDayCandles.map(c => c.high));
  const low = Math.min(...previousDayCandles.map(c => c.low));
  
  return {
    yesterdayHigh: high,
    yesterdayLow: low,
  };
}

export function calculatePriceLevels(previousDayCandles: Candle[]): PriceLevels {
  const { yesterdayHigh, yesterdayLow } = calculateYesterdayLevels(previousDayCandles);
  
  // MID/R/S formulas are NOT verified from Prime Technical manual
  // Leaving them undefined rather than inventing formulas
  return {
    yesterdayHigh,
    yesterdayLow,
    // mid: undefined,
    // r1: undefined,
    // r2: undefined,
    // r3: undefined,
    // s1: undefined,
    // s2: undefined,
    // s3: undefined,
  };
}

export function getPriceLocation(
  price: number,
  yh: number,
  yl: number
): 'ABOVE_YH' | 'AT_YH' | 'BETWEEN' | 'AT_YL' | 'BELOW_YL' {
  const threshold = 0.001; // 0.1% threshold for "AT"
  
  if (price > yh * (1 + threshold)) return 'ABOVE_YH';
  if (price > yh * (1 - threshold)) return 'AT_YH';
  if (price < yl * (1 + threshold) && price > yl * (1 - threshold)) return 'AT_YL';
  if (price < yl * (1 - threshold)) return 'BELOW_YL';
  return 'BETWEEN';
}

export function getDistanceToLevel(price: number, level: number): {
  absolute: number;
  percent: number;
} {
  const absolute = price - level;
  const percent = level > 0 ? (absolute / level) * 100 : 0;
  
  return { absolute, percent };
}
