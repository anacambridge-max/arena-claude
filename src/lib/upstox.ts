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
const NSE_INSTRUMENTS_URL = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';

export interface UpstoxEquityInstrument {
  segment: string;
  name: string;
  exchange: string;
  instrument_type: string;
  instrument_key: string;
  trading_symbol: string;
  lot_size?: number;
  isin?: string;
}

export class UpstoxService {
  private readonly analyticsToken: string;

  constructor() {
    this.analyticsToken = process.env.UPSTOX_ANALYTICS_TOKEN?.trim() || '';
    if (!this.analyticsToken) {
      console.warn('UPSTOX_ANALYTICS_TOKEN is not configured');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.analyticsToken);
  }

  isAuthenticated(): boolean {
    return this.isConfigured();
  }

  private authHeaders() {
    if (!this.analyticsToken) throw new Error('UPSTOX_ANALYTICS_TOKEN is not configured');
    return {
      Authorization: `Bearer ${this.analyticsToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async getHistoricalCandles(
    instrumentKey: string,
    interval: '1minute' | '30minute' | 'day' | 'week' | 'month',
    toDate: string,
    fromDate?: string,
  ): Promise<Candle[]> {
    const path = fromDate
      ? `/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}/${fromDate}`
      : `/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}`;

    const response = await axios.get<UpstoxHistoricalCandleResponse>(`${UPSTOX_API_BASE}${path}`, {
      headers: this.authHeaders(),
      timeout: 15000,
    });

    if (response.data.status !== 'success') return [];
    return (response.data.data?.candles || []).map((candle: UpstoxHistoricalCandleResponse['data']['candles'][number]) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  }

  async getNSEEquityInstruments(symbols: string[]): Promise<Record<string, UpstoxEquityInstrument>> {
    const response = await axios.get<ArrayBuffer>(NSE_INSTRUMENTS_URL, {
      responseType: 'arraybuffer',
      timeout: 20000,
    });
    const json = gunzipSync(Buffer.from(response.data)).toString('utf8');
    const rows = JSON.parse(json) as UpstoxEquityInstrument[];
    const wanted = new Set(symbols.map((symbol) => symbol.toUpperCase()));
    const result: Record<string, UpstoxEquityInstrument> = {};
    for (const row of rows) {
      if (row.segment !== 'NSE_EQ' || row.instrument_type !== 'EQ') continue;
      if (!wanted.has((row.trading_symbol || '').toUpperCase())) continue;
      result[row.trading_symbol.toUpperCase()] = row;
    }
    return result;
  }

  async getMarketQuotes(instrumentKeys: string[]): Promise<UpstoxQuoteResponse['data']> {
    if (instrumentKeys.length === 0) return {};
    const chunks: string[][] = [];
    for (let i = 0; i < instrumentKeys.length; i += 500) chunks.push(instrumentKeys.slice(i, i + 500));

    const merged: UpstoxQuoteResponse['data'] = {};
    for (const chunk of chunks) {
      const response = await axios.get<UpstoxQuoteResponse>(`${UPSTOX_API_BASE}/market-quote/quotes`, {
        params: { instrument_key: chunk.join(',') },
        headers: this.authHeaders(),
        timeout: 15000,
      });
      if (response.data.status === 'success') Object.assign(merged, response.data.data || {});
    }
    return merged;
  }
}

export const upstoxService = new UpstoxService();
