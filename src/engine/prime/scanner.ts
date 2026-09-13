/**
 * PRIME TECHNICAL MASTER signal engine.
 * Port of the supplied Pine v6 logic. Default mode is FAST PRIME.
 * Designed for completed 5-minute candles during 09:15-10:00 IST.
 */
import type { Candle, PrimeScanResult, ScannerState, Direction, PrimePipeline, FakeBreakoutAnalysis } from '@/domain/prime';

export interface ScannerInput {
  symbol: string;
  instrumentKey: string;
  exchange: 'NSE_FO' | 'NSE_EQ';
  lotSize: number;
  ltp: number;
  dayChangePercent: number;
  currentCandle: Candle;
  historicalCandles: Candle[];
  previousDayCandles: Candle[];
}

const ACCOUNT_SIZE = 500000;
const RISK_PERCENT = 0.5;
const MIN_VOLUME_MULTIPLE = 1.5;
const MIN_BODY_RATIO = 0.50;
const MIN_CLOSE_LOCATION = 0.60;
const RANGE_EXPANSION_RATIO = 1.30;
const FAKE_LOOKBACK = 3;
const PENETRATION_FULL_PCT = 1.0;
const EMA_FULL_SEPARATION_PCT = 1.0;

function istParts(timestamp: string) {
  const d = new Date(timestamp);
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return { hour, minute };
}

function inScanWindow(timestamp: string) {
  const { hour, minute } = istParts(timestamp);
  const m = hour * 60 + minute;
  return m >= 9 * 60 + 15 && m < 10 * 60;
}

function ema(values: number[], length: number) {
  if (!values.length) return 0;
  const k = 2 / (length + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function scorePrime(bull: boolean, candle: Candle, historyBefore: Candle[], yh: number, yl: number) {
  const range = Math.max(0, candle.high - candle.low);
  const bodyRatio = range > 0 ? Math.abs(candle.close - candle.open) / range : 0;
  const closeLocation = range > 0
    ? (bull ? (candle.close - candle.low) / range : (candle.high - candle.close) / range)
    : 0.5;
  const volumeAvg = average(historyBefore.slice(-20).map(c => c.volume));
  const volumeMultiple = volumeAvg > 0 ? candle.volume / volumeAvg : 0;
  const closes = [...historyBefore.map(c => c.close), candle.close];
  const e = ema(closes, 20);
  const emaDistancePct = e ? Math.abs(candle.close - e) / e * 100 : 0;
  const ranges = [...historyBefore.map(c => c.high - c.low), range];
  const averageRange = average(ranges.slice(-10));
  const rangeExpansion = averageRange > 0 ? range / averageRange : 1;
  const penetration = bull
    ? (yh ? (candle.close - yh) / yh * 100 : 0)
    : (yl ? (yl - candle.close) / yl * 100 : 0);
  const volumeScore = volumeMultiple >= 6.5 ? 20 : volumeMultiple >= 4 ? 18 : volumeMultiple >= 2 ? 15 : volumeMultiple >= 1.5 ? 10 : volumeMultiple >= 1.2 ? 5 : 0;
  const penetrationScore = Math.min(15, Math.max(0, penetration / PENETRATION_FULL_PCT * 15));
  const bodyScore = Math.min(15, Math.max(0, bodyRatio * 15));
  const closeScore = closeLocation * 10;
  const emaScore = Math.min(15, Math.max(0, emaDistancePct / EMA_FULL_SEPARATION_PCT * 15));
  const rangeScore = rangeExpansion >= 2 ? 10 : rangeExpansion >= 1.75 ? 9 : rangeExpansion >= 1.5 ? 8 : rangeExpansion >= 1.3 ? 6 : rangeExpansion >= 1.1 ? 3 : 0;
  const { hour, minute } = istParts(candle.timestamp);
  const minutesFromOpen = (hour * 60 + minute) - (9 * 60 + 15);
  const timingScore = minutesFromOpen <= 5 ? 10 : minutesFromOpen <= 10 ? 9 : minutesFromOpen <= 15 ? 8 : minutesFromOpen <= 20 ? 6 : minutesFromOpen <= 30 ? 4 : minutesFromOpen <= 45 ? 2 : 0;
  const previousCompressionAverage = average(historyBefore.slice(-3).map(c => c.high - c.low));
  const previousWasCompressed = historyBefore.length > 0 && (historyBefore[historyBefore.length - 1].high - historyBefore[historyBefore.length - 1].low) < previousCompressionAverage * 0.8;
  const compressionExpansion = rangeExpansion >= RANGE_EXPANSION_RATIO && previousWasCompressed;
  const compressionScore = compressionExpansion ? 5 : rangeExpansion >= RANGE_EXPANSION_RATIO ? 2 : 0;
  return Math.min(100, Math.max(0, volumeScore + penetrationScore + bodyScore + closeScore + emaScore + rangeScore + timingScore + compressionScore));
}

function grade(score: number) {
  if (score >= 90) return 'PRIME A+';
  if (score >= 80) return 'PRIME A';
  if (score >= 70) return 'STRONG';
  if (score >= 60) return 'GOOD';
  if (score >= 50) return 'WATCH';
  return 'WEAK';
}

function analyzeCandle(c: Candle) {
  const range = c.high - c.low;
  const body = Math.abs(c.close - c.open);
  const bodyRatio = range > 0 ? body / range : 0;
  const bullClose = range > 0 ? (c.close - c.low) / range : 0.5;
  const bearClose = range > 0 ? (c.high - c.close) / range : 0.5;
  return {
    range, body, upperWick: c.high - Math.max(c.open, c.close), lowerWick: Math.min(c.open, c.close) - c.low,
    bodyPercent: bodyRatio * 100, closeLocation: (c.close - c.low) / (range || 1) * 100,
    isBullish: c.close > c.open, isBearish: c.close < c.open, isDoji: body === 0,
    bodyRatio, bullClose, bearClose,
  };
}

export function runPrimeScan(input: ScannerInput): PrimeScanResult {
  const history = input.historicalCandles.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const prev = input.previousDayCandles;
  const yh = prev.length ? Math.max(...prev.map(c => c.high)) : 0;
  const yl = prev.length ? Math.min(...prev.map(c => c.low)) : 0;
  const c = input.currentCandle;
  const before = history.filter(x => x.timestamp < c.timestamp);
  const a = analyzeCandle(c);
  const volAvg = average(before.slice(-20).map(x => x.volume));
  const volMultiple = volAvg > 0 ? c.volume / volAvg : 0;
  const closes = [...before.map(x => x.close), c.close];
  const e = ema(closes, 20);
  const above = c.close > e;
  const below = c.close < e;
  const rawBull = c.close > yh && (before.length ? before[before.length - 1].close <= yh : true) && inScanWindow(c.timestamp);
  const rawBear = c.close < yl && (before.length ? before[before.length - 1].close >= yl : true) && inScanWindow(c.timestamp);
  const bullReaction = c.close > c.open && a.bodyRatio >= MIN_BODY_RATIO && a.bullClose >= MIN_CLOSE_LOCATION;
  const bearReaction = c.close < c.open && a.bodyRatio >= MIN_BODY_RATIO && a.bearClose >= MIN_CLOSE_LOCATION;
  const avgRange = average(before.slice(-10).map(x => x.high - x.low));
  const rangeExpansion = avgRange > 0 ? a.range / avgRange : 1;
  const rangeExpanded = rangeExpansion >= RANGE_EXPANSION_RATIO;
  const bullFast = rawBull && volMultiple >= MIN_VOLUME_MULTIPLE && above;
  const bearFast = rawBear && volMultiple >= MIN_VOLUME_MULTIPLE && below;
  const bullQuality = bullFast && bullReaction && rangeExpanded;
  const bearQuality = bearFast && bearReaction && rangeExpanded;
  const recentHighBreak = [...before.slice(-(FAKE_LOOKBACK + 1)), c].some(x => x.high > yh);
  const recentLowBreak = [...before.slice(-(FAKE_LOOKBACK + 1)), c].some(x => x.low < yl);
  const fakeBull = inScanWindow(c.timestamp) && recentHighBreak && c.high > yh && c.close < yh;
  const fakeBear = inScanWindow(c.timestamp) && recentLowBreak && c.low < yl && c.close > yl;
  const bullSetup = inScanWindow(c.timestamp) && yh > 0 && Math.abs(c.close - yh) / yh * 100 <= 1 && c.close >= yh;
  const bearSetup = inScanWindow(c.timestamp) && yl > 0 && Math.abs(c.close - yl) / yl * 100 <= 1 && c.close <= yl;
  const confirmed = bullFast || bearFast;
  const state: ScannerState = fakeBull || fakeBear ? 'FAKE_BREAKOUT' : confirmed ? 'CONFIRMED' : bullSetup || bearSetup ? 'SETUP' : (yh > 0 && (Math.abs(c.close-yh)/yh*100 <= 1 || Math.abs(c.close-yl)/yl*100 <= 1) && inScanWindow(c.timestamp)) ? 'WATCH' : 'NO_TRADE';
  const direction: Direction = bullFast ? 'BULLISH' : bearFast ? 'BEARISH' : fakeBull ? 'BULLISH' : fakeBear ? 'BEARISH' : bullSetup ? 'BULLISH' : bearSetup ? 'BEARISH' : 'NEUTRAL';
  const bull = bullFast || bullSetup;
  const bear = bearFast || bearSetup;
  const score = bullFast ? scorePrime(true, c, before, yh, yl) : bearFast ? scorePrime(false, c, before, yh, yl) : null;
  const structuralSL = bullFast ? c.low : bearFast ? c.high : null;
  const riskPerShare = structuralSL !== null ? Math.abs(c.close - structuralSL) : null;
  const riskBudget = ACCOUNT_SIZE * RISK_PERCENT / 100;
  const qty = riskPerShare && riskPerShare > 0 ? Math.floor(riskBudget / riskPerShare) : null;
  const trigger = bull ? yh : bear ? yl : 0;
  const fake: FakeBreakoutAnalysis = { detected: fakeBull || fakeBear, originalBreak: fakeBull ? 'YH' : fakeBear ? 'YL' : null, failedToHold: fakeBull || fakeBear, reclaimed: fakeBull || fakeBear, oppositeSetup: fakeBull || fakeBear };
  const pipeline: PrimePipeline = { level: trigger ? 'PASS' : 'WAIT', reaction: bullReaction || bearReaction ? 'PASS' : 'WAIT', candle: bullReaction || bearReaction ? 'PASS' : 'WAIT', volume: volMultiple >= MIN_VOLUME_MULTIPLE ? 'PASS' : 'WAIT', ema: (bull && above) || (bear && below) ? 'PASS' : 'WAIT', confirmation: confirmed ? 'PASS' : 'WAIT', sl: structuralSL !== null ? 'PASS' : 'WAIT', qty: qty !== null ? 'PASS' : 'WAIT' };
  const reason = bullFast ? `PRIME BUY — 5M YH/PDH breakout | Volume ${volMultiple.toFixed(2)}x | EMA20 ABOVE | Score ${score?.toFixed(0)}/100 | ${score !== null ? grade(score) : ''}` : bearFast ? `PRIME SELL — 5M YL/PDL breakdown | Volume ${volMultiple.toFixed(2)}x | EMA20 BELOW | Score ${score?.toFixed(0)}/100 | ${score !== null ? grade(score) : ''}` : fakeBull ? 'PRIME FAKE BREAKOUT — YH failure' : fakeBear ? 'PRIME FAKE BREAKDOWN — YL reclaim' : bullSetup ? 'BULLISH SETUP — YH/PDH' : bearSetup ? 'BEARISH SETUP — YL/PDL' : 'No Prime signal in the 09:15–10:00 scan window.';
  return {
    symbol: input.symbol, instrumentKey: input.instrumentKey, exchange: input.exchange, lotSize: input.lotSize,
    ltp: input.ltp, dayChangePercent: input.dayChangePercent,
    levels: { yesterdayHigh: yh, yesterdayLow: yl, mid: (yh + yl) / 2 },
    candle: c, candleAnalysis: { range: a.range, body: a.body, upperWick: a.upperWick, lowerWick: a.lowerWick, bodyPercent: a.bodyPercent, closeLocation: a.closeLocation, isBullish: a.isBullish, isBearish: a.isBearish, isDoji: a.isDoji },
    volumeAnalysis: { current: c.volume, average20: volAvg, ratio: volMultiple, rating: volMultiple >= 6.5 ? 'STAR_3' : volMultiple >= 4 ? 'STAR_2' : volMultiple >= 2 ? 'STAR_1' : 'NORMAL', isParticipation: volMultiple >= MIN_VOLUME_MULTIPLE },
    emaAnalysis: { ema20: e, priceVsEma: above ? 'ABOVE' : below ? 'BELOW' : 'AT', distance: Math.abs(c.close-e), distancePercent: e ? Math.abs(c.close-e)/e*100 : 0, direction: above ? 'BULLISH' : below ? 'BEARISH' : 'NEUTRAL' },
    reaction: { level: bull ? 'YH' : bear ? 'YL' : 'NONE', levelPrice: trigger || null, touched: bull || bear, reaction: bullFast || bearFast ? 'BREAKOUT' : 'NONE', direction, structuralSL },
    fakeBreakout: fake,
    state, direction, pipeline, suggestedEntry: confirmed ? c.close : null, structuralSL,
    risk: { accountCapital: ACCOUNT_SIZE, riskPercent: RISK_PERCENT, riskBudget, entry: confirmed ? c.close : null, structuralSL, riskPerShare, lotSize: input.lotSize, calculatedQty: qty },
    score, reason, rank: 0, updatedAt: new Date().toISOString(),
  };
}

export function rankScanResults(results: PrimeScanResult[]): PrimeScanResult[] {
  const priority: Record<ScannerState, number> = { CONFIRMED: 1, SETUP: 2, FAKE_BREAKOUT: 3, WATCH: 4, INVALID: 5, NO_TRADE: 6 };
  return [...results].sort((a, b) => {
    const p = priority[a.state] - priority[b.state];
    if (p) return p;
    return (b.score ?? -1) - (a.score ?? -1) || (b.volumeAnalysis?.ratio ?? 0) - (a.volumeAnalysis?.ratio ?? 0);
  }).map((r, i) => ({ ...r, rank: i + 1 }));
}
