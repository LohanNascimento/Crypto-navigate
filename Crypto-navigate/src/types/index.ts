// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  settings?: UserSettings;
  apiKeys?: {
    binanceApiKey: string;
    binanceSecretKey: string;
  };
}

export interface UserSettings {
  theme?: 'light' | 'dark';
  notificationSettings?: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  tradingLimits?: {
    maxTradeSize: number;
    maxDailyLoss: number;
    maxOpenTrades: number;
  };
}

// Trade types
export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  quantity: number;
  price: number;
  entryPrice: number;
  entryTime: string;
  exitPrice?: number;
  exitTime?: string;
  type: 'MARKET' | 'LIMIT';
  profit?: number;
  profitPercentage?: number;
  timestamp: number;
  leverage?: number;
  unrealizedPnL?: number;
}

// Strategy types
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  indicators: Indicator[];
  conditions: Condition[];
  symbol: string;
  active: boolean;
  performance?: StrategyPerformance;
  createdAt: string;
  updatedAt: string;
}

export interface Indicator {
  id: string;
  type: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH';
  parameters: Record<string, any>;
  color?: string;
}

export interface Condition {
  id: string;
  indicatorId: string;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO' | 'CROSSES_ABOVE' | 'CROSSES_BELOW';
  value: number | string;
  action: 'BUY' | 'SELL';
}

export interface StrategyPerformance {
  winRate: number;
  totalTrades: number;
  profit: number;
  profitPercentage: number;
}

// Log types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  context?: Record<string, any>;
}

// WebSocket types
export interface BanInfo {
  isBanned: boolean;
  banUntil: number;
  remainingMinutes?: number;
}

// Kline/Candlestick data
export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime?: number;
  quoteAssetVolume?: number;
  trades?: number;
  takerBuyBaseAssetVolume?: number;
  takerBuyQuoteAssetVolume?: number;
}

// Market data
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

// Alert types
export interface Alert {
  id: string;
  symbol: string;
  condition: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'VOLUME_ABOVE' | 'INDICATOR_SIGNAL';
  value: number;
  triggered: boolean;
  createdAt: string;
  message?: string;
}

// Account performance types
export interface AccountPerformance {
  balance: number;
  equity: number;
  hitRate: number;
  profitLoss: number;
  profitLossPercentage: number;
  timeframes: {
    daily: PerformanceMetric[];
    weekly: PerformanceMetric[];
    monthly: PerformanceMetric[];
    yearly: PerformanceMetric[];
  };
}

export interface PerformanceMetric {
  date: string;
  value: number;
}

// Dashboard widget types
export interface Widget {
  id: string;
  type: 'PERFORMANCE_CHART' | 'OPEN_TRADES' | 'MARKET_OVERVIEW' | 'STRATEGY_SUMMARY' | 'RECENT_TRADES';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  settings?: Record<string, any>;
}

// Theme
export type ThemeType = 'light' | 'dark';

export interface ApiKeys {
  binanceApiKey: string;
  binanceSecretKey: string;
}