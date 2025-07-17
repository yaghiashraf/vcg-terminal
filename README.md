# Quantitative Risk Assessment Dashboard

A sophisticated risk assessment dashboard designed for quantitative prop trading firms. This application provides advanced statistical models, Monte Carlo simulations, and real-time market analysis with a modern dark mode interface.

## Features

### Advanced Risk Models
- **GARCH(1,1) Volatility Modeling**: Dynamic volatility forecasting using GARCH models
- **Value at Risk (VaR)**: Parametric and historical VaR calculations at 95% and 99% confidence levels
- **Expected Shortfall**: Conditional VaR for tail risk assessment
- **Monte Carlo Simulation**: 10,000+ scenario simulations for probability analysis

### Statistical Analysis
- **Skewness & Kurtosis**: Higher moment analysis for distribution characteristics
- **Sharpe Ratio**: Risk-adjusted return calculations
- **Maximum Drawdown**: Historical peak-to-trough analysis
- **Beta & Alpha**: Market correlation and excess return metrics

### Volume Profile Analysis
- **Point of Control (POC)**: Highest volume price levels
- **Value Area**: 70% volume concentration zones
- **Volume Distribution**: Price-volume relationship analysis

### Options Analytics
- **Black-Scholes Pricing**: European options pricing model
- **Greeks Calculation**: Delta, Gamma, Theta, Vega, Rho
- **Implied Volatility**: Newton-Raphson method for IV calculation
- **Volatility Surface**: Multi-dimensional volatility visualization
- **VIX-like Calculation**: Market volatility index computation

### Modern UI/UX
- **Dark Mode Design**: Professional trading interface
- **Glassmorphism Effects**: Modern visual aesthetics
- **Real-time Updates**: Live data integration
- **Interactive Charts**: Advanced data visualization
- **Risk Color Coding**: Intuitive risk level indicators

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Custom CSS
- **Charts**: Recharts, D3.js
- **Mathematics**: MathJS, Simple Statistics, ML-Matrix
- **Analytics**: Custom risk models and statistical engines

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd risk_dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js app router
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── RiskDashboard.tsx # Main dashboard component
├── lib/
│   ├── models/           # Risk and options models
│   ├── api/              # Data services
│   └── utils.ts          # Utility functions
└── styles/               # Global styles
```

## Risk Models

### GARCH(1,1) Model
Implements the Generalized Autoregressive Conditional Heteroskedasticity model for volatility forecasting:
```
σ²(t) = ω + α·r²(t-1) + β·σ²(t-1)
```

### Value at Risk (VaR)
Calculates both parametric and historical VaR:
- Parametric: Uses normal distribution assumption
- Historical: Based on historical return distribution

### Monte Carlo Simulation
Geometric Brownian Motion simulation for price paths:
```
dS = μ·S·dt + σ·S·dW
```

## Configuration

The dashboard can be configured for different symbols and risk parameters:

```typescript
<RiskDashboard 
  symbol="SPY" 
  targetDecline={0.05}  // 5% decline threshold
  timeHorizon={40}      // 40-day time horizon
/>
```

## Data Sources

Currently uses simulated market data for demonstration. In production, integrate with:
- Yahoo Finance API
- Bloomberg API
- Alpha Vantage
- IEX Cloud
- Your proprietary data feeds

## Performance Optimization

- **Memoization**: React.useMemo for expensive calculations
- **Data Caching**: 5-minute cache for market data
- **Lazy Loading**: Component-based code splitting
- **Debounced Updates**: Throttled real-time data updates

## Risk Metrics Explained

### Value at Risk (VaR)
Maximum expected loss at a given confidence level over a specific time period.

### Expected Shortfall (ES)
Average loss beyond the VaR threshold, providing better tail risk assessment.

### GARCH Volatility
Time-varying volatility model that captures volatility clustering in financial markets.

### Greeks
- **Delta**: Price sensitivity to underlying asset
- **Gamma**: Rate of change of Delta
- **Theta**: Time decay effect
- **Vega**: Volatility sensitivity
- **Rho**: Interest rate sensitivity

## Customization

### Adding New Risk Models
1. Create model in `src/lib/models/`
2. Import in `RiskDashboard.tsx`
3. Add UI components for visualization

### Styling
- Modify `tailwind.config.js` for theme changes
- Update CSS variables in `globals.css`
- Customize color schemes in theme configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software designed for quantitative trading firms.

## Disclaimer

This software is for educational and professional use only. Always validate risk calculations with multiple sources and consult with risk management professionals before making trading decisions.