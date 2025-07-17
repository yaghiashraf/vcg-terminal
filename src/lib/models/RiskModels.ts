import { Matrix } from 'ml-matrix';
import { mean, standardDeviation, variance, quantile } from 'simple-statistics';
import { evaluate } from 'mathjs';

export interface MarketData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall95: number;
  expectedShortfall99: number;
  volatility: number;
  skewness: number;
  kurtosis: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
}

export interface VolumeProfile {
  priceLevel: number;
  volume: number;
  percentage: number;
  poc: boolean; // Point of Control
  valueAreaHigh: number;
  valueAreaLow: number;
}

export interface MonteCarloResult {
  scenarios: number[];
  probabilities: number[];
  confidenceIntervals: {
    ci95: [number, number];
    ci99: [number, number];
  };
  expectedReturn: number;
  worstCase: number;
  bestCase: number;
}

export class AdvancedRiskEngine {
  private data: MarketData[];
  private returns: number[];
  private logReturns: number[];

  constructor(data: MarketData[]) {
    this.data = data;
    this.returns = this.calculateReturns();
    this.logReturns = this.calculateLogReturns();
  }

  private calculateReturns(): number[] {
    const returns: number[] = [];
    for (let i = 1; i < this.data.length; i++) {
      const ret = (this.data[i].close - this.data[i - 1].close) / this.data[i - 1].close;
      returns.push(ret);
    }
    return returns;
  }

  private calculateLogReturns(): number[] {
    const logReturns: number[] = [];
    for (let i = 1; i < this.data.length; i++) {
      const logRet = Math.log(this.data[i].close / this.data[i - 1].close);
      logReturns.push(logRet);
    }
    return logReturns;
  }

  // GARCH(1,1) Model Implementation
  calculateGARCH(): { volatility: number[]; forecast: number } {
    const returns = this.returns;
    const n = returns.length;
    
    // Initial parameters
    let omega = 0.00001;
    let alpha = 0.08;
    let beta = 0.91;
    
    const volatility: number[] = [];
    let conditionalVariance = variance(returns);
    
    // GARCH iteration
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        volatility.push(Math.sqrt(conditionalVariance));
      } else {
        conditionalVariance = omega + alpha * Math.pow(returns[i - 1], 2) + beta * conditionalVariance;
        volatility.push(Math.sqrt(conditionalVariance));
      }
    }
    
    // Forecast next period volatility
    const lastReturn = returns[n - 1];
    const forecast = Math.sqrt(omega + alpha * Math.pow(lastReturn, 2) + beta * conditionalVariance);
    
    return { volatility, forecast };
  }

  // Value at Risk calculations
  calculateVaR(confidenceLevel: number, horizon: number = 1): number {
    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const index = Math.floor(alpha * sortedReturns.length);
    
    // Parametric VaR
    const meanReturn = mean(this.returns);
    const stdDev = standardDeviation(this.returns);
    const zScore = this.inverseNormal(confidenceLevel);
    
    const parametricVaR = -(meanReturn + zScore * stdDev) * Math.sqrt(horizon);
    
    // Historical VaR
    const historicalVaR = -sortedReturns[index];
    
    return Math.max(parametricVaR, historicalVaR);
  }

  // Expected Shortfall (Conditional VaR)
  calculateExpectedShortfall(confidenceLevel: number): number {
    const sortedReturns = [...this.returns].sort((a, b) => a - b);
    const alpha = 1 - confidenceLevel;
    const cutoff = Math.floor(alpha * sortedReturns.length);
    
    const tailReturns = sortedReturns.slice(0, cutoff);
    return -mean(tailReturns);
  }

  // Monte Carlo simulation for price paths
  monteCarloSimulation(
    currentPrice: number,
    days: number,
    simulations: number = 10000,
    targetDecline: number
  ): MonteCarloResult {
    const mu = mean(this.returns);
    const sigma = standardDeviation(this.returns);
    const dt = 1 / 252; // Daily time step
    
    const finalPrices: number[] = [];
    
    for (let sim = 0; sim < simulations; sim++) {
      let price = currentPrice;
      
      for (let day = 0; day < days; day++) {
        const randomShock = this.boxMullerRandom();
        const drift = (mu - 0.5 * sigma * sigma) * dt;
        const diffusion = sigma * Math.sqrt(dt) * randomShock;
        
        price *= Math.exp(drift + diffusion);
      }
      
      finalPrices.push(price);
    }
    
    finalPrices.sort((a, b) => a - b);
    
    const targetPrice = currentPrice * (1 - targetDecline);
    const belowTarget = finalPrices.filter(p => p < targetPrice).length;
    const probability = belowTarget / simulations;
    
    return {
      scenarios: finalPrices,
      probabilities: [probability, 1 - probability],
      confidenceIntervals: {
        ci95: [
          finalPrices[Math.floor(0.025 * simulations)],
          finalPrices[Math.floor(0.975 * simulations)]
        ],
        ci99: [
          finalPrices[Math.floor(0.005 * simulations)],
          finalPrices[Math.floor(0.995 * simulations)]
        ]
      },
      expectedReturn: mean(finalPrices),
      worstCase: finalPrices[0],
      bestCase: finalPrices[finalPrices.length - 1]
    };
  }

  // Volume Profile Analysis
  calculateVolumeProfile(priceLevels: number = 100): VolumeProfile[] {
    const priceRange = Math.max(...this.data.map(d => d.high)) - Math.min(...this.data.map(d => d.low));
    const minPrice = Math.min(...this.data.map(d => d.low));
    const levelSize = priceRange / priceLevels;
    
    const volumeByLevel: { [key: number]: number } = {};
    
    // Aggregate volume by price level
    this.data.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const level = Math.floor((typicalPrice - minPrice) / levelSize);
      volumeByLevel[level] = (volumeByLevel[level] || 0) + candle.volume;
    });
    
    const totalVolume = Object.values(volumeByLevel).reduce((sum, vol) => sum + vol, 0);
    
    // Find Point of Control (highest volume level)
    const pocLevel = Object.keys(volumeByLevel).reduce((a, b) => 
      volumeByLevel[parseInt(a)] > volumeByLevel[parseInt(b)] ? a : b
    );
    
    // Calculate Value Area (70% of volume)
    const sortedLevels = Object.keys(volumeByLevel)
      .map(level => parseInt(level))
      .sort((a, b) => volumeByLevel[b] - volumeByLevel[a]);
    
    let valueAreaVolume = 0;
    const valueAreaLevels: number[] = [];
    
    for (const level of sortedLevels) {
      valueAreaVolume += volumeByLevel[level];
      valueAreaLevels.push(level);
      if (valueAreaVolume >= totalVolume * 0.7) break;
    }
    
    const valueAreaHigh = Math.max(...valueAreaLevels) * levelSize + minPrice;
    const valueAreaLow = Math.min(...valueAreaLevels) * levelSize + minPrice;
    
    return Object.keys(volumeByLevel).map(level => ({
      priceLevel: parseInt(level) * levelSize + minPrice,
      volume: volumeByLevel[parseInt(level)],
      percentage: (volumeByLevel[parseInt(level)] / totalVolume) * 100,
      poc: level === pocLevel,
      valueAreaHigh,
      valueAreaLow
    }));
  }

  // Advanced risk metrics calculation
  calculateAdvancedRiskMetrics(benchmarkReturns?: number[]): RiskMetrics {
    const returns = this.returns;
    const meanReturn = mean(returns);
    const vol = standardDeviation(returns);
    
    // Skewness calculation
    const skewness = this.calculateSkewness(returns);
    
    // Kurtosis calculation
    const kurtosis = this.calculateKurtosis(returns);
    
    // Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02 / 252; // Daily risk-free rate
    const excessReturns = returns.map(r => r - riskFreeRate);
    const sharpeRatio = mean(excessReturns) / standardDeviation(excessReturns);
    
    // Maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown();
    
    // Beta and Alpha (if benchmark provided)
    let beta = 1;
    let alpha = 0;
    
    if (benchmarkReturns && benchmarkReturns.length === returns.length) {
      const covariance = this.calculateCovariance(returns, benchmarkReturns);
      const benchmarkVariance = variance(benchmarkReturns);
      beta = covariance / benchmarkVariance;
      alpha = meanReturn - beta * mean(benchmarkReturns);
    }
    
    return {
      var95: this.calculateVaR(0.95),
      var99: this.calculateVaR(0.99),
      expectedShortfall95: this.calculateExpectedShortfall(0.95),
      expectedShortfall99: this.calculateExpectedShortfall(0.99),
      volatility: vol * Math.sqrt(252), // Annualized
      skewness,
      kurtosis,
      sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
      maxDrawdown,
      beta,
      alpha: alpha * 252 // Annualized
    };
  }

  // Helper methods
  private boxMullerRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private inverseNormal(p: number): number {
    // Approximation of inverse normal distribution
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
             ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }
    
    if (p <= pHigh) {
      const q = p - 0.5;
      const r = q * q;
      return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
             (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    }
    
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
            ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
  }

  private calculateSkewness(data: number[]): number {
    const n = data.length;
    const meanVal = mean(data);
    const stdDev = standardDeviation(data);
    
    const skewSum = data.reduce((sum, val) => {
      return sum + Math.pow((val - meanVal) / stdDev, 3);
    }, 0);
    
    return (n / ((n - 1) * (n - 2))) * skewSum;
  }

  private calculateKurtosis(data: number[]): number {
    const n = data.length;
    const meanVal = mean(data);
    const stdDev = standardDeviation(data);
    
    const kurtSum = data.reduce((sum, val) => {
      return sum + Math.pow((val - meanVal) / stdDev, 4);
    }, 0);
    
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum - 3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));
  }

  private calculateMaxDrawdown(): number {
    const cumulativeReturns = this.returns.reduce((acc, ret, i) => {
      if (i === 0) {
        acc.push(1 + ret);
      } else {
        acc.push(acc[i - 1] * (1 + ret));
      }
      return acc;
    }, [] as number[]);
    
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];
    
    for (let i = 1; i < cumulativeReturns.length; i++) {
      if (cumulativeReturns[i] > peak) {
        peak = cumulativeReturns[i];
      }
      const drawdown = (peak - cumulativeReturns[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private calculateCovariance(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = mean(x);
    const meanY = mean(y);
    
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (n - 1);
  }
}