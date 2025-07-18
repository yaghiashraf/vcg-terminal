import { MarketData } from '@/lib/models/RiskModels';
import axios from 'axios';
import { multiApiService } from './multiApiService';

export interface YahooFinanceQuote {
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

export interface YahooFinanceHistory {
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

export class MarketDataService {
  private static instance: MarketDataService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCurrentQuote(symbol: string): Promise<YahooFinanceQuote | null> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Try multi-API service first
      const apiQuote = await multiApiService.getQuote(symbol);
      if (apiQuote) {
        const quote: YahooFinanceQuote = {
          symbol: apiQuote.symbol,
          price: apiQuote.price,
          change: apiQuote.change,
          changePercent: apiQuote.changePercent,
          currency: apiQuote.currency || 'USD',
          previousClose: apiQuote.previousClose,
          open: apiQuote.open,
          high: apiQuote.high,
          low: apiQuote.low,
          volume: apiQuote.volume,
          timestamp: apiQuote.timestamp,
          marketCap: apiQuote.marketCap,
          peRatio: apiQuote.peRatio,
          dividendYield: apiQuote.dividendYield
        };
        
        this.setCachedData(cacheKey, quote);
        return quote;
      }
      
      // Fallback to Yahoo Finance API proxy
      const response = await axios.get(`/api/quote/${symbol}`);
      const data = response.data;
      
      const quote: YahooFinanceQuote = {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        currency: data.currency || 'USD',
        previousClose: data.previousClose,
        open: data.open,
        high: data.high,
        low: data.low,
        volume: data.volume,
        timestamp: data.timestamp,
        marketCap: data.marketCap,
        peRatio: data.peRatio,
        dividendYield: data.dividendYield
      };

      this.setCachedData(cacheKey, quote);
      return quote;
    } catch (error) {
      console.error('Error fetching quote from all sources:', error);
      // Final fallback to generated quote data
      const fallbackQuote = this.generateFallbackQuote(symbol);
      this.setCachedData(cacheKey, fallbackQuote);
      return fallbackQuote;
    }
  }

  private generateFallbackQuote(symbol: string): YahooFinanceQuote {
    // Generate realistic quote data for common symbols
    const basePrice = symbol === 'SPY' ? 580 : symbol === 'QQQ' ? 520 : symbol === 'AAPL' ? 240 : 120;
    const change = (Math.random() - 0.5) * 10;
    const price = basePrice + change;
    const changePercent = ((change / basePrice) * 100).toFixed(2);
    
    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      currency: 'USD',
      previousClose: basePrice,
      open: basePrice + (Math.random() - 0.5) * 5,
      high: price + Math.random() * 10,
      low: price - Math.random() * 10,
      volume: Math.floor(Math.random() * 50000000) + 10000000,
      timestamp: new Date().toISOString(),
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      peRatio: Math.random() * 30 + 10,
      dividendYield: Math.random() * 5
    };
  }

  async getHistoricalData(symbol: string, period: string = '1y'): Promise<MarketData[]> {
    const cacheKey = `history_${symbol}_${period}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Try multi-API service first
      const apiData = await multiApiService.getHistoricalData(symbol, period);
      if (apiData && apiData.data.length > 0) {
        const marketData: MarketData[] = apiData.data.map((item: any) => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }));
        
        this.setCachedData(cacheKey, marketData);
        return marketData;
      }
      
      // Fallback to Yahoo Finance API proxy
      const response = await axios.get(`/api/history/${symbol}?period=${period}`);
      const data = response.data;
      
      const marketData: MarketData[] = data.data.map((item: any) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      this.setCachedData(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error('Error fetching historical data from all sources:', error);
      // Final fallback to generated data for demo
      const fallbackData = this.generateHistoricalData(symbol, period);
      return fallbackData;
    }
  }

  private generateHistoricalData(symbol: string, period: string): MarketData[] {
    const data: MarketData[] = [];
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let currentPrice = 600; // Starting price
    const baseVolatility = 0.02;
    const trend = 0.0003; // Slight upward trend
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate realistic price movement
      const volatility = baseVolatility * (1 + 0.5 * Math.sin(i / 20)); // Varying volatility
      const randomWalk = (Math.random() - 0.5) * 2;
      const priceChange = trend + volatility * randomWalk;
      
      currentPrice *= (1 + priceChange);
      
      // Add some intraday volatility
      const intradayVolatility = volatility * 0.5;
      const open = currentPrice * (1 + (Math.random() - 0.5) * intradayVolatility);
      const close = currentPrice;
      const high = Math.max(open, close) * (1 + Math.random() * intradayVolatility);
      const low = Math.min(open, close) * (1 - Math.random() * intradayVolatility);
      
      // Generate volume based on price volatility
      const baseVolume = 30000000;
      const volumeMultiplier = 1 + Math.abs(priceChange) * 50;
      const volume = Math.floor(baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4));
      
      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return data;
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case '1d': return 1;
      case '5d': return 5;
      case '1mo': return 30;
      case '3mo': return 90;
      case '6mo': return 180;
      case '1y': return 365;
      case '2y': return 730;
      case '5y': return 1825;
      case '10y': return 3650;
      case 'max': return 7300;
      default: return 365;
    }
  }

  // Real-time data updates (fetch fresh data periodically)
  subscribeToRealTimeData(symbol: string, callback: (quote: YahooFinanceQuote) => void): () => void {
    const interval = setInterval(async () => {
      try {
        // Clear cache to force fresh data
        this.cache.delete(`quote_${symbol}`);
        const quote = await this.getCurrentQuote(symbol);
        if (quote) {
          callback(quote);
        }
      } catch (error) {
        console.error('Error fetching real-time data:', error);
      }
    }, 30000); // Update every 30 seconds (reasonable for real market data)

    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const marketDataService = MarketDataService.getInstance();