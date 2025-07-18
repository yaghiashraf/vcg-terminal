interface ApiConfig {
  baseUrl: string;
  key: string | null;
  rateLimit: number | null;
  priority: number;
}

// API Configuration and Keys
export const API_CONFIG: Record<string, ApiConfig> = {
  // Financial Modeling Prep API
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    key: 'b7259c75c6ef437c4d99847208834cba',
    rateLimit: 250, // requests per day
    priority: 1
  },
  
  // Alpha Vantage API
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    key: 'H9VC6IJI71M9KPO7',
    rateLimit: 25, // requests per day
    priority: 2
  },
  
  // Polygon API
  POLYGON: {
    baseUrl: 'https://api.polygon.io/v2',
    key: 'eAqK11n_iJdPgK6OVDmWROypGU8EkQI_',
    rateLimit: 5, // requests per minute
    priority: 3
  },
  
  // FinHub API
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    key: 'cvr8m1hr01qp88cp2740cvr8m1hr01qp88cp274g',
    rateLimit: 60, // requests per minute
    priority: 4
  },
  
  // Twelve Data API
  TWELVE: {
    baseUrl: 'https://api.twelvedata.com',
    key: '79567f10cd1c4a19918511564686fbe2',
    rateLimit: 8, // requests per minute
    priority: 5
  },
  
  // Yahoo Finance (fallback, no key required)
  YAHOO: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    key: null,
    rateLimit: null,
    priority: 6
  }
};

export interface ApiQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  currency: string;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
}

export interface ApiHistoricalData {
  symbol: string;
  period: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}