// src/hooks/useAI.ts
import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import aiTradingService from '@/services/aiTradingService';
import { Kline } from '@/types';

interface AISettings {
  enabled: boolean;
  model: string;
  positionSize: number;
  confidenceThreshold: number;
  leverage: number;
  automatedTrading: boolean;
  circuitBreaker: boolean;
  sandboxMode: boolean;
}

interface AIState {
  isInitialized: boolean;
  isLoading: boolean;
  lastPrediction: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    factors: string[];
    timestamp: string;
  } | null;
  error: string | null;
}

export const useAI = (klines?: Kline[]) => {
  // Estado local para o estado da IA
  const [aiState, setAiState] = useState<AIState>({
    isInitialized: false,
    isLoading: false,
    lastPrediction: null,
    error: null
  });
  
  // Carregar configurações do localStorage
  const [settings, setSettings] = useLocalStorage<AISettings>('crypto-ai-settings', {
    enabled: false,
    model: 'tensorflow',
    positionSize: 5,
    confidenceThreshold: 75,
    leverage: 1,
    automatedTrading: false,
    circuitBreaker: true,
    sandboxMode: true
  });
  
  // Inicializar o serviço AI quando habilitado
  useEffect(() => {
    let mounted = true;
    
    if (settings.enabled && !aiState.isInitialized) {
      setAiState(prev => ({ ...prev, isLoading: true }));
      
      const initialize = async () => {
        try {
          const success = await aiTradingService.initialize();
          
          if (mounted) {
            setAiState(prev => ({
              ...prev,
              isInitialized: success,
              isLoading: false,
              error: success ? null : 'Failed to initialize AI'
            }));
          }
        } catch (error) {
          if (mounted) {
            setAiState(prev => ({
              ...prev,
              isInitialized: false,
              isLoading: false,
              error: `Error initializing AI: ${error instanceof Error ? error.message : String(error)}`
            }));
          }
        }
      };
      
      initialize();
    } else if (!settings.enabled && aiState.isInitialized) {
      // Reset state when disabled
      setAiState({
        isInitialized: false,
        isLoading: false,
        lastPrediction: null,
        error: null
      });
    }
    
    return () => {
      mounted = false;
    };
  }, [settings.enabled, aiState.isInitialized]);
  
  // Fazer uma previsão com os dados disponíveis
  const predict = useCallback(async (data?: Kline[]) => {
    if (!settings.enabled) {
      return {
        action: 'HOLD' as const,
        confidence: 0,
        factors: ['AI is disabled']
      };
    }
    
    if (!aiState.isInitialized) {
      return {
        action: 'HOLD' as const,
        confidence: 0,
        factors: ['AI not initialized']
      };
    }
    
    const klinesData = data || klines;
    
    if (!klinesData || klinesData.length < 30) {
      return {
        action: 'HOLD' as const,
        confidence: 0,
        factors: ['Insufficient data']
      };
    }
    
    setAiState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const prediction = await aiTradingService.predict(klinesData);
      
      // Verificar se a confiança atende ao threshold
      if (prediction.confidence < settings.confidenceThreshold / 100) {
        prediction.action = 'HOLD';
        prediction.factors.unshift(`Confidence below threshold (${Math.round(prediction.confidence * 100)}% < ${settings.confidenceThreshold}%)`);
      }
      
      setAiState(prev => ({
        ...prev,
        isLoading: false,
        lastPrediction: {
          ...prediction,
          timestamp: new Date().toISOString()
        },
        error: null
      }));
      
      return prediction;
    } catch (error) {
      const errorMessage = `Error making prediction: ${error instanceof Error ? error.message : String(error)}`;
      
      setAiState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      return {
        action: 'HOLD' as const,
        confidence: 0,
        factors: [errorMessage]
      };
    }
  }, [settings, aiState.isInitialized, klines]);
  
  // Atualizar configurações
  const updateSettings = useCallback((newSettings: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);
  
  // Ativar IA
  const enableAI = useCallback(async () => {
    updateSettings({ enabled: true });
    
    // Tentar inicializar imediatamente
    try {
      setAiState(prev => ({ ...prev, isLoading: true }));
      
      const success = await aiTradingService.initialize();
      
      setAiState(prev => ({
        ...prev,
        isInitialized: success,
        isLoading: false,
        error: success ? null : 'Failed to initialize AI'
      }));
      
      return success;
    } catch (error) {
      setAiState(prev => ({
        ...prev,
        isLoading: false,
        error: `Error enabling AI: ${error instanceof Error ? error.message : String(error)}`
      }));
      
      return false;
    }
  }, [updateSettings]);
  
  // Desativar IA
  const disableAI = useCallback(() => {
    updateSettings({ enabled: false });
    
    setAiState(prev => ({
      ...prev,
      isInitialized: false,
      lastPrediction: null
    }));
  }, [updateSettings]);
  
  return {
    isEnabled: settings.enabled,
    isInitialized: aiState.isInitialized,
    isLoading: aiState.isLoading,
    error: aiState.error,
    lastPrediction: aiState.lastPrediction,
    settings,
    updateSettings,
    enableAI,
    disableAI,
    predict
  };
};