/**
 * Prime Technical Master - Domain Types
 * 
 * Core trading framework based on Prime Technical principles:
 * "Do not trade the line. Trade the reaction to the line."
 */

export type Direction = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type ScannerState = 
  | 'WATCH'
  | 'SETUP'
  | 'CONFIRMED'
  | 'INVALID'
  | 'NO_TRADE'
  | 'FAKE_BREAKOUT';

export type PipelineStage = 
  | 'PASS'
  | 'WAIT'
  | 'FAIL'
  | 'NOT_AVAILABLE';

export type VolumeRating = 
  | 'NORMAL'
  | 'STAR_1'  // 2x average
  | 'STAR_2'  // 4x average
  | 'STAR_3'; // 6.5x average

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleAnalysis {
  range: number;
  body: number;
  upperWick: number;
  lowerWick: number;
  bodyPercent: number;
  closeLocation: number; // 0-100, where close is in the candle range
  isBullish: boolean;
  isBearish: boolean;
  isDoji: boolean;
}

export interface VolumeAnalysis {
  current: number;
  average20: number;
  ratio: number;
  rating: VolumeRating;
  isParticipation: boolean;
}

export interface EMAAnalysis {
  ema20: number;
  priceVsEma: 'ABOVE' | 'BELOW' | 'AT';
  distance: number;
  distancePercent: number;
  direction: Direction;
}

export interface PriceLevels {
  yesterdayHigh: number;
  yesterdayLow: number;
  // MID/R/S formulas not verified - these should not be calculated without verified rules
  mid?: number;
  r1?: number;
  r2?: number;
  r3?: number;
  s1?: number;
  s2?: number;
  s3?: number;
}

export interface ReactionAnalysis {
  level: 'YH' | 'YL' | 'MID' | 'R1' | 'R2' | 'R3' | 'S1' | 'S2' | 'S3' | 'NONE';
  levelPrice: number | null;
  touched: boolean;
  reaction: 'REJECTION' | 'ACCEPTANCE' | 'BREAKOUT' | 'NONE';
  direction: Direction;
  structuralSL: number | null;
}

export interface FakeBreakoutAnalysis {
  detected: boolean;
  originalBreak: 'YH' | 'YL' | null;
  failedToHold: boolean;
  reclaimed: boolean;
  oppositeSetup: boolean;
}

export interface PrimePipeline {
  level: PipelineStage;
  reaction: PipelineStage;
  candle: PipelineStage;
  volume: PipelineStage;
  ema: PipelineStage;
  confirmation: PipelineStage;
  sl: PipelineStage;
  qty: PipelineStage;
}

export interface RiskCalculation {
  accountCapital?: number;
  riskPercent?: number;
  riskBudget?: number;
  entry: number | null;
  structuralSL: number | null;
  riskPerShare: number | null;
  lotSize?: number;
  calculatedQty: number | null;
}

export interface PrimeScanResult {
  symbol: string;
  instrumentKey: string;
  exchange: 'NSE_FO' | 'NSE_EQ';
  lotSize: number;
  
  // Price data
  ltp: number;
  dayChangePercent: number;
  
  // Levels
  levels: PriceLevels;
  
  // Prime Analysis
  candle: Candle | null;
  candleAnalysis: CandleAnalysis | null;
  volumeAnalysis: VolumeAnalysis | null;
  emaAnalysis: EMAAnalysis | null;
  reaction: ReactionAnalysis | null;
  fakeBreakout: FakeBreakoutAnalysis | null;
  
  // State
  state: ScannerState;
  direction: Direction;
  pipeline: PrimePipeline;
  
  // Entry/Exit
  suggestedEntry: number | null;
  structuralSL: number | null;
  risk: RiskCalculation | null;
  
  // Meta
  score: number | null;
  reason: string;
  rank: number;
  updatedAt: string;
}

export interface UpstoxInstrument {
  instrument_key: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  option_type: string;
  exchange: string;
}

export interface UpstoxCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface MarketStatus {
  isOpen: boolean;
  session: 'PRE_MARKET' | 'OPEN' | 'CLOSED' | 'POST_MARKET';
  currentTime: string;
  nextChange: string | null;
}
