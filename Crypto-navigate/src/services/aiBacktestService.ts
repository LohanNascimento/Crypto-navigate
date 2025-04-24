// src/services/aiBacktestService.ts
import aiTradingService from './aiTradingService';
import { prepareFeatures } from '@/utils/featureEngineering';
interface HistoricalDataPoint {
  time: string;
  close: number;
  // Add other relevant price/volume fields
}

interface Position {
  side: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  entryTime: string;
  leverage: number;
  exitPrice?: number;
  exitTime?: string;
  profitLoss?: number;
  profitLossPercentage?: number;
}

interface BacktestTrade extends Position {
  exitPrice: number;
  exitTime: string;
  profitLoss: number;
  profitLossPercentage: number;
}

interface BacktestResult {
  finalBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  trades: BacktestTrade[];
}

export const backtestStrategy = async (
  historicalData: HistoricalDataPoint[],
  settings: {
    initialBalance: number;
    positionSize: number;
    leverage: number;
    confidenceThreshold: number;
  }
) => {
  let balance = settings.initialBalance;
  const trades: BacktestTrade[] = [];
  let position: Position | null = null;
  
  // Process each candle
  for (let i = 100; i < historicalData.length; i++) {
    // Get data slice for this point in time
    const dataSlice = historicalData.slice(0, i);
    
    // Make prediction
    const features = prepareFeatures(dataSlice.map(point => ({
      open: point.close, // Using close as a fallback since open is not available
      high: point.close, // Using close as fallback
      low: point.close,  // Using close as fallback
      close: point.close,
      isClosed: true,
      volume: 0,        // Default volume to 0
      time: new Date(point.time).getTime() // Convert string time to timestamp number
})));
    const prediction = await aiTradingService.predict(features.map(feature => ({
      time: feature[0],
      open: feature[1], 
      high: feature[2],
      low: feature[3],
      close: feature[4],
      isClosed: true,
      volume: feature[5]
    })));
    
    // Check if confidence meets threshold
    if (prediction.confidence < settings.confidenceThreshold / 100) {
      continue; // Skip if not confident enough
    }
    
    const currentPrice = dataSlice[dataSlice.length - 1].close;
    
    // Handle existing position
    if (position) {
      if ((position.side === 'BUY' && prediction.action === 'SELL') ||
          (position.side === 'SELL' && prediction.action === 'BUY')) {
        
        // Close position
        const profitLoss = position.side === 'BUY' 
          ? (currentPrice - position.entryPrice) / position.entryPrice * position.size * settings.leverage
          : (position.entryPrice - currentPrice) / position.entryPrice * position.size * settings.leverage;
          
        const closedPosition = {
          ...position,
          exitPrice: currentPrice,
          exitTime: dataSlice[dataSlice.length - 1].time,
          profitLoss,
          profitLossPercentage: profitLoss / position.size * 100
        };
        
        trades.push(closedPosition);
        balance += position.size + profitLoss;
        position = null;
      }
    } 
    // Open new position if none exists
    else if (prediction.action !== 'HOLD') {
      const positionSize = balance * (settings.positionSize / 100);
      
      position = {
        side: prediction.action,
        size: positionSize,
        entryPrice: currentPrice,
        entryTime: dataSlice[dataSlice.length - 1].time,
        leverage: settings.leverage
      };
      
      balance -= positionSize;
    }
  }
  
  // Close any remaining position
  if (position) {
    const currentPrice = historicalData[historicalData.length - 1].close;
    const profitLoss = position.side === 'BUY' 
      ? (currentPrice - position.entryPrice) / position.entryPrice * position.size * settings.leverage
      : (position.entryPrice - currentPrice) / position.entryPrice * position.size * settings.leverage;
      
    const closedPosition = {
      ...position,
      exitPrice: currentPrice,
      exitTime: historicalData[historicalData.length - 1].time,
      profitLoss,
      profitLossPercentage: profitLoss / position.size * 100
    };
    
    trades.push(closedPosition);
    balance += position.size + profitLoss;
  }
  
  // Calculate metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profitLoss > 0).length;
  const losingTrades = trades.filter(t => t.profitLoss <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalProfit = trades.reduce((sum, t) => sum + (t.profitLoss > 0 ? t.profitLoss : 0), 0);
  const totalLoss = Math.abs(trades.reduce((sum, t) => sum + (t.profitLoss < 0 ? t.profitLoss : 0), 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;
  
  return {
    finalBalance: balance,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    trades
  };
};