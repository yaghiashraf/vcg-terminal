'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AdvancedRiskEngine, MarketData, RiskMetrics, MonteCarloResult } from '@/lib/models/RiskModels';
import { formatNumber, formatPercent, formatCurrency, getRiskColor } from '@/lib/utils';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, Target, Activity, BarChart3, PieChart, Zap } from 'lucide-react';

interface RiskDashboardProps {
  symbol: string;
  targetDecline: number;
  timeHorizon: number;
}

export const RiskDashboard: React.FC<RiskDashboardProps> = ({ 
  symbol, 
  targetDecline, 
  timeHorizon 
}) => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskEngine, setRiskEngine] = useState<AdvancedRiskEngine | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResult | null>(null);

  // Simulated market data - in production, this would come from your data provider
  const generateSimulatedData = (): MarketData[] => {
    const data: MarketData[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 252); // 1 year of data
    
    let currentPrice = 600;
    
    for (let i = 0; i < 252; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const volatility = 0.02;
      const drift = 0.0003;
      const change = (Math.random() - 0.5) * volatility + drift;
      
      currentPrice *= (1 + change);
      
      const high = currentPrice * (1 + Math.random() * 0.02);
      const low = currentPrice * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 50000000) + 10000000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: currentPrice,
        high,
        low,
        close: currentPrice,
        volume
      });
    }
    
    return data;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const data = generateSimulatedData();
      setMarketData(data);
      
      const engine = new AdvancedRiskEngine(data);
      setRiskEngine(engine);
      
      const metrics = engine.calculateAdvancedRiskMetrics();
      setRiskMetrics(metrics);
      
      const currentPrice = data[data.length - 1].close;
      const mcResults = engine.monteCarloSimulation(currentPrice, timeHorizon, 10000, targetDecline);
      setMonteCarloResults(mcResults);
      
      setLoading(false);
    };
    
    loadData();
  }, [symbol, targetDecline, timeHorizon]);

  const volatilityData = useMemo(() => {
    if (!riskEngine || !marketData.length) return [];
    
    const garch = riskEngine.calculateGARCH();
    return marketData.slice(-30).map((item, index) => ({
      date: item.date,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} variant="glass" className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-dark-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-dark-600 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPrice = marketData[marketData.length - 1]?.close || 0;
  const targetPrice = currentPrice * (1 - targetDecline);
  const declineNeeded = (currentPrice - targetPrice) / currentPrice;
  const probabilityOfDecline = monteCarloResults?.probabilities[0] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Risk Assessment Dashboard
          </h1>
          <p className="text-dark-400">
            Advanced quantitative analysis for {symbol} • Target decline: {formatPercent(targetDecline)} • Horizon: {timeHorizon} days
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(currentPrice)}</p>
              </div>
              <div className="p-3 bg-accent-500/10 rounded-full">
                <Activity className="h-6 w-6 text-accent-500" />
              </div>
            </div>
          </Card>

          <Card variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400 mb-1">Target Price</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(targetPrice)}</p>
              </div>
              <div className="p-3 bg-warning-500/10 rounded-full">
                <Target className="h-6 w-6 text-warning-500" />
              </div>
            </div>
          </Card>

          <Card variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400 mb-1">Decline Probability</p>
                <p className={`text-2xl font-bold ${getRiskColor(probabilityOfDecline, [0.2, 0.4])}`}>
                  {formatPercent(probabilityOfDecline)}
                </p>
              </div>
              <div className="p-3 bg-danger-500/10 rounded-full">
                <TrendingDown className="h-6 w-6 text-danger-500" />
              </div>
            </div>
          </Card>

          <Card variant="glass" hover className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-400 mb-1">VaR (95%)</p>
                <p className="text-2xl font-bold text-danger-500">
                  {formatPercent(riskMetrics?.var95 || 0)}
                </p>
              </div>
              <div className="p-3 bg-danger-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-danger-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Risk Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="glass-strong" className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-dark-400">VaR (99%)</p>
                    <p className="text-lg font-semibold text-danger-500">
                      {formatPercent(riskMetrics?.var99 || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Expected Shortfall</p>
                    <p className="text-lg font-semibold text-danger-500">
                      {formatPercent(riskMetrics?.expectedShortfall95 || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Volatility (Ann.)</p>
                    <p className="text-lg font-semibold text-accent-500">
                      {formatPercent(riskMetrics?.volatility || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Sharpe Ratio</p>
                    <p className="text-lg font-semibold text-success-500">
                      {formatNumber(riskMetrics?.sharpeRatio || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Skewness</p>
                    <p className="text-lg font-semibold text-warning-500">
                      {formatNumber(riskMetrics?.skewness || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Kurtosis</p>
                    <p className="text-lg font-semibold text-warning-500">
                      {formatNumber(riskMetrics?.kurtosis || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass-strong" className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Monte Carlo Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-dark-400">Expected Return</p>
                    <p className="text-lg font-semibold text-accent-500">
                      {formatCurrency(monteCarloResults?.expectedReturn || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Best Case</p>
                    <p className="text-lg font-semibold text-success-500">
                      {formatCurrency(monteCarloResults?.bestCase || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Worst Case</p>
                    <p className="text-lg font-semibold text-danger-500">
                      {formatCurrency(monteCarloResults?.worstCase || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">95% CI Range</p>
                    <p className="text-lg font-semibold text-warning-500">
                      {formatCurrency(monteCarloResults?.confidenceIntervals.ci95[1] - monteCarloResults?.confidenceIntervals.ci95[0] || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="glass-strong" className="p-6">
            <CardHeader>
              <CardTitle>GARCH Volatility Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volatilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volatility" 
                      stroke="#38bdf8" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass-strong" className="p-6">
            <CardHeader>
              <CardTitle>Price Distribution (Monte Carlo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="price" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="frequency" 
                      stroke="#38bdf8" 
                      fill="#38bdf8"
                      fillOpacity={0.3}
                    />
                    <ReferenceLine 
                      x={targetPrice} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      label="Target"
                    />
                    <ReferenceLine 
                      x={currentPrice} 
                      stroke="#10b981" 
                      strokeDasharray="5 5"
                      label="Current"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Assessment Summary */}
        <Card variant="glass-strong" className="p-6">
          <CardHeader>
            <CardTitle>Risk Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full ${getRiskColor(probabilityOfDecline, [0.2, 0.4])}`}>
                  <span className="text-sm font-medium">
                    {probabilityOfDecline > 0.4 ? 'High Risk' : probabilityOfDecline > 0.2 ? 'Medium Risk' : 'Low Risk'}
                  </span>
                </div>
                <p className="text-sm text-dark-400 mt-2">
                  Risk Level Assessment
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{formatNumber(timeHorizon)}</p>
                <p className="text-sm text-dark-400 mt-1">Days to Target</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-500">
                  {formatPercent(Math.abs(declineNeeded))}
                </p>
                <p className="text-sm text-dark-400 mt-1">Required Movement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};