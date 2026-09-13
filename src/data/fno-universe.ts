/**
 * NSE F&O eligible stock universe used as the scanner's symbol list.
 * Real instrument keys are resolved at runtime from Upstox's NSE instrument master.
 */

export const NSE_FNO_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
  'LT', 'AXISBANK', 'WIPRO', 'ASIANPAINT', 'MARUTI', 'HCLTECH', 'SUNPHARMA', 'BAJFINANCE', 'TITAN', 'ULTRACEMCO',
  'NESTLEIND', 'TATAMOTORS', 'TATASTEEL', 'ONGC', 'NTPC', 'POWERGRID', 'M&M', 'TECHM', 'ADANIPORTS', 'JSWSTEEL',
  'HINDALCO', 'INDUSINDBK', 'COALINDIA', 'BAJAJFINSV', 'GRASIM', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'EICHERMOT', 'HEROMOTOCO',
  'BRITANNIA', 'SHREECEM', 'APOLLOHOSP', 'BAJAJ-AUTO', 'TATACONSUM', 'ADANIENT', 'UPL', 'BPCL', 'IOC', 'VEDL',
  'GODREJCP', 'DABUR', 'MARICO', 'COLPAL', 'PEL', 'ESCORTS', 'BANDHANBNK', 'PERSISTENT', 'MCDOWELL-N', 'PIDILITIND',
  'VOLTAS', 'AMBUJACEM', 'ACC', 'BERGEPAINT', 'HAVELLS', 'CANBK', 'PNB', 'BANKBARODA', 'INDIGO', 'SAIL',
  'BEL', 'DLF', 'OBEROIRLTY', 'NMDC', 'GAIL', 'RECLTD', 'PFC', 'IRCTC', 'CONCOR', 'IGL',
  'MGL', 'PETRONET', 'ABCAPITAL', 'LICHSGFIN', 'MUTHOOTFIN', 'CHOLAFIN', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'BAJAJHLDNG',
  'TATAPOWER', 'TORNTPOWER', 'SIEMENS', 'ABB', 'BOSCHLTD', 'MOTHERSON', 'PAGEIND', 'COFORGE', 'MPHASIS', 'LTTS',
  'OFSS', 'MINDTREE', 'LTIM',
];

export function isFNOStock(symbol: string): boolean {
  return NSE_FNO_STOCKS.includes(symbol.toUpperCase());
}

export function getFNOCount(): number {
  return NSE_FNO_STOCKS.length;
}

export interface MockInstrument {
  symbol: string;
  instrumentKey: string;
  lotSize: number;
}

export function getMockFNOInstruments(): MockInstrument[] {
  return NSE_FNO_STOCKS.map((symbol) => ({
    symbol,
    instrumentKey: '',
    lotSize: 1,
  }));
}
