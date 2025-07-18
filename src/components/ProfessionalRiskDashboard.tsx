'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Terminal, TerminalOutput, TerminalCommand } from '@/components/ui/Terminal';
import { Controls } from '@/components/ui/Controls';
import { AdvancedRiskEngine, MarketData, RiskMetrics, MonteCarloResult } from '@/lib/models/RiskModels';
import { marketDataService } from '@/lib/api/marketData';
import { formatNumber, formatPercent, formatCurrency, getRiskColor, formatLargeNumber } from '@/lib/utils';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, Target, Activity, BarChart3, Shield, Zap, Database, Clock, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Client-side time display component
const TimeDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  return <span>{currentTime || '--:--:--'} EST</span>;
};

interface AnalysisParams {
  symbol: string;
  projectionDays: number;
  period: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
}

interface PriceProjection {
  timeframe: string;
  bullish: number;
  bearish: number;
  neutral: number;
  probability: {
    up: number;
    down: number;
    neutral: number;
  };
}

export const ProfessionalRiskDashboard: React.FC = () => {
  const [params, setParams] = useState<AnalysisParams>({
    symbol: 'SPY',
    projectionDays: 30,
    period: '1y'
  });
  
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<MarketData[]>([]);
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [riskEngine, setRiskEngine] = useState<AdvancedRiskEngine | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [priceProjections, setPriceProjections] = useState<PriceProjection[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<Array<{ command: string; timestamp: Date; type: 'info' | 'success' | 'error' }>>([]);
  const [realTimePrice, setRealTimePrice] = useState<number | null>(null);

  const addTerminalLog = (command: string, type: 'info' | 'success' | 'error' = 'info') => {
    setTerminalLogs(prev => [...prev, { command, timestamp: new Date(), type }]);
  };

  const runAnalysis = async (newParams: AnalysisParams) => {
    setLoading(true);
    setParams(newParams);
    
    try {
      addTerminalLog(`Initializing price projection analysis for ${newParams.symbol}...`, 'info');
      
      // Fetch current quote
      addTerminalLog('Fetching real-time market data...', 'info');
      const quote = await marketDataService.getCurrentQuote(newParams.symbol);
      if (!quote) {
        throw new Error('Failed to fetch current quote');
      }
      setCurrentQuote(quote);
      setRealTimePrice(quote.price);
      addTerminalLog(`Current price: $${quote.price.toFixed(2)}`, 'success');
      
      // Fetch historical data
      addTerminalLog(`Loading ${newParams.period} historical data...`, 'info');
      const data = await marketDataService.getHistoricalData(newParams.symbol, newParams.period);
      if (data.length === 0) {
        throw new Error('No historical data available');
      }
      setMarketData(data);
      addTerminalLog(`Loaded ${data.length} data points`, 'success');
      
      // Fetch benchmark data (SPY) for beta calculation
      addTerminalLog('Loading benchmark data (SPY)...', 'info');
      const benchmarkSymbol = newParams.symbol.toUpperCase() === 'SPY' ? 'QQQ' : 'SPY';
      const spyData = await marketDataService.getHistoricalData(benchmarkSymbol, newParams.period);
      setBenchmarkData(spyData);
      addTerminalLog(`Loaded ${spyData.length} benchmark data points`, 'success');
      
      // Initialize risk engine
      addTerminalLog('Initializing advanced risk models...', 'info');
      const engine = new AdvancedRiskEngine(data);
      setRiskEngine(engine);
      
      // Calculate risk metrics with benchmark data
      addTerminalLog('Computing GARCH volatility model...', 'info');
      const benchmarkEngine = new AdvancedRiskEngine(spyData);
      const benchmarkReturns = benchmarkEngine.getReturns();
      const metrics = engine.calculateAdvancedRiskMetrics(benchmarkReturns);
      setRiskMetrics(metrics);
      addTerminalLog(`VaR(95%): ${formatPercent(metrics.var95)}`, 'success');
      addTerminalLog(`Beta: ${formatNumber(metrics.beta, 2)}`, 'success');
      
      // Generate price projections
      addTerminalLog('Generating price projections...', 'info');
      const projections = generatePriceProjections(quote.price, metrics, newParams.projectionDays);
      setPriceProjections(projections);
      addTerminalLog(`Generated projections for ${projections.length} timeframes`, 'success');
      
      addTerminalLog('Analysis complete. Projections displayed below.', 'success');
      toast.success('Price projection analysis completed successfully');
      
    } catch (error) {
      console.error('Analysis error:', error);
      addTerminalLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      toast.error('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePriceProjections = (currentPrice: number, metrics: RiskMetrics, days: number): PriceProjection[] => {
    const timeframes = [
      { days: 1, label: '1 Day' },
      { days: 7, label: '7 Days' },
      { days: 30, label: '30 Days' }
    ];

    return timeframes.map(tf => {
      const volatility = metrics.volatility;
      const drift = 0.0002; // Small positive drift
      const timeScaling = Math.sqrt(tf.days / 252);
      
      const bullishMove = drift + volatility * timeScaling * 1.5;
      const bearishMove = drift - volatility * timeScaling * 1.5;
      const neutralMove = drift;
      
      return {
        timeframe: tf.label,
        bullish: currentPrice * (1 + bullishMove),
        bearish: currentPrice * (1 + bearishMove),
        neutral: currentPrice * (1 + neutralMove),
        probability: {
          up: Math.max(0.15, 0.4 - metrics.skewness * 0.1),
          down: Math.max(0.15, 0.35 + metrics.skewness * 0.1),
          neutral: 0.25
        }
      };
    });
  };

  // Real-time price updates
  useEffect(() => {
    if (!params.symbol || !currentQuote) return;
    
    const unsubscribe = marketDataService.subscribeToRealTimeData(params.symbol, (quote) => {
      setRealTimePrice(quote.price);
    });
    
    return unsubscribe;
  }, [params.symbol, currentQuote]);

  // Initial load
  useEffect(() => {
    runAnalysis(params);
  }, []);

  const volatilityData = useMemo(() => {
    if (!riskEngine || !marketData.length) return [];
    
    const garch = riskEngine.calculateGARCH();
    return marketData.slice(-30).map((item, index) => ({
      date: new Date(item.date).toLocaleDateString(),
      price: item.close,
      volatility: garch.volatility[marketData.length - 30 + index] * 100,
      returns: index > 0 ? ((item.close - marketData[marketData.length - 30 + index - 1].close) / marketData[marketData.length - 30 + index - 1].close) * 100 : 0
    }));
  }, [riskEngine, marketData]);

  const projectionChartData = useMemo(() => {
    if (!priceProjections.length) return [];
    
    return priceProjections.map(proj => ({
      timeframe: proj.timeframe,
      bullish: proj.bullish,
      current: realTimePrice || currentQuote?.price || 0,
      bearish: proj.bearish,
      neutral: proj.neutral
    }));
  }, [priceProjections, realTimePrice, currentQuote]);

  const currentPrice = realTimePrice || currentQuote?.price || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">V</span>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-blue-400">VORTEX CAPITAL GROUP</h2>
                  <p className="text-xs text-gray-400">Risk Analysis Terminal</p>
                </div>
              </div>
              <div className="h-8 w-px bg-blue-400/30"></div>
              <div>
                <h1 className="text-2xl font-bold text-blue-400">
                  PRICE PROJECTION ANALYSIS TERMINAL
                </h1>
                <p className="text-sm text-gray-400">
                  Advanced Statistical Models • Real-time Market Data • Monte Carlo Simulation
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">MARKET ANALYSIS</div>
              <div className="text-xs text-gray-500">
                <TimeDisplay />
              </div>
            </div>
          </div>
        </div>

        {/* Controls and Analysis Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <Controls
              onAnalyze={runAnalysis}
              loading={loading}
              defaultValues={params}
            />
          </div>
          
          <Terminal title="ANALYSIS LOG" className="h-96 overflow-y-auto">
            <div className="space-y-2">
              {terminalLogs.map((log, index) => (
                <div key={index}>
                  <TerminalCommand command={log.command} timestamp={log.timestamp} />
                  <TerminalOutput type={log.type}>
                    {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : '•'} {log.command}
                  </TerminalOutput>
                </div>
              ))}
              {loading && (
                <TerminalOutput type="info">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                </TerminalOutput>
              )}
            </div>
          </Terminal>
        </div>

        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="professional-metric">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">CURRENT PRICE</p>
                  <p className="text-xl font-bold text-green-400 font-mono">
                    ${formatNumber(currentPrice, 2)}
                  </p>
                  {currentQuote && (
                    <p className={`text-xs ${currentQuote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentQuote.change >= 0 ? '+' : ''}{formatNumber(currentQuote.change, 2)} ({currentQuote.changePercent}%)
                    </p>
                  )}
                </div>
                <Activity className="h-8 w-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">VOLATILITY</p>
                  <p className="text-xl font-bold text-blue-400 font-mono">
                    {formatPercent(riskMetrics?.volatility || 0)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Annualized
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">BETA</p>
                  <p className="text-xl font-bold text-purple-400 font-mono">
                    {formatNumber(riskMetrics?.beta || 1, 2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Market correlation
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">VaR (95%)</p>
                  <p className="text-xl font-bold text-red-400 font-mono">
                    {formatPercent(riskMetrics?.var95 || 0)}
                  </p>
                  <p className="text-xs text-gray-400">
                    1-day horizon
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Projections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Target className="h-5 w-5" />
                PRICE PROJECTIONS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceProjections.map((proj, index) => (
                  <div key={index} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-300">{proj.timeframe}</h4>
                      <span className="text-xs text-gray-500">Current: ${formatNumber(currentPrice, 2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-green-400 font-mono">${formatNumber(proj.bullish, 2)}</p>
                        <p className="text-xs text-gray-400">Bullish</p>
                        <p className="text-xs text-green-400">{formatPercent(proj.probability.up)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-400 font-mono">${formatNumber(proj.neutral, 2)}</p>
                        <p className="text-xs text-gray-400">Neutral</p>
                        <p className="text-xs text-yellow-400">{formatPercent(proj.probability.neutral)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-400 font-mono">${formatNumber(proj.bearish, 2)}</p>
                        <p className="text-xs text-gray-400">Bearish</p>
                        <p className="text-xs text-red-400">{formatPercent(proj.probability.down)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">PROJECTION CHART</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="timeframe" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e14', 
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
                        color: '#00ff41'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bullish" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                      name="Bullish"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="neutral" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b' }}
                      name="Neutral"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bearish" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444' }}
                      name="Bearish"
                    />
                    <ReferenceLine 
                      y={currentPrice} 
                      stroke="#00ff41" 
                      strokeDasharray="5 5"
                      label={{ value: "Current", position: "top" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                ADVANCED RISK METRICS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">VaR (99%)</p>
                  <p className="text-red-400 font-mono font-bold">
                    {formatPercent(riskMetrics?.var99 || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Expected Shortfall</p>
                  <p className="text-red-400 font-mono font-bold">
                    {formatPercent(riskMetrics?.expectedShortfall95 || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Sharpe Ratio</p>
                  <p className="text-green-400 font-mono font-bold">
                    {formatNumber(riskMetrics?.sharpeRatio || 0, 3)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Max Drawdown</p>
                  <p className="text-yellow-400 font-mono font-bold">
                    {formatPercent(riskMetrics?.maxDrawdown || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Skewness</p>
                  <p className="text-blue-400 font-mono font-bold">
                    {formatNumber(riskMetrics?.skewness || 0, 3)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Kurtosis</p>
                  <p className="text-purple-400 font-mono font-bold">
                    {formatNumber(riskMetrics?.kurtosis || 0, 3)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Database className="h-5 w-5" />
                MARKET INTELLIGENCE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Cap:</span>
                  <span className="text-green-400 font-mono">
                    {currentQuote?.marketCap ? formatLargeNumber(currentQuote.marketCap) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">P/E Ratio:</span>
                  <span className="text-green-400 font-mono">
                    {currentQuote?.peRatio ? formatNumber(currentQuote.peRatio, 2) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume:</span>
                  <span className="text-green-400 font-mono">
                    {currentQuote?.volume ? formatLargeNumber(currentQuote.volume) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Day Range:</span>
                  <span className="text-green-400 font-mono">
                    {currentQuote ? `${formatCurrency(currentQuote.low)} - ${formatCurrency(currentQuote.high)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                POSITION ANALYSIS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Size:</span>
                  <span className="text-green-400 font-mono">
                    100 shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capital Invested:</span>
                  <span className="text-blue-400 font-mono">
                    {formatCurrency(100 * currentPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily VaR:</span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(100 * currentPrice * (riskMetrics?.var95 || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Score:</span>
                  <span className={`font-mono ${
                    (riskMetrics?.var95 || 0) > 0.05 ? 'text-red-400' : 
                    (riskMetrics?.var95 || 0) > 0.02 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {(riskMetrics?.var95 || 0) > 0.05 ? 'HIGH' : 
                     (riskMetrics?.var95 || 0) > 0.02 ? 'MEDIUM' : 'LOW'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">GARCH VOLATILITY MODEL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e14', 
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
                        color: '#00ff41'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volatility" 
                      stroke="#00ff41" 
                      strokeWidth={2}
                      dot={false}
                      name="Volatility %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">PRICE MOMENTUM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e14', 
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
                        color: '#00ff41'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Price"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="returns" 
                      stroke="#f59e0b" 
                      strokeWidth={1}
                      dot={false}
                      name="Returns %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};