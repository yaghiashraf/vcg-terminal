import { MarketData } from './RiskModels';

export interface OptionsData {
  symbol: string;
  expiration: string;
  strike: number;
  callPrice: number;
  putPrice: number;
  callVolume: number;
  putVolume: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface VolatilitySurface {
  strikes: number[];
  expirations: string[];
  impliedVolatilities: number[][];
}

export interface GreeksProfile {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export class OptionsAnalyzer {
  private riskFreeRate: number = 0.05; // 5% risk-free rate
  
  constructor(riskFreeRate?: number) {
    if (riskFreeRate) {
      this.riskFreeRate = riskFreeRate;
    }
  }

  // Black-Scholes formula for European options
  calculateBlackScholes(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number,
    optionType: 'call' | 'put' = 'call'
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
    
    const Nd1 = this.normalCDF(d1);
    const Nd2 = this.normalCDF(d2);
    const NnegD1 = this.normalCDF(-d1);
    const NnegD2 = this.normalCDF(-d2);
    
    if (optionType === 'call') {
      return stockPrice * Nd1 - strikePrice * Math.exp(-this.riskFreeRate * timeToExpiry) * Nd2;
    } else {
      return strikePrice * Math.exp(-this.riskFreeRate * timeToExpiry) * NnegD2 - stockPrice * NnegD1;
    }
  }

  // Calculate implied volatility using Newton-Raphson method
  calculateImpliedVolatility(
    marketPrice: number,
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    optionType: 'call' | 'put' = 'call'
  ): number {
    let volatility = 0.2; // Initial guess
    const tolerance = 1e-6;
    const maxIterations = 100;
    
    for (let i = 0; i < maxIterations; i++) {
      const price = this.calculateBlackScholes(stockPrice, strikePrice, timeToExpiry, volatility, optionType);
      const vega = this.calculateVega(stockPrice, strikePrice, timeToExpiry, volatility);
      
      const diff = price - marketPrice;
      
      if (Math.abs(diff) < tolerance) {
        return volatility;
      }
      
      if (vega === 0) {
        break;
      }
      
      volatility = volatility - diff / vega;
      
      // Ensure volatility stays positive
      if (volatility < 0.001) {
        volatility = 0.001;
      }
    }
    
    return volatility;
  }

  // Calculate Greeks
  calculateDelta(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number,
    optionType: 'call' | 'put' = 'call'
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    
    if (optionType === 'call') {
      return this.normalCDF(d1);
    } else {
      return this.normalCDF(d1) - 1;
    }
  }

  calculateGamma(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    const nd1 = this.normalPDF(d1);
    
    return nd1 / (stockPrice * volatility * Math.sqrt(timeToExpiry));
  }

  calculateTheta(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number,
    optionType: 'call' | 'put' = 'call'
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
    
    const nd1 = this.normalPDF(d1);
    const Nd2 = this.normalCDF(d2);
    const NnegD2 = this.normalCDF(-d2);
    
    const term1 = -(stockPrice * nd1 * volatility) / (2 * Math.sqrt(timeToExpiry));
    
    if (optionType === 'call') {
      const term2 = -this.riskFreeRate * strikePrice * Math.exp(-this.riskFreeRate * timeToExpiry) * Nd2;
      return term1 + term2;
    } else {
      const term2 = this.riskFreeRate * strikePrice * Math.exp(-this.riskFreeRate * timeToExpiry) * NnegD2;
      return term1 + term2;
    }
  }

  calculateVega(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    const nd1 = this.normalPDF(d1);
    
    return stockPrice * nd1 * Math.sqrt(timeToExpiry);
  }

  calculateRho(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number,
    optionType: 'call' | 'put' = 'call'
  ): number {
    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, volatility);
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
    
    if (optionType === 'call') {
      return strikePrice * timeToExpiry * Math.exp(-this.riskFreeRate * timeToExpiry) * this.normalCDF(d2);
    } else {
      return -strikePrice * timeToExpiry * Math.exp(-this.riskFreeRate * timeToExpiry) * this.normalCDF(-d2);
    }
  }

  // Calculate all Greeks at once
  calculateAllGreeks(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number,
    optionType: 'call' | 'put' = 'call'
  ): GreeksProfile {
    return {
      delta: this.calculateDelta(stockPrice, strikePrice, timeToExpiry, volatility, optionType),
      gamma: this.calculateGamma(stockPrice, strikePrice, timeToExpiry, volatility),
      theta: this.calculateTheta(stockPrice, strikePrice, timeToExpiry, volatility, optionType),
      vega: this.calculateVega(stockPrice, strikePrice, timeToExpiry, volatility),
      rho: this.calculateRho(stockPrice, strikePrice, timeToExpiry, volatility, optionType)
    };
  }

  // Generate volatility surface
  generateVolatilitySurface(
    currentPrice: number,
    strikes: number[],
    expirations: string[]
  ): VolatilitySurface {
    const impliedVolatilities: number[][] = [];
    
    expirations.forEach((expiration, expIndex) => {
      const timeToExpiry = this.calculateTimeToExpiry(expiration);
      const volRow: number[] = [];
      
      strikes.forEach((strike, strikeIndex) => {
        // Generate realistic implied volatility smile
        const moneyness = strike / currentPrice;
        const baseVol = 0.2; // Base volatility
        
        // Volatility smile effect
        const smileEffect = 0.05 * Math.pow(moneyness - 1, 2);
        
        // Term structure effect
        const termEffect = 0.02 * Math.sqrt(timeToExpiry);
        
        // Add some randomness
        const randomEffect = (Math.random() - 0.5) * 0.02;
        
        const impliedVol = baseVol + smileEffect + termEffect + randomEffect;
        volRow.push(Math.max(0.05, impliedVol)); // Minimum 5% volatility
      });
      
      impliedVolatilities.push(volRow);
    });
    
    return {
      strikes,
      expirations,
      impliedVolatilities
    };
  }

  // VIX-like calculation from options data
  calculateVIX(optionsData: OptionsData[], currentPrice: number): number {
    if (optionsData.length === 0) return 0;
    
    // Filter for near-term options (30 days or less)
    const nearTermOptions = optionsData.filter(option => {
      const timeToExpiry = this.calculateTimeToExpiry(option.expiration);
      return timeToExpiry <= 30 / 365;
    });
    
    if (nearTermOptions.length === 0) return 0;
    
    // Calculate variance using VIX methodology
    let varianceSum = 0;
    let weightSum = 0;
    
    nearTermOptions.forEach(option => {
      const timeToExpiry = this.calculateTimeToExpiry(option.expiration);
      const strikeSpacing = 5; // Assume $5 strike spacing
      
      // Weight by time to expiry
      const weight = timeToExpiry;
      
      // Contribution to variance
      const contribution = (strikeSpacing / Math.pow(option.strike, 2)) * 
                          Math.exp(this.riskFreeRate * timeToExpiry) * 
                          option.impliedVolatility;
      
      varianceSum += weight * contribution;
      weightSum += weight;
    });
    
    if (weightSum === 0) return 0;
    
    const variance = varianceSum / weightSum;
    return Math.sqrt(variance) * 100; // Convert to percentage
  }

  // Helper methods
  private calculateD1(
    stockPrice: number,
    strikePrice: number,
    timeToExpiry: number,
    volatility: number
  ): number {
    const numerator = Math.log(stockPrice / strikePrice) + 
                     (this.riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry;
    const denominator = volatility * Math.sqrt(timeToExpiry);
    return numerator / denominator;
  }

  private normalCDF(x: number): number {
    // Approximation of the standard normal cumulative distribution function
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private calculateTimeToExpiry(expirationDate: string): number {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays / 365); // Convert to years
  }
}