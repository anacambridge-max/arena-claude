/**
 * Server-side Upstox Analytics Token service.
 * The token is supplied only through UPSTOX_ANALYTICS_TOKEN and is never
 * returned to the browser.
 */
import axios from 'axios';
import { gunzipSync } from 'node:zlib';
import type { UpstoxHistoricalCandleResponse, UpstoxQuoteResponse } from '@/domain/upstox';
import type { Candle } from '@/domain/prime';

const UPSTOX_API_BASE = 'https://api.upstox.com/v2';
const UPSTOX_API_V3_BASE = 'https://api.upstox.com/v3';
const NSE_INSTRUMENTS_URL = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';
const NSE_INDEX_FUTURES = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50']);

export interface UpstoxFuturesInstrument { segment: string; name: string; exchange: string; instrument_type: string; instrument_key: string; trading_symbol: string; underlying_symbol: string; underlying_type?: string; lot_size: number; expiry: string | number; weekly?: boolean; }
export interface UpstoxEquityInstrument { segment: string; name: string; exchange: string; instrument_type: string; instrument_key: string; trading_symbol: string; lot_size?: number; isin?: string; }

export class UpstoxService {
  private readonly analyticsToken: string;
  constructor() { this.analyticsToken = process.env.UPSTOX_ANALYTICS_TOKEN?.trim() || ''; if (!this.analyticsToken) console.warn('UPSTOX_ANALYTICS_TOKEN is not configured'); }
  isConfigured(): boolean { return Boolean(this.analyticsToken); }
  isAuthenticated(): boolean { return this.isConfigured(); }
  private authHeaders() { if (!this.analyticsToken) throw new Error('UPSTOX_ANALYTICS_TOKEN is not configured'); return { Authorization: `Bearer ${this.analyticsToken}`, Accept: 'application/json', 'Content-Type': 'application/json' }; }

  async getHistoricalCandles(instrumentKey: string, interval: '1minute' | '5minute' | '30minute' | 'day' | 'week' | 'month', toDate: string, fromDate?: string): Promise<Candle[]> {
    const minuteInterval = interval === '1minute' ? '1' : interval === '5minute' ? '5' : interval === '30minute' ? '30' : null;
    const path = minuteInterval
      ? (fromDate ? `/historical-candle/${encodeURIComponent(instrumentKey)}/minutes/${minuteInterval}/${toDate}/${fromDate}` : `/historical-candle/${encodeURIComponent(instrumentKey)}/minutes/${minuteInterval}/${toDate}`)
      : (fromDate ? `/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}/${fromDate}` : `/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}`);
    const response = await axios.get<UpstoxHistoricalCandleResponse>(`${UPSTOX_API_V3_BASE}${path}`, { headers: this.authHeaders(), timeout: 10000 });
    if (response.data.status !== 'success') return [];
    return (response.data.data?.candles || []).map(candle => ({ timestamp: candle[0], open: candle[1], high: candle[2], low: candle[3], close: candle[4], volume: candle[5] }));
  }

  async getAllNSEFuturesInstruments(): Promise<Record<string, UpstoxFuturesInstrument>> {
    const response = await axios.get<ArrayBuffer>(NSE_INSTRUMENTS_URL, { responseType: 'arraybuffer', timeout: 20000 });
    const rows = JSON.parse(gunzipSync(Buffer.from(response.data)).toString('utf8')) as UpstoxFuturesInstrument[];
    const now = Date.now(); const result: Record<string, UpstoxFuturesInstrument> = {};
    for (const row of rows) {
      if (row.segment !== 'NSE_FO' || row.instrument_type !== 'FUT') continue;
      if (row.underlying_type && row.underlying_type !== 'EQUITY') continue;
      if (!row.underlying_symbol) continue;
      const key = row.underlying_symbol.toUpperCase();
      if (NSE_INDEX_FUTURES.has(key)) continue;
      const expiryMs = typeof row.expiry === 'number' ? row.expiry : Date.parse(row.expiry);
      if (!Number.isFinite(expiryMs) || expiryMs < now) continue;
      const current = result[key];
      if (!current) result[key] = row;
      else { const currentExpiry = typeof current.expiry === 'number' ? current.expiry : Date.parse(current.expiry); if (expiryMs < currentExpiry) result[key] = row; }
    }
    return result;
  }

  async getNSEFuturesInstruments(symbols: string[]): Promise<Record<string, UpstoxFuturesInstrument>> {
    const all = await this.getAllNSEFuturesInstruments(); const wanted = new Set(symbols.map(s => s.toUpperCase())); return Object.fromEntries(Object.entries(all).filter(([symbol]) => wanted.has(symbol)));
  }
  async getNSEEquityInstruments(symbols: string[]): Promise<Record<string, UpstoxEquityInstrument>> {
    const response = await axios.get<ArrayBuffer>(NSE_INSTRUMENTS_URL, { responseType: 'arraybuffer', timeout: 20000 });
    const rows = JSON.parse(gunzipSync(Buffer.from(response.data)).toString('utf8')) as UpstoxEquityInstrument[]; const wanted = new Set(symbols.map(s => s.toUpperCase())); const result: Record<string, UpstoxEquityInstrument> = {};
    for (const row of rows) if (row.segment === 'NSE_EQ' && row.instrument_type === 'EQ' && wanted.has((row.trading_symbol || '').toUpperCase())) result[row.trading_symbol.toUpperCase()] = row;
    return result;
  }
  async getMarketQuotes(instrumentKeys: string[]): Promise<UpstoxQuoteResponse['data']> {
    if (!instrumentKeys.length) return {}; const merged: UpstoxQuoteResponse['data'] = {};
    for (let i = 0; i < instrumentKeys.length; i += 500) {
      const chunk = instrumentKeys.slice(i, i + 500); const response = await axios.get<UpstoxQuoteResponse>(`${UPSTOX_API_BASE}/market-quote/quotes`, { params: { instrument_key: chunk.join(',') }, headers: this.authHeaders(), timeout: 10000 });
      if (response.data.status === 'success') for (const [key, quote] of Object.entries(response.data.data || {})) { merged[key] = quote; if (quote.instrument_token) merged[quote.instrument_token] = quote; }
    }
    return merged;
  }
}
export const upstoxService = new UpstoxService();
