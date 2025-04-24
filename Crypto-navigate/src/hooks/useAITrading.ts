// src/hooks/useAITrading.ts
import { useState, useEffect } from 'react';
import aiTradingService from '@/services/aiTradingService';
import { useTrades } from './useTrades';
import { useMarketData } from './useMarketData';
import { useSettings } from './useSettings';

export const useAITrading = (symbol: string, timeframe: string) => {
  const [prediction, setPrediction] = useState<{action: string, confidence: number} | null>(null);
  const [isAutomated, setIsAutomated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { klines } = useMarketData(symbol, timeframe);
  const { createOrder } = useTrades();
  const { settings } = useSettings();
  
  // Get prediction when klines change
  useEffect(() => {
    if (!klines.length) return;
    
    const getPrediction = async () => {
      setIsLoading(true);
      try {
        const result = await aiTradingService.predict(klines);
        setPrediction(result);
        
        // Auto-execute trades if enabled
        if (isAutomated && 
            result.confidence > settings.aiConfidenceThreshold && 
            result.action !== 'HOLD') {
          
          // Execute the trade
          await createOrder(
            symbol,
            result.action === 'BUY' ? 'BUY' : 'SELL',
            'MARKET',
            settings.aiPositionSize,
            undefined,
            settings.aiLeverage
          );
        }
      } catch (error) {
        console.error('AI prediction error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPrediction();
  }, [klines, isAutomated, createOrder, settings.aiConfidenceThreshold, settings.aiLeverage, settings.aiPositionSize, symbol]);
  
  return {
    prediction,
    isLoading,
    isAutomated,
    setIsAutomated,
    executePrediction: async () => {
      if (!prediction || prediction.action === 'HOLD') return;
      
      await createOrder(
        symbol,
        prediction.action === 'BUY' ? 'BUY' : 'SELL',
        'MARKET',
        settings.aiPositionSize,
        undefined,
        settings.aiLeverage
      );
    }
  };
};