import { useState, useEffect, useMemo, useCallback } from 'react';
import BinanceWebSocket from '@/services/binanceWebSocket';
import { Kline } from '@/types';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateRelativeVolume,
  detectCrossover,
  extractPricesAndVolumes
} from '@/utils/technicalIndicators';

// Tipos para a análise de tendência
export type TrendDirection = 'up' | 'down' | 'neutral';
export type TrendStrength = 'weak' | 'moderate' | 'strong';
export type VolumeLevel = 'high' | 'average' | 'low';

export interface TrendData {
  direction: TrendDirection;
  strength: TrendStrength;
  volumeLevel: VolumeLevel;
  ema9: number;
  sma50: number;
  rsi14: number;
  relativeVolume: number;
  isLoading: boolean;
  error: string | null;
}

export interface TrendAnalysis {
  shortTerm: TrendData; // 5m
  mediumTerm: TrendData; // 1h
  longTerm: TrendData; // 1d
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

// Função para determinar a força da tendência
const determineTrendStrength = (
  ema9: number, 
  sma50: number, 
  rsi14: number,
  relativeVolume: number,
  crossover: 'up' | 'down' | null
): TrendStrength => {
  // Diferença percentual entre EMA e SMA
  const emaSmaRatio = Math.abs(ema9 - sma50) / sma50 * 100;
  
  // Verificar se houve cruzamento recente (sinal forte)
  if (crossover !== null) {
    return 'strong';
  }
  
  if (emaSmaRatio > 2 && relativeVolume > 1.5 && (rsi14 > 65 || rsi14 < 35)) {
    return 'strong';
  } else if (emaSmaRatio > 1 && relativeVolume > 1 && (rsi14 > 55 || rsi14 < 45)) {
    return 'moderate';
  } else {
    return 'weak';
  }
};

// Função para determinar o nível de volume
const determineVolumeLevel = (relativeVolume: number): VolumeLevel => {
  if (relativeVolume > 1.5) return 'high';
  if (relativeVolume < 0.7) return 'low';
  return 'average';
};

// Hook principal para análise de tendência
export const useTrendAnalysis = (symbol: string): TrendAnalysis => {
  const [shortTermData, setShortTermData] = useState<Kline[]>([]);
  const [mediumTermData, setMediumTermData] = useState<Kline[]>([]);
  const [longTermData, setLongTermData] = useState<Kline[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const webSocket = BinanceWebSocket.getInstance();

  // Função para buscar dados de um timeframe específico
  const fetchKlinesData = useCallback(async (timeframe: string): Promise<Kline[]> => {
    try {
      // Converter símbolo do formato BTC/USDT para BTCUSDT
      const formattedSymbol = symbol.replace('/', '');
      
      // Determinar o número de velas a buscar com base no timeframe
      const limit = 100;
      
      // Realizar a requisição para a API
      const response = await fetch(`https://testnet.binancefuture.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${timeframe}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch klines: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Converter para o formato Kline
      return data.map((kline: [number, string, string, string, string, string]) => ({
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
    } catch (err) {
      console.error(`Error fetching ${timeframe} klines:`, err);
      throw err;
    }
  }, [symbol]);

  // Função para buscar todos os dados necessários
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [shortTerm, mediumTerm, longTerm] = await Promise.all([
        fetchKlinesData('5m'),
        fetchKlinesData('1h'),
        fetchKlinesData('1d')
      ]);
      
      setShortTermData(shortTerm);
      setMediumTermData(mediumTerm);
      setLongTermData(longTerm);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching trend data:', err);
      setError('Failed to fetch trend data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchKlinesData]);

  // Efeito para buscar dados quando o símbolo mudar
  useEffect(() => {
    fetchAllData();
    
    // Configurar intervalos de atualização
    const shortTermInterval = setInterval(() => {
      fetchKlinesData('5m')
        .then(data => setShortTermData(data))
        .catch(err => console.error('Error updating 5m data:', err));
    }, 60000); // 1 minuto
    
    const mediumTermInterval = setInterval(() => {
      fetchKlinesData('1h')
        .then(data => setMediumTermData(data))
        .catch(err => console.error('Error updating 1h data:', err));
    }, 5 * 60000); // 5 minutos
    
    const longTermInterval = setInterval(() => {
      fetchKlinesData('1d')
        .then(data => setLongTermData(data))
        .catch(err => console.error('Error updating 1d data:', err));
    }, 60 * 60000); // 1 hora
    
    return () => {
      clearInterval(shortTermInterval);
      clearInterval(mediumTermInterval);
      clearInterval(longTermInterval);
    };
  }, [symbol, fetchAllData, fetchKlinesData]);

  // Analisar tendência para o timeframe de curto prazo (5m)
  const shortTerm = useMemo(() => {
    if (shortTermData.length < 50) {
      return {
        direction: 'neutral' as TrendDirection,
        strength: 'weak' as TrendStrength,
        volumeLevel: 'average' as VolumeLevel,
        ema9: 0,
        sma50: 0,
        rsi14: 50,
        relativeVolume: 1,
        isLoading,
        error
      };
    }

    const { prices, volumes } = extractPricesAndVolumes(shortTermData);
    
    const ema9 = calculateEMA(prices, 9);
    const sma50 = calculateSMA(prices, 50);
    const rsi14 = calculateRSI(prices, 14);
    const relativeVolume = calculateRelativeVolume(volumes);
    const crossover = detectCrossover(prices, 9, 50);
    
    // Determinar a direção da tendência
    let direction: TrendDirection;
    if (ema9 > sma50) {
      direction = 'up';
    } else if (ema9 < sma50) {
      direction = 'down';
    } else {
      direction = 'neutral';
    }
    
    // Ajustar com base no RSI
    if (rsi14 > 70 && direction === 'up') {
      direction = 'neutral'; // Possível reversão de alta para baixa
    } else if (rsi14 < 30 && direction === 'down') {
      direction = 'neutral'; // Possível reversão de baixa para alta
    }
    
    // Se houve cruzamento, considerar o sinal
    if (crossover === 'up') {
      direction = 'up';
    } else if (crossover === 'down') {
      direction = 'down';
    }
    
    const strength = determineTrendStrength(ema9, sma50, rsi14, relativeVolume, crossover);
    const volumeLevel = determineVolumeLevel(relativeVolume);
    
    return {
      direction,
      strength,
      volumeLevel,
      ema9,
      sma50,
      rsi14,
      relativeVolume,
      isLoading,
      error
    };
  }, [shortTermData, isLoading, error]);

  // Analisar tendência para o timeframe de médio prazo (1h)
  const mediumTerm = useMemo(() => {
    if (mediumTermData.length < 50) {
      return {
        direction: 'neutral' as TrendDirection,
        strength: 'weak' as TrendStrength,
        volumeLevel: 'average' as VolumeLevel,
        ema9: 0,
        sma50: 0,
        rsi14: 50,
        relativeVolume: 1,
        isLoading,
        error
      };
    }

    const { prices, volumes } = extractPricesAndVolumes(mediumTermData);
    
    const ema9 = calculateEMA(prices, 9);
    const sma50 = calculateSMA(prices, 50);
    const rsi14 = calculateRSI(prices, 14);
    const relativeVolume = calculateRelativeVolume(volumes);
    const crossover = detectCrossover(prices, 9, 50);
    
    // Determinar a direção da tendência
    let direction: TrendDirection;
    if (ema9 > sma50) {
      direction = 'up';
    } else if (ema9 < sma50) {
      direction = 'down';
    } else {
      direction = 'neutral';
    }
    
    // Ajustar com base no RSI
    if (rsi14 > 70 && direction === 'up') {
      direction = 'neutral'; // Possível reversão de alta para baixa
    } else if (rsi14 < 30 && direction === 'down') {
      direction = 'neutral'; // Possível reversão de baixa para alta
    }
    
    // Se houve cruzamento, considerar o sinal
    if (crossover === 'up') {
      direction = 'up';
    } else if (crossover === 'down') {
      direction = 'down';
    }
    
    const strength = determineTrendStrength(ema9, sma50, rsi14, relativeVolume, crossover);
    const volumeLevel = determineVolumeLevel(relativeVolume);
    
    return {
      direction,
      strength,
      volumeLevel,
      ema9,
      sma50,
      rsi14,
      relativeVolume,
      isLoading,
      error
    };
  }, [mediumTermData, isLoading, error]);

  // Analisar tendência para o timeframe de longo prazo (1d)
  const longTerm = useMemo(() => {
    if (longTermData.length < 50) {
      return {
        direction: 'neutral' as TrendDirection,
        strength: 'weak' as TrendStrength,
        volumeLevel: 'average' as VolumeLevel,
        ema9: 0,
        sma50: 0,
        rsi14: 50,
        relativeVolume: 1,
        isLoading,
        error
      };
    }

    const { prices, volumes } = extractPricesAndVolumes(longTermData);
    
    const ema9 = calculateEMA(prices, 9);
    const sma50 = calculateSMA(prices, 50);
    const rsi14 = calculateRSI(prices, 14);
    const relativeVolume = calculateRelativeVolume(volumes);
    const crossover = detectCrossover(prices, 9, 50);
    
    // Determinar a direção da tendência
    let direction: TrendDirection;
    if (ema9 > sma50) {
      direction = 'up';
    } else if (ema9 < sma50) {
      direction = 'down';
    } else {
      direction = 'neutral';
    }
    
    // Ajustar com base no RSI
    if (rsi14 > 70 && direction === 'up') {
      direction = 'neutral'; // Possível reversão de alta para baixa
    } else if (rsi14 < 30 && direction === 'down') {
      direction = 'neutral'; // Possível reversão de baixa para alta
    }
    
    // Se houve cruzamento, considerar o sinal
    if (crossover === 'up') {
      direction = 'up';
    } else if (crossover === 'down') {
      direction = 'down';
    }
    
    const strength = determineTrendStrength(ema9, sma50, rsi14, relativeVolume, crossover);
    const volumeLevel = determineVolumeLevel(relativeVolume);
    
    return {
      direction,
      strength,
      volumeLevel,
      ema9,
      sma50,
      rsi14,
      relativeVolume,
      isLoading,
      error
    };
  }, [longTermData, isLoading, error]);

  return {
    shortTerm,
    mediumTerm,
    longTerm,
    lastUpdated,
    isLoading,
    error,
    refreshData: fetchAllData
  };
};