/**
 * NSE F&O Universe
 * 
 * Current NSE F&O stocks (as of 2024)
 * This should ideally be loaded from Upstox instrument master,
 * but providing a static list as fallback
 */

export const NSE_FNO_STOCKS = [
  'RELIANCE',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'HINDUNILVR',
  'SBIN',
  'BHARTIARTL',
  'ITC',
  'KOTAKBANK',
  'LT',
  'AXISBANK',
  'WIPRO',
  'ASIANPAINT',
  'MARUTI',
  'HCLTECH',
  'SUNPHARMA',
  'BAJFINANCE',
  'TITAN',
  'ULTRACEMCO',
  'NESTLEIND',
  'TATAMOTORS',
  'TATASTEEL',
  'ONGC',
  'NTPC',
  'POWERGRID',
  'M&M',
  'TECHM',
  'ADANIPORTS',
  'JSWSTEEL',
  'HINDALCO',
  'INDUSINDBK',
  'COALINDIA',
  'BAJAJFINSV',
  'GRASIM',
  'DIVISLAB',
  'DRREDDY',
  'CIPLA',
  'EICHERMOT',
  'HEROMOTOCO',
  'BRITANNIA',
  'SHREECEM',
  'APOLLOHOSP',
  'BAJAJ-AUTO',
  'TATACONSUM',
  'ADANIENT',
  'UPL',
  'BPCL',
  'IOC',
  'VEDL',
  'GODREJCP',
  'DABUR',
  'MARICO',
  'COLPAL',
  'PEL',
  'ESCORTS',
  'BANDHANBNK',
  'PERSISTENT',
  'MCDOWELL-N',
  'PIDILITIND',
  'VOLTAS',
  'AMBUJACEM',
  'ACC',
  'BERGEPAINT',
  'HAVELLS',
  'CANBK',
  'PNB',
  'BANKBARODA',
  'INDIGO',
  'SAIL',
  'BEL',
  'DLF',
  'OBEROIRLTY',
  'NMDC',
  'GAIL',
  'RECLTD',
  'PFC',
  'IRCTC',
  'CONCOR',
  'IGL',
  'MGL',
  'PETRONET',
  'ABCAPITAL',
  'LICHSGFIN',
  'MUTHOOTFIN',
  'CHOLAFIN',
  'SBILIFE',
  'HDFCLIFE',
  'ICICIPRULI',
  'BAJAJHLDNG',
  'TATAPOWER',
  'TORNTPOWER',
  'SIEMENS',
  'ABB',
  'BOSCHLTD',
  'MOTHERSON',
  'PAGEIND',
  'COFORGE',
  'MPHASIS',
  'LTTS',
  'OFSS',
  'MINDTREE',
  'LTIM',
];

export function isFNOStock(symbol: string): boolean {
  return NSE_FNO_STOCKS.includes(symbol.toUpperCase());
}

export function getFNOCount(): number {
  return NSE_FNO_STOCKS.length;
}

/**
 * Mock instrument data
 * In production, this should come from Upstox instrument master
 */
export interface MockInstrument {
  symbol: string;
  instrumentKey: string;
  lotSize: number;
}

export function getMockFNOInstruments(): MockInstrument[] {
  return NSE_FNO_STOCKS.map(symbol => ({
    symbol,
    instrumentKey: `NSE_FO|${Math.floor(Math.random() * 100000)}`, // Mock key
    lotSize: getLotSize(symbol),
  }));
}

function getLotSize(symbol: string): number {
  // Approximate lot sizes for common stocks
  // In production, fetch from instrument master
  const lotSizes: Record<string, number> = {
    'RELIANCE': 250,
    'TCS': 150,
    'HDFCBANK': 550,
    'INFY': 300,
    'ICICIBANK': 1375,
    'HINDUNILVR': 300,
    'SBIN': 1500,
    'BHARTIARTL': 575,
    'ITC': 1600,
    'KOTAKBANK': 400,
  };
  
  return lotSizes[symbol] || 500; // Default lot size
}
