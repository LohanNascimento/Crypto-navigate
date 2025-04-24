
import { Trade, Strategy, MarketData, Kline, LogEntry, AccountPerformance } from '../types';

// Generate random number between min and max
const randomNumber = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Generate random date between start and end
const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Format date for consistent string representation
const formatDate = (date: Date): string => {
  return date.toISOString();
};

// Common cryptocurrency symbols
const cryptoSymbols = [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'ADA/USDT',
  'XRP/USDT',
  'DOT/USDT',
  'AVAX/USDT',
  'MATIC/USDT',
  'LINK/USDT'
];

// Generate mock trades
export const generateMockTrades = (count: number): Trade[] => {
  const trades: Trade[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  for (let i = 0; i < count; i++) {
    const symbol = cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)];
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const entryPrice = randomNumber(100, 50000);
    const quantity = randomNumber(0.1, 10);
    const entryTime = formatDate(randomDate(thirtyDaysAgo, now));
    
    const isClosed = Math.random() > 0.3;
    let exitPrice, exitTime, profit, profitPercentage;
    
    if (isClosed) {
      exitPrice = side === 'BUY'
        ? entryPrice * (1 + randomNumber(-0.05, 0.1)) // +/- 5-10%
        : entryPrice * (1 + randomNumber(-0.1, 0.05));
      
      const entryDate = new Date(entryTime);
      exitTime = formatDate(randomDate(entryDate, now));
      
      profit = side === 'BUY'
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;
      
      profitPercentage = (profit / (entryPrice * quantity)) * 100;
    }
    
    trades.push({
      id: `trade-${i}`,
      symbol,
      entryPrice,
      exitPrice,
      quantity,
      entryTime,
      exitTime,
      side,
      status: isClosed ? 'CLOSED' : 'OPEN',
      profit,
      profitPercentage,
      strategyId: Math.random() > 0.5 ? `strategy-${Math.floor(Math.random() * 5)}` : undefined
    });
  }

  return trades;
};

// Generate mock strategies
export const generateMockStrategies = (count: number): Strategy[] => {
  const strategies: Strategy[] = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));

  const indicatorTypes: Array<'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH'> = [
    'RSI', 'MACD', 'SMA', 'EMA', 'BB', 'STOCH'
  ];

  const operators: Array<'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO' | 'CROSSES_ABOVE' | 'CROSSES_BELOW'> = [
    'GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'CROSSES_ABOVE', 'CROSSES_BELOW'
  ];

  for (let i = 0; i < count; i++) {
    const createdAt = formatDate(randomDate(sixMonthsAgo, now));
    const updatedAt = formatDate(randomDate(new Date(createdAt), now));
    
    const symbol = cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)];
    
    const indicatorCount = Math.floor(randomNumber(1, 4));
    const indicators = [];
    
    for (let j = 0; j < indicatorCount; j++) {
      const indicatorType = indicatorTypes[Math.floor(Math.random() * indicatorTypes.length)];
      
      let parameters: Record<string, any> = {};
      
      switch (indicatorType) {
        case 'RSI':
          parameters = { period: Math.floor(randomNumber(7, 21)) };
          break;
        case 'MACD':
          parameters = {
            fastPeriod: Math.floor(randomNumber(8, 15)),
            slowPeriod: Math.floor(randomNumber(20, 30)),
            signalPeriod: Math.floor(randomNumber(5, 10))
          };
          break;
        case 'SMA':
        case 'EMA':
          parameters = { period: Math.floor(randomNumber(10, 200)) };
          break;
        case 'BB':
          parameters = { 
            period: Math.floor(randomNumber(10, 30)),
            stdDev: randomNumber(1.5, 3)
          };
          break;
        case 'STOCH':
          parameters = {
            kPeriod: Math.floor(randomNumber(5, 15)),
            dPeriod: Math.floor(randomNumber(3, 7)),
            slowing: Math.floor(randomNumber(1, 5))
          };
          break;
      }
      
      indicators.push({
        id: `indicator-${i}-${j}`,
        type: indicatorType,
        parameters,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      });
    }
    
    const conditions = [];
    for (let j = 0; j < Math.floor(randomNumber(1, indicators.length + 1)); j++) {
      const indicator = indicators[j % indicators.length];
      conditions.push({
        id: `condition-${i}-${j}`,
        indicatorId: indicator.id,
        operator: operators[Math.floor(Math.random() * operators.length)],
        value: indicator.type === 'RSI' ? randomNumber(20, 80) : randomNumber(0, 100),
        action: Math.random() > 0.5 ? 'BUY' : 'SELL'
      });
    }
    
    strategies.push({
      id: `strategy-${i}`,
      name: `Strategy ${i + 1}`,
      description: `This is a sample ${indicators.map(i => i.type).join('/')} strategy`,
      indicators,
      conditions,
      symbol,
      active: Math.random() > 0.3,
      performance: {
        winRate: randomNumber(30, 70),
        totalTrades: Math.floor(randomNumber(10, 100)),
        profit: randomNumber(-500, 2000),
        profitPercentage: randomNumber(-10, 40)
      },
      createdAt,
      updatedAt
    });
  }

  return strategies;
};

// Generate mock market data
export const generateMockMarketData = (symbol: string): MarketData => {
  const basePrice = getBasePrice(symbol);
  const price = basePrice * (1 + randomNumber(-0.001, 0.001));
  const change = basePrice * randomNumber(-0.05, 0.05);
  const changePercent = (change / (basePrice - change)) * 100;
  
  return {
    symbol,
    price,
    change,
    changePercent,
    volume: randomNumber(1000000, 5000000),
    high24h: price * (1 + randomNumber(0.01, 0.05)),
    low24h: price * (1 - randomNumber(0.01, 0.05)),
    lastUpdated: new Date().toISOString()
  };
};

// Get base price for a symbol
const getBasePrice = (symbol: string): number => {
  if (symbol.includes('BTC')) return randomNumber(60000, 70000);
  if (symbol.includes('ETH')) return randomNumber(3000, 4000);
  if (symbol.includes('BNB')) return randomNumber(500, 600);
  if (symbol.includes('SOL')) return randomNumber(100, 150);
  if (symbol.includes('ADA')) return randomNumber(0.5, 1);
  if (symbol.includes('XRP')) return randomNumber(0.5, 1);
  if (symbol.includes('DOT')) return randomNumber(10, 20);
  if (symbol.includes('AVAX')) return randomNumber(30, 40);
  if (symbol.includes('MATIC')) return randomNumber(1, 2);
  if (symbol.includes('LINK')) return randomNumber(15, 20);
  return randomNumber(10, 100);
};

// Generate mock klines (candlestick data)
export const generateMockKlines = (symbol: string, interval: string, count: number): Kline[] => {
  const klines: Kline[] = [];
  const basePrice = getBasePrice(symbol);
  let lastClose = basePrice;
  const now = Math.floor(Date.now() / 1000);
  
  let intervalSeconds: number;
  switch(interval) {
    case '1m': intervalSeconds = 60; break;
    case '5m': intervalSeconds = 300; break;
    case '15m': intervalSeconds = 900; break;
    case '30m': intervalSeconds = 1800; break;
    case '1h': intervalSeconds = 3600; break;
    case '4h': intervalSeconds = 14400; break;
    case '1d': intervalSeconds = 86400; break;
    default: intervalSeconds = 3600;
  }
  
  for (let i = 0; i < count; i++) {
    const time = now - ((count - i) * intervalSeconds);
    
    // Generate realistic candle data
    const changePercent = randomNumber(-2, 2);
    const close = lastClose * (1 + (changePercent / 100));
    const open = lastClose;
    const high = Math.max(open, close) * (1 + randomNumber(0.1, 0.5) / 100);
    const low = Math.min(open, close) * (1 - randomNumber(0.1, 0.5) / 100);
    const volume = randomNumber(basePrice * 1000, basePrice * 5000);
    
    klines.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
  }
  
  return klines;
};

// Generate mock account performance data
export const generateMockAccountPerformance = (): AccountPerformance => {
  const dailyPerformance: Array<{date: string, value: number}> = [];
  const weeklyPerformance: Array<{date: string, value: number}> = [];
  const monthlyPerformance: Array<{date: string, value: number}> = [];
  const yearlyPerformance: Array<{date: string, value: number}> = [];
  
  const now = new Date();
  let cumulativeValue = 10000; // Start with $10,000
  
  // Generate daily performance for 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    const changePercent = randomNumber(-2, 2);
    cumulativeValue = cumulativeValue * (1 + (changePercent / 100));
    
    dailyPerformance.push({
      date: formatDate(date),
      value: cumulativeValue
    });
    
    // Add weekly data points (every 7 days)
    if (i % 7 === 0) {
      weeklyPerformance.push({
        date: formatDate(date),
        value: cumulativeValue
      });
    }
    
    // Add monthly data point at beginning
    if (i === 30) {
      monthlyPerformance.push({
        date: formatDate(date),
        value: cumulativeValue
      });
    }
  }
  
  // Add current value to monthly and yearly
  monthlyPerformance.push({
    date: formatDate(now),
    value: cumulativeValue
  });
  
  // Generate yearly performance (current month only)
  yearlyPerformance.push({
    date: formatDate(new Date(now.getFullYear(), 0, 1)),
    value: cumulativeValue * 0.8
  });
  
  yearlyPerformance.push({
    date: formatDate(now),
    value: cumulativeValue
  });
  
  return {
    balance: cumulativeValue,
    equity: cumulativeValue * 1.05,
    hitRate: randomNumber(40, 70),
    profitLoss: cumulativeValue - 10000,
    profitLossPercentage: ((cumulativeValue - 10000) / 10000) * 100,
    timeframes: {
      daily: dailyPerformance,
      weekly: weeklyPerformance,
      monthly: monthlyPerformance,
      yearly: yearlyPerformance
    }
  };
};

// Generate mock log entries
export const generateMockLogs = (count: number): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  const logMessages = [
    { level: 'INFO', message: 'Application started' },
    { level: 'INFO', message: 'Connected to Binance API' },
    { level: 'INFO', message: 'Strategy activated' },
    { level: 'INFO', message: 'Market data updated' },
    { level: 'WARNING', message: 'Market volatility high' },
    { level: 'WARNING', message: 'Strategy performance degrading' },
    { level: 'ERROR', message: 'Failed to connect to Binance API' },
    { level: 'ERROR', message: 'Strategy execution failed' },
    { level: 'SUCCESS', message: 'Trade executed successfully' },
    { level: 'SUCCESS', message: 'Profit target reached' }
  ];
  
  for (let i = 0; i < count; i++) {
    const timestamp = formatDate(randomDate(oneDayAgo, now));
    const logTemplate = logMessages[Math.floor(Math.random() * logMessages.length)];
    
    logs.push({
      id: `log-${i}`,
      timestamp,
      level: logTemplate.level as 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS',
      message: logTemplate.message,
      context: {
        timestamp,
        additionalInfo: `Sample log entry ${i + 1}`
      }
    });
  }
  
  // Sort by timestamp, most recent first
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};
