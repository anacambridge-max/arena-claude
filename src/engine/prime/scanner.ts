/**
 * PRIME TECHNICAL MASTER signal engine.
 * Port of the supplied Pine v6 logic. Default mode is FAST PRIME.
 * Designed for completed 5-minute candles during 09:15-10:00 IST.
 */
import type { Candle, PrimeScanResult, ScannerState, Direction, PrimePipeline, FakeBreakoutAnalysis } from '@/domain/prime';

export interface ScannerInput { symbol: string; instrumentKey: string; exchange: 'NSE_FO' | 'NSE_EQ'; lotSize: number; ltp: number; dayChangePercent: number; currentCandle: Candle; historicalCandles: Candle[]; previousDayCandles: Candle[]; }
const ACCOUNT_SIZE = 500000, RISK_PERCENT = 0.5, MIN_VOLUME_MULTIPLE = 1.5, MIN_BODY_RATIO = 0.50, MIN_CLOSE_LOCATION = 0.60, RANGE_EXPANSION_RATIO = 1.30, FAKE_LOOKBACK = 3, PENETRATION_FULL_PCT = 1.0, EMA_FULL_SEPARATION_PCT = 1.0;

function istParts(timestamp: string) { const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(timestamp)); return { hour: Number(parts.find(p => p.type === 'hour')?.value || 0), minute: Number(parts.find(p => p.type === 'minute')?.value || 0) }; }
function inScanWindow(timestamp: string) { const p = istParts(timestamp), m = p.hour * 60 + p.minute; return m >= 555 && m < 600; }
function ema(values: number[], length: number) { if (!values.length) return 0; const k = 2 / (length + 1); let e = values[0]; for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k); return e; }
function average(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function grade(score: number) { return score >= 90 ? 'PRIME A+' : score >= 80 ? 'PRIME A' : score >= 70 ? 'STRONG' : score >= 60 ? 'GOOD' : score >= 50 ? 'WATCH' : 'WEAK'; }

function scorePrime(bull: boolean, candle: Candle, historyBefore: Candle[], yh: number, yl: number) {
  const range = Math.max(0, candle.high - candle.low), bodyRatio = range > 0 ? Math.abs(candle.close - candle.open) / range : 0;
  const closeLocation = range > 0 ? (bull ? (candle.close - candle.low) / range : (candle.high - candle.close) / range) : 0.5;
  const volumeAvg = average([...historyBefore.slice(-19).map(c => c.volume), candle.volume]);
  const volumeMultiple = volumeAvg > 0 ? candle.volume / volumeAvg : 0;
  const e = ema([...historyBefore.map(c => c.close), candle.close], 20), emaDistancePct = e ? Math.abs(candle.close - e) / e * 100 : 0;
  const averageRange = average([...historyBefore.map(c => c.high - c.low).slice(-9), range]), rangeExpansion = averageRange > 0 ? range / averageRange : 1;
  const penetration = bull ? (yh ? (candle.close - yh) / yh * 100 : 0) : (yl ? (yl - candle.close) / yl * 100 : 0);
  const volumeScore = volumeMultiple >= 6.5 ? 20 : volumeMultiple >= 4 ? 18 : volumeMultiple >= 2 ? 15 : volumeMultiple >= 1.5 ? 10 : volumeMultiple >= 1.2 ? 5 : 0;
  const penetrationScore = Math.min(15, Math.max(0, penetration / PENETRATION_FULL_PCT * 15));
  const bodyScore = Math.min(15, Math.max(0, bodyRatio * 15));
  const closeScore = closeLocation * 10;
  const emaScore = Math.min(15, Math.max(0, emaDistancePct / EMA_FULL_SEPARATION_PCT * 15));
  const rangeScore = rangeExpansion >= 2 ? 10 : rangeExpansion >= 1.75 ? 9 : rangeExpansion >= 1.5 ? 8 : rangeExpansion >= 1.3 ? 6 : rangeExpansion >= 1.1 ? 3 : 0;
  const { hour, minute } = istParts(candle.timestamp), minutesFromOpen = hour * 60 + minute - 555;
  const timingScore = minutesFromOpen <= 5 ? 10 : minutesFromOpen <= 10 ? 9 : minutesFromOpen <= 15 ? 8 : minutesFromOpen <= 20 ? 6 : minutesFromOpen <= 30 ? 4 : minutesFromOpen <= 45 ? 2 : 0;
  const previousCompressionAverage = average(historyBefore.slice(-3).map(c => c.high - c.low));
  const previousWasCompressed = historyBefore.length > 0 && (historyBefore[historyBefore.length - 1].high - historyBefore[historyBefore.length - 1].low) < previousCompressionAverage * 0.8;
  const compressionScore = rangeExpansion >= RANGE_EXPANSION_RATIO && previousWasCompressed ? 5 : rangeExpansion >= RANGE_EXPANSION_RATIO ? 2 : 0;
  return Math.min(100, Math.max(0, volumeScore + penetrationScore + bodyScore + closeScore + emaScore + rangeScore + timingScore + compressionScore));
}

function analyzeCandle(c: Candle) { const range = c.high - c.low, body = Math.abs(c.close - c.open), bodyRatio = range > 0 ? body / range : 0; return { range, body, upperWick: c.high - Math.max(c.open, c.close), lowerWick: Math.min(c.open, c.close) - c.low, bodyPercent: bodyRatio * 100, closeLocation: (c.close - c.low) / (range || 1) * 100, isBullish: c.close > c.open, isBearish: c.close < c.open, isDoji: body === 0, bodyRatio, bullClose: range > 0 ? (c.close-c.low)/range : 0.5, bearClose: range > 0 ? (c.high-c.close)/range : 0.5 }; }

export function runPrimeScan(input: ScannerInput): PrimeScanResult {
  const history = input.historicalCandles.slice().sort((a,b) => new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime()), prev = input.previousDayCandles, c = input.currentCandle;
  const yh = prev.length ? Math.max(...prev.map(x=>x.high)) : 0, yl = prev.length ? Math.min(...prev.map(x=>x.low)) : 0, before = history.filter(x=>x.timestamp<c.timestamp), a=analyzeCandle(c);
  // Pine ta.sma(volume,20) includes the current bar, so use current + prior 19 bars.
  const volAvg = average([...before.slice(-19).map(x=>x.volume), c.volume]), volMultiple = volAvg>0 ? c.volume/volAvg : 0;
  const e = ema([...before.map(x=>x.close),c.close],20), above=c.close>e, below=c.close<e;
  const rawBull=inScanWindow(c.timestamp)&&c.close>yh&&(before.length?before[before.length-1].close<=yh:true), rawBear=inScanWindow(c.timestamp)&&c.close<yl&&(before.length?before[before.length-1].close>=yl:true);
  const bullReaction=c.close>c.open&&a.bodyRatio>=MIN_BODY_RATIO&&a.bullClose>=MIN_CLOSE_LOCATION, bearReaction=c.close<c.open&&a.bodyRatio>=MIN_BODY_RATIO&&a.bearClose>=MIN_CLOSE_LOCATION;
  const avgRange=average([...before.slice(-9).map(x=>x.high-x.low),a.range]), rangeExpansion=avgRange>0?a.range/avgRange:1, rangeExpanded=rangeExpansion>=RANGE_EXPANSION_RATIO;
  const bullFast=rawBull&&volMultiple>=MIN_VOLUME_MULTIPLE&&above, bearFast=rawBear&&volMultiple>=MIN_VOLUME_MULTIPLE&&below;
  const bullQuality=bullFast&&bullReaction&&rangeExpanded, bearQuality=bearFast&&bearReaction&&rangeExpanded;
  const recentHighBreak=[...before.slice(-(FAKE_LOOKBACK+1)),c].some(x=>x.high>yh), recentLowBreak=[...before.slice(-(FAKE_LOOKBACK+1)),c].some(x=>x.low<yl);
  const fakeBull=inScanWindow(c.timestamp)&&recentHighBreak&&c.high>yh&&c.close<yh, fakeBear=inScanWindow(c.timestamp)&&recentLowBreak&&c.low<yl&&c.close>yl;
  const bullSetup=inScanWindow(c.timestamp)&&yh>0&&Math.abs(c.close-yh)/yh*100<=1&&c.close>=yh, bearSetup=inScanWindow(c.timestamp)&&yl>0&&Math.abs(c.close-yl)/yl*100<=1&&c.close<=yl;
  const confirmed=bullFast||bearFast;
  const state:ScannerState=fakeBull||fakeBear?'FAKE_BREAKOUT':confirmed?'CONFIRMED':bullSetup||bearSetup?'SETUP':(yh>0&&(Math.abs(c.close-yh)/yh*100<=1||Math.abs(c.close-yl)/yl*100<=1)&&inScanWindow(c.timestamp))?'WATCH':'NO_TRADE';
  const direction:Direction=bullFast?'BULLISH':bearFast?'BEARISH':fakeBull?'BULLISH':fakeBear?'BEARISH':bullSetup?'BULLISH':bearSetup?'BEARISH':'NEUTRAL';
  const bull=bullFast||bullSetup,bear=bearFast||bearSetup,score=bullFast?scorePrime(true,c,before,yh,yl):bearFast?scorePrime(false,c,before,yh,yl):null,structuralSL=bullFast?c.low:bearFast?c.high:null,riskPerShare=structuralSL!==null?Math.abs(c.close-structuralSL):null,riskBudget=ACCOUNT_SIZE*RISK_PERCENT/100,qty=riskPerShare&&riskPerShare>0?Math.floor(riskBudget/riskPerShare):null,trigger=bull?yh:bear?yl:0;
  const fake:FakeBreakoutAnalysis={detected:fakeBull||fakeBear,originalBreak:fakeBull?'YH':fakeBear?'YL':null,failedToHold:fakeBull||fakeBear,reclaimed:fakeBull||fakeBear,oppositeSetup:fakeBull||fakeBear};
  const pipeline:PrimePipeline={level:trigger?'PASS':'WAIT',reaction:bullReaction||bearReaction?'PASS':'WAIT',candle:bullReaction||bearReaction?'PASS':'WAIT',volume:volMultiple>=MIN_VOLUME_MULTIPLE?'PASS':'WAIT',ema:(bull&&above)||(bear&&below)?'PASS':'WAIT',confirmation:confirmed?'PASS':'WAIT',sl:structuralSL!==null?'PASS':'WAIT',qty:qty!==null?'PASS':'WAIT'};
  const reason=bullFast?`PRIME BUY — 5M YH/PDH breakout | Volume ${volMultiple.toFixed(2)}x | EMA20 ABOVE | Score ${score?.toFixed(0)}/100 | ${score!==null?grade(score):''}`:bearFast?`PRIME SELL — 5M YL/PDL breakdown | Volume ${volMultiple.toFixed(2)}x | EMA20 BELOW | Score ${score?.toFixed(0)}/100 | ${score!==null?grade(score):''}`:fakeBull?'PRIME FAKE BREAKOUT — YH failure':fakeBear?'PRIME FAKE BREAKDOWN — YL reclaim':bullSetup?'BULLISH SETUP — YH/PDH':bearSetup?'BEARISH SETUP — YL/PDL':'No Prime signal in the 09:15–10:00 scan window.';
  return { symbol:input.symbol,instrumentKey:input.instrumentKey,exchange:input.exchange,lotSize:input.lotSize,ltp:input.ltp,dayChangePercent:input.dayChangePercent,levels:{yesterdayHigh:yh,yesterdayLow:yl,mid:(yh+yl)/2},candle:c,candleAnalysis:{range:a.range,body:a.body,upperWick:a.upperWick,lowerWick:a.lowerWick,bodyPercent:a.bodyPercent,closeLocation:a.closeLocation,isBullish:a.isBullish,isBearish:a.isBearish,isDoji:a.isDoji},volumeAnalysis:{current:c.volume,average20:volAvg,ratio:volMultiple,rating:volMultiple>=6.5?'STAR_3':volMultiple>=4?'STAR_2':volMultiple>=2?'STAR_1':'NORMAL',isParticipation:volMultiple>=MIN_VOLUME_MULTIPLE},emaAnalysis:{ema20:e,priceVsEma:above?'ABOVE':below?'BELOW':'AT',distance:Math.abs(c.close-e),distancePercent:e?Math.abs(c.close-e)/e*100:0,direction:above?'BULLISH':below?'BEARISH':'NEUTRAL'},reaction:{level:bull?'YH':bear?'YL':'NONE',levelPrice:trigger||null,touched:bull||bear,reaction:bullFast||bearFast?'BREAKOUT':'NONE',direction,structuralSL},fakeBreakout:fake,state,direction,pipeline,suggestedEntry:confirmed?c.close:null,structuralSL,risk:{accountCapital:ACCOUNT_SIZE,riskPercent:RISK_PERCENT,riskBudget,entry:confirmed?c.close:null,structuralSL,riskPerShare,lotSize:input.lotSize,calculatedQty:qty},score,reason,rank:0,updatedAt:new Date().toISOString()};
}

export function rankScanResults(results:PrimeScanResult[]):PrimeScanResult[]{ const priority:Record<ScannerState,number>={CONFIRMED:1,SETUP:2,FAKE_BREAKOUT:3,WATCH:4,INVALID:5,NO_TRADE:6}; return [...results].sort((a,b)=>{const p=priority[a.state]-priority[b.state];if(p)return p;return (b.score??-1)-(a.score??-1)||(b.volumeAnalysis?.ratio??0)-(a.volumeAnalysis?.ratio??0);}).map((r,i)=>({...r,rank:i+1})); }
