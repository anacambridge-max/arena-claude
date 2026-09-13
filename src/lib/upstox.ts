/**
 * Upstox API Service
 * 
 * Server-side only - handles Upstox API interactions
 * Uses API key authentication (Analytics API)
 */

import axios from 'axios';
import type { UpstoxHistoricalCandleResponse, UpstoxInstrumentMaster } from '@/domain/upstox';
import type { Candle } from '@/domain/prime';

const UPSTOX_API_BASE = 'https://api.upstox.com/v2';

export class UpstoxService {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;

  constructor() {
    this.apiKey = process.env.UPSTOX_API_KEY || '';
    this.apiSecret = process.env.UPSTOX_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('Upstox API credentials not configured');
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Fetch historical candle data
   * Interval: 5minute
   */
  async getHistoricalCandles(
    instrumentKey: string,
    fromDate: string,
    toDate: string
  ): Promise<Candle[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.get<UpstoxHistoricalCandleResponse>(
        `${UPSTOX_API_BASE}/historical-candle/${instrumentKey}/5minute/${toDate}/${fromDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.data.status === 'success' && response.data.data.candles) {
        return response.data.data.candles.map((candle) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5],
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching historical candles:', error);
      throw error;
    }
  }

  /**
   * Fetch current market quotes
   */
  async getMarketQuotes(instrumentKeys: string[]): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await axios.get(
        `${UPSTOX_API_BASE}/market-quote/quotes`,
        {
          params: {
            instrument_key: instrumentKeys.join(','),
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching market quotes:', error);
      throw error;
    }
  }

  /**
   * Download and parse instrument master
   * For NSE FO (F&O) instruments
   */
  async getInstrumentMaster(): Promise<UpstoxInstrumentMaster[]> {
    try {
      // Upstox provides instrument master CSV
      // This is a placeholder - actual implementation would download and parse CSV
      // For now, return empty array - this would be populated from a cached/stored CSV
      return [];
    } catch (error) {
      console.error('Error fetching instrument master:', error);
      return [];
    }
  }
}

// Singleton instance
export const upstoxService = new UpstoxService();
