/**
 * Upstox API Types
 * For Analytics API (API key based, not OAuth redirect)
 */

export interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri?: string;
}

export interface UpstoxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  created_at: number;
}

export interface UpstoxHistoricalCandleResponse {
  status: string;
  data: {
    candles: Array<[string, number, number, number, number, number, number]>;
  };
}

export interface UpstoxQuoteResponse {
  status: string;
  data: {
    [instrumentKey: string]: {
      instrument_token?: string;
      last_price: number;
      ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
      };
      depth: any;
      last_traded_time: string;
      net_change: number;
      oi_day_high?: number;
      oi_day_low?: number;
    };
  };
}

export interface UpstoxInstrumentMaster {
  instrument_key: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: 'EQ' | 'FUT' | 'CE' | 'PE';
  option_type?: 'CE' | 'PE';
  exchange: 'NSE' | 'BSE' | 'NFO' | 'MCX' | 'BFO';
}

export interface UpstoxMarketQuoteData {
  instrument_key: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_traded_time: string;
  oi_day_high: number;
  oi_day_low: number;
}
