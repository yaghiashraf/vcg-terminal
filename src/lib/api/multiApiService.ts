import { API_CONFIG, ApiQuote, ApiHistoricalData } from './apiConfig';
import axios, { AxiosResponse } from 'axios';

interface ApiProvider {
  name: string;
  config: {
    baseUrl: string;
    key: string | null;
    rateLimit: number | null;
    priority: number;
  };
  fetchQuote: (symbol: string) => Promise<ApiQuote>;
  fetchHistoricalData: (symbol: string, period: string) => Promise<ApiHistoricalData>;
}

export class MultiApiService {
  private providers: ApiProvider[] = [];
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Financial Modeling Prep
    this.providers.push({
      name: 'FMP',
      config: API_CONFIG.FMP,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.FMP.baseUrl}/quote/${symbol}?apikey=${API_CONFIG.FMP.key}`;
        const response = await axios.get(url);
        const data = response.data[0];
        
        return {
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changesPercentage?.toFixed(2) || '0.00',
          currency: 'USD',
          previousClose: data.previousClose,
          open: data.open,
          high: data.dayHigh,
          low: data.dayLow,
          volume: data.volume,
          timestamp: new Date().toISOString(),
          marketCap: data.marketCap,
          peRatio: data.pe,
          dividendYield: data.dividendYield
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const url = `${API_CONFIG.FMP.baseUrl}/historical-price-full/${symbol}?timeseries=${this.getPeriodDays(period)}&apikey=${API_CONFIG.FMP.key}`;
        const response = await axios.get(url);
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data: response.data.historical.map((item: any) => ({
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          }))
        };
      }
    });

    // Alpha Vantage
    this.providers.push({
      name: 'ALPHA_VANTAGE',
      config: API_CONFIG.ALPHA_VANTAGE,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.ALPHA_VANTAGE.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_CONFIG.ALPHA_VANTAGE.key}`;
        const response = await axios.get(url);
        const data = response.data['Global Quote'];
        
        return {
          symbol: data['01. symbol'],
          price: parseFloat(data['05. price']),
          change: parseFloat(data['09. change']),
          changePercent: data['10. change percent'].replace('%', ''),
          currency: 'USD',
          previousClose: parseFloat(data['08. previous close']),
          open: parseFloat(data['02. open']),
          high: parseFloat(data['03. high']),
          low: parseFloat(data['04. low']),
          volume: parseInt(data['06. volume']),
          timestamp: new Date().toISOString()
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const url = `${API_CONFIG.ALPHA_VANTAGE.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${API_CONFIG.ALPHA_VANTAGE.key}`;
        const response = await axios.get(url);
        const timeSeries = response.data['Time Series (Daily)'];
        
        const data = Object.entries(timeSeries).slice(0, this.getPeriodDays(period)).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }));
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data
        };
      }
    });

    // Polygon
    this.providers.push({
      name: 'POLYGON',
      config: API_CONFIG.POLYGON,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.POLYGON.baseUrl}/last/trade/${symbol}?apikey=${API_CONFIG.POLYGON.key}`;
        const response = await axios.get(url);
        const data = response.data.results;
        
        // Note: Polygon requires additional calls for full quote data
        return {
          symbol: symbol.toUpperCase(),
          price: data.p,
          change: 0, // Would need previous close to calculate
          changePercent: '0.00',
          currency: 'USD',
          previousClose: data.p,
          open: data.p,
          high: data.p,
          low: data.p,
          volume: data.s,
          timestamp: new Date(data.t).toISOString()
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - this.getPeriodDays(period) * 24 * 60 * 60 * 1000);
        
        const url = `${API_CONFIG.POLYGON.baseUrl}/aggs/ticker/${symbol}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}?apikey=${API_CONFIG.POLYGON.key}`;
        const response = await axios.get(url);
        
        const data = response.data.results.map((item: any) => ({
          date: new Date(item.t).toISOString().split('T')[0],
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v
        }));
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data
        };
      }
    });

    // Finnhub
    this.providers.push({
      name: 'FINNHUB',
      config: API_CONFIG.FINNHUB,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.FINNHUB.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.FINNHUB.key}`;
        const response = await axios.get(url);
        const data = response.data;
        
        return {
          symbol: symbol.toUpperCase(),
          price: data.c,
          change: data.d,
          changePercent: data.dp?.toFixed(2) || '0.00',
          currency: 'USD',
          previousClose: data.pc,
          open: data.o,
          high: data.h,
          low: data.l,
          volume: 0, // Not provided in basic quote
          timestamp: new Date(data.t * 1000).toISOString()
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = Math.floor((Date.now() - this.getPeriodDays(period) * 24 * 60 * 60 * 1000) / 1000);
        
        const url = `${API_CONFIG.FINNHUB.baseUrl}/stock/candle?symbol=${symbol}&resolution=D&from=${startDate}&to=${endDate}&token=${API_CONFIG.FINNHUB.key}`;
        const response = await axios.get(url);
        const data = response.data;
        
        const historicalData = data.c.map((close: number, index: number) => ({
          date: new Date(data.t[index] * 1000).toISOString().split('T')[0],
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: close,
          volume: data.v[index]
        }));
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data: historicalData
        };
      }
    });

    // Twelve Data
    this.providers.push({
      name: 'TWELVE',
      config: API_CONFIG.TWELVE,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.TWELVE.baseUrl}/quote?symbol=${symbol}&apikey=${API_CONFIG.TWELVE.key}`;
        const response = await axios.get(url);
        const data = response.data;
        
        return {
          symbol: data.symbol,
          price: parseFloat(data.close),
          change: parseFloat(data.change),
          changePercent: data.percent_change,
          currency: 'USD',
          previousClose: parseFloat(data.previous_close),
          open: parseFloat(data.open),
          high: parseFloat(data.high),
          low: parseFloat(data.low),
          volume: parseInt(data.volume),
          timestamp: new Date().toISOString()
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const url = `${API_CONFIG.TWELVE.baseUrl}/time_series?symbol=${symbol}&interval=1day&outputsize=${this.getPeriodDays(period)}&apikey=${API_CONFIG.TWELVE.key}`;
        const response = await axios.get(url);
        
        const data = response.data.values.map((item: any) => ({
          date: item.datetime,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume)
        }));
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data
        };
      }
    });

    // Yahoo Finance (fallback)
    this.providers.push({
      name: 'YAHOO',
      config: API_CONFIG.YAHOO,
      fetchQuote: async (symbol: string): Promise<ApiQuote> => {
        const url = `${API_CONFIG.YAHOO.baseUrl}/${symbol}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const data = response.data.chart.result[0];
        const meta = data.meta;
        
        return {
          symbol: symbol.toUpperCase(),
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
          currency: meta.currency,
          previousClose: meta.previousClose,
          open: meta.regularMarketPrice,
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
          timestamp: new Date().toISOString(),
          marketCap: meta.marketCap,
          peRatio: meta.trailingPE,
          dividendYield: meta.dividendYield
        };
      },
      fetchHistoricalData: async (symbol: string, period: string): Promise<ApiHistoricalData> => {
        const url = `${API_CONFIG.YAHOO.baseUrl}/${symbol}?range=${period}&interval=1d`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        const data = timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          open: quotes.open[index] || 0,
          high: quotes.high[index] || 0,
          low: quotes.low[index] || 0,
          close: quotes.close[index] || 0,
          volume: quotes.volume[index] || 0
        })).filter((item: any) => item.close > 0);
        
        return {
          symbol: symbol.toUpperCase(),
          period,
          data
        };
      }
    });

    // Sort providers by priority
    this.providers.sort((a, b) => a.config.priority - b.config.priority);
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
      default: return 365;
    }
  }

  async getQuote(symbol: string): Promise<ApiQuote | null> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    for (const provider of this.providers) {
      try {
        console.log(`Attempting to fetch quote from ${provider.name}...`);
        const quote = await provider.fetchQuote(symbol);
        this.setCachedData(cacheKey, quote);
        console.log(`Successfully fetched quote from ${provider.name}`);
        return quote;
      } catch (error) {
        console.warn(`${provider.name} failed for quote:`, error);
        continue;
      }
    }

    console.error('All providers failed for quote');
    return null;
  }

  async getHistoricalData(symbol: string, period: string): Promise<ApiHistoricalData | null> {
    const cacheKey = `history_${symbol}_${period}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    for (const provider of this.providers) {
      try {
        console.log(`Attempting to fetch historical data from ${provider.name}...`);
        const data = await provider.fetchHistoricalData(symbol, period);
        if (data.data.length > 0) {
          this.setCachedData(cacheKey, data);
          console.log(`Successfully fetched ${data.data.length} data points from ${provider.name}`);
          return data;
        }
      } catch (error) {
        console.warn(`${provider.name} failed for historical data:`, error);
        continue;
      }
    }

    console.error('All providers failed for historical data');
    return null;
  }
}

// Export singleton instance
export const multiApiService = new MultiApiService();