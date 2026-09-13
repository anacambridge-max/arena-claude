/**
 * Prime Volume Analysis Engine
 * 
 * Based on Prime Technical AFL:
 * - 20-period average volume
 * - 2x average = STAR_1
 * - 4x average = STAR_2
 * - 6.5x average = STAR_3
 * 
 * Note: Opening 09:15–09:20 candle has different volume characteristics
 */

import { Candle, VolumeAnalysis, VolumeRating } from '@/domain/prime';

export function calculateAverageVolume(candles: Candle[], periods: number = 20): number {
  if (candles.length === 0) return 0;
  
  const relevantCandles = candles.slice(-periods);
  const sum = relevantCandles.reduce((acc, c) => acc + c.volume, 0);
  return sum / relevantCandles.length;
}

export function getVolumeRating(currentVolume: number, averageVolume: number): VolumeRating {
  if (averageVolume === 0) return 'NORMAL';
  
  const ratio = currentVolume / averageVolume;
  
  if (ratio >= 6.5) return 'STAR_3';
  if (ratio >= 4.0) return 'STAR_2';
  if (ratio >= 2.0) return 'STAR_1';
  return 'NORMAL';
}

export function analyzeVolume(
  currentCandle: Candle,
  historicalCandles: Candle[]
): VolumeAnalysis {
  const average20 = calculateAverageVolume(historicalCandles, 20);
  const ratio = average20 > 0 ? currentCandle.volume / average20 : 1;
  const rating = getVolumeRating(currentCandle.volume, average20);
  
  // Participation: significant volume with clear direction
  const isParticipation = rating !== 'NORMAL';
  
  return {
    current: currentCandle.volume,
    average20,
    ratio,
    rating,
    isParticipation,
  };
}

export function formatVolumeRating(rating: VolumeRating): string {
  switch (rating) {
    case 'STAR_3': return '★★★';
    case 'STAR_2': return '★★';
    case 'STAR_1': return '★';
    case 'NORMAL': return 'NORMAL';
  }
}
