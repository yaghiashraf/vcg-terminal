import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatPercent(num: number, decimals: number = 2): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

export function formatCurrency(num: number, decimals: number = 2): string {
  return `$${num.toFixed(decimals)}`;
}

export function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

export function getRiskColor(value: number, type: 'var' | 'volatility' | 'beta' | 'sharpe' | 'drawdown'): string {
  switch (type) {
    case 'var':
      if (value <= 0.02) return 'bg-green-500';
      if (value <= 0.05) return 'bg-yellow-500';
      return 'bg-red-500';
    case 'volatility':
      if (value <= 0.15) return 'bg-green-500';
      if (value <= 0.25) return 'bg-yellow-500';
      return 'bg-red-500';
    case 'beta':
      if (Math.abs(value - 1) <= 0.2) return 'bg-green-500';
      if (Math.abs(value - 1) <= 0.5) return 'bg-yellow-500';
      return 'bg-red-500';
    case 'sharpe':
      if (value >= 1.5) return 'bg-green-500';
      if (value >= 1.0) return 'bg-yellow-500';
      return 'bg-red-500';
    case 'drawdown':
      if (value <= 0.05) return 'bg-green-500';
      if (value <= 0.15) return 'bg-yellow-500';
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}