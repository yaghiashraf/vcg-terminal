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
import Image from 'next/image';

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
  targetDecline: number;
  timeHorizon: number;
  period: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
}

export const ProfessionalRiskDashboard: React.FC = () => {
  const [params, setParams] = useState<AnalysisParams>({
    symbol: 'SPY',
    targetDecline: 0.05,
    timeHorizon: 40,
    period: '1y'
  });
  
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<MarketData[]>([]);
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [riskEngine, setRiskEngine] = useState<AdvancedRiskEngine | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResult | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<Array<{ command: string; timestamp: Date; type: 'info' | 'success' | 'error' }>>([]);
  const [realTimePrice, setRealTimePrice] = useState<number | null>(null);

  const addTerminalLog = (command: string, type: 'info' | 'success' | 'error' = 'info') => {
    setTerminalLogs(prev => [...prev, { command, timestamp: new Date(), type }]);
  };

  const runAnalysis = async (newParams: AnalysisParams) => {
    setLoading(true);
    setParams(newParams);
    
    try {
      addTerminalLog(`Initializing risk analysis for ${newParams.symbol}...`, 'info');
      
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
      
      // Run Monte Carlo simulation
      addTerminalLog('Running Monte Carlo simulation (10,000 scenarios)...', 'info');
      const mcResults = engine.monteCarloSimulation(
        quote.price, 
        newParams.timeHorizon, 
        10000, 
        newParams.targetDecline
      );
      setMonteCarloResults(mcResults);
      addTerminalLog(`Probability of decline: ${formatPercent(mcResults.probabilities[0])}`, 'success');
      
      addTerminalLog('Analysis complete. Results displayed below.', 'success');
      toast.success('Risk analysis completed successfully');
      
    } catch (error) {
      console.error('Analysis error:', error);
      addTerminalLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      toast.error('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const distributionData = useMemo(() => {
    if (!monteCarloResults) return [];
    
    const scenarios = monteCarloResults.scenarios;
    const bins = 50;
    const min = Math.min(...scenarios);
    const max = Math.max(...scenarios);
    const binSize = (max - min) / bins;
    
    const histogram = Array(bins).fill(0);
    scenarios.forEach(scenario => {
      const binIndex = Math.min(Math.floor((scenario - min) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    return histogram.map((count, index) => ({
      price: min + (index + 0.5) * binSize,
      frequency: count,
      probability: count / scenarios.length
    }));
  }, [monteCarloResults]);

  const currentPrice = realTimePrice || currentQuote?.price || 0;
  const targetPrice = currentPrice * (1 - params.targetDecline);
  const probabilityOfDecline = monteCarloResults?.probabilities[0] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Image
                src="/vortex-logo.png"
                alt="Vortex Capital Group"
                width={200}
                height={60}
                className="h-12 w-auto"
                priority
              />
              <div className="h-8 w-px bg-green-400/30"></div>
              <div>
                <h1 className="text-2xl font-bold text-green-400">
                  QUANTITATIVE RISK ANALYSIS TERMINAL
                </h1>
                <p className="text-sm text-gray-400">
                  Advanced Statistical Models • Real-time Market Data • Monte Carlo Simulation
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">VORTEX CAPITAL GROUP</div>
              <div className="text-xs text-gray-500">
                <TimeDisplay />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6">
          <Controls
            onAnalyze={runAnalysis}
            loading={loading}
            defaultValues={params}
          />
        </div>

        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
                  <p className="text-xs text-gray-400 mb-1">TARGET PRICE</p>
                  <p className="text-xl font-bold text-yellow-400 font-mono">
                    ${formatNumber(targetPrice, 2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatPercent(params.targetDecline)} decline
                  </p>
                </div>
                <Target className="h-8 w-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">DECLINE PROBABILITY</p>
                  <p className={`text-xl font-bold font-mono ${probabilityOfDecline > 0.4 ? 'text-red-400' : probabilityOfDecline > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {formatPercent(probabilityOfDecline)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {params.timeHorizon} day horizon
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-400/50" />
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
        </div>

        {/* Terminal and Advanced Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
        </div>

        {/* Additional Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                <Clock className="h-5 w-5" />
                RISK SCENARIOS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Best Case (95%):</span>
                  <span className="text-green-400 font-mono">
                    {formatCurrency(monteCarloResults?.confidenceIntervals.ci95[1] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Worst Case (95%):</span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(monteCarloResults?.confidenceIntervals.ci95[0] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Best Case (99%):</span>
                  <span className="text-green-400 font-mono">
                    {formatCurrency(monteCarloResults?.confidenceIntervals.ci99[1] || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Worst Case (99%):</span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(monteCarloResults?.confidenceIntervals.ci99[0] || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                PROFIT/LOSS ANALYSIS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Potential Loss:</span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(Math.abs(targetPrice - currentPrice))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk/Reward:</span>
                  <span className="text-yellow-400 font-mono">
                    {formatNumber(params.targetDecline / (riskMetrics?.volatility || 0.1) * 100, 2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Position Size:</span>
                  <span className="text-green-400 font-mono">
                    {formatNumber(10000 / currentPrice, 0)} shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capital at Risk:</span>
                  <span className="text-red-400 font-mono">
                    {formatCurrency(10000 * params.targetDecline)}
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
              <CardTitle className="text-green-400">MONTE CARLO DISTRIBUTION</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="price" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e14', 
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
                        color: '#00ff41'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="frequency" 
                      stroke="#00ff41" 
                      fill="#00ff41"
                      fillOpacity={0.3}
                      name="Frequency"
                    />
                    <ReferenceLine 
                      x={targetPrice} 
                      stroke="#ff3333" 
                      strokeDasharray="5 5"
                      label={{ value: "Target", position: "top" }}
                    />
                    <ReferenceLine 
                      x={currentPrice} 
                      stroke="#00ff41" 
                      strokeDasharray="5 5"
                      label={{ value: "Current", position: "top" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Advanced Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">PRICE MOMENTUM & RETURNS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
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

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">RISK METRICS HEATMAP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">VaR 95%</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-2 rounded ${getRiskColor(riskMetrics?.var95 || 0, 'var')}`}></div>
                    <span className="text-xs font-mono">{formatPercent(riskMetrics?.var95 || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Volatility</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-2 rounded ${getRiskColor(riskMetrics?.volatility || 0, 'volatility')}`}></div>
                    <span className="text-xs font-mono">{formatPercent(riskMetrics?.volatility || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Beta</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-2 rounded ${getRiskColor(riskMetrics?.beta || 1, 'beta')}`}></div>
                    <span className="text-xs font-mono">{formatNumber(riskMetrics?.beta || 1, 2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Sharpe Ratio</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-2 rounded ${getRiskColor(riskMetrics?.sharpeRatio || 0, 'sharpe')}`}></div>
                    <span className="text-xs font-mono">{formatNumber(riskMetrics?.sharpeRatio || 0, 2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Max Drawdown</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-2 rounded ${getRiskColor(riskMetrics?.maxDrawdown || 0, 'drawdown')}`}></div>
                    <span className="text-xs font-mono">{formatPercent(riskMetrics?.maxDrawdown || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="professional-metric">
            <CardHeader>
              <CardTitle className="text-green-400">PROBABILITY ANALYSIS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { scenario: 'Bull (+15%)', probability: 0.25, color: '#10b981' },
                    { scenario: 'Neutral (±5%)', probability: 0.50, color: '#f59e0b' },
                    { scenario: 'Bear (-15%)', probability: 0.25, color: '#ef4444' },
                    { scenario: `Target (${formatPercent(params.targetDecline)})`, probability: probabilityOfDecline, color: '#8b5cf6' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="scenario" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0e14', 
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
                        color: '#00ff41'
                      }} 
                    />
                    <Bar 
                      dataKey="probability" 
                      fill="#00ff41"
                      radius={[4, 4, 0, 0]}
                      name="Probability"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="professional-metric">
          <CardHeader>
            <CardTitle className="text-green-400">RISK ASSESSMENT SUMMARY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  probabilityOfDecline > 0.4 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  probabilityOfDecline > 0.2 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  {probabilityOfDecline > 0.4 ? 'HIGH RISK' : probabilityOfDecline > 0.2 ? 'MEDIUM RISK' : 'LOW RISK'}
                </div>
                <p className="text-xs text-gray-400 mt-2">Risk Classification</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400 font-mono">
                  {formatNumber(params.timeHorizon)}
                </p>
                <p className="text-xs text-gray-400">Days to Analysis Date</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400 font-mono">
                  {formatPercent(params.targetDecline)}
                </p>
                <p className="text-xs text-gray-400">Required Decline</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400 font-mono">
                  {formatCurrency(monteCarloResults?.expectedReturn || 0)}
                </p>
                <p className="text-xs text-gray-400">Expected Price</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};