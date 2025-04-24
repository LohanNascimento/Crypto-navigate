// src/utils/featureEngineering.ts
import { Kline } from '@/types';

/**
 * Calcula o RSI (Relative Strength Index)
 * @param prices Array de preços de fechamento
 * @param period Período para cálculo do RSI (padrão: 14)
 * @returns Array com os valores de RSI
 */
export const calculateRSI = (prices: number[], period: number = 14): number[] => {
  if (prices.length < period + 1) {
    return Array(prices.length).fill(50); // Valor neutro para RSI
  }
  
  const rsiValues: number[] = [];
  const deltas = prices.slice(1).map((price, i) => price - prices[i]);
  
  // Primeiras posições não têm RSI devido ao período
  for (let i = 0; i < period; i++) {
    rsiValues.push(50);
  }
  
  // Calcular ganhos e perdas
  let gains = 0;
  let losses = 0;
  
  // Primeiro valor é a média dos primeiros 'period' ganhos/perdas
  for (let i = 0; i < period; i++) {
    const delta = deltas[i];
    if (delta > 0) {
      gains += delta;
    } else {
      losses -= delta;
    }
  }
  
  // Média inicial
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calcular RSI para cada período
  for (let i = period; i < prices.length; i++) {
    const delta = i > 0 ? prices[i] - prices[i - 1] : 0;
    
    // Atualizar médias com smoothing
    avgGain = ((avgGain * (period - 1)) + (delta > 0 ? delta : 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + (delta < 0 ? -delta : 0)) / period;
    
    // Evitar divisão por zero
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }
  }
  
  return rsiValues;
};

/**
 * Calcula a média móvel simples
 * @param prices Array de preços
 * @param period Período da média móvel
 * @returns Array de médias móveis
 */
export const calculateSMA = (prices: number[], period: number): number[] => {
  const sma: number[] = [];
  
  // Preencher com undefined até ter dados suficientes
  for (let i = 0; i < period - 1; i++) {
    sma.push(prices[i]);
  }
  
  // Calcular SMA para cada período
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    sma.push(sum / period);
  }
  
  return sma;
};

/**
 * Calcular a média móvel exponencial
 * @param prices Array de preços
 * @param period Período da EMA
 * @returns Array de valores EMA
 */
export const calculateEMA = (prices: number[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Preencher valores iniciais
  for (let i = 0; i < period - 1; i++) {
    ema.push(prices[i]);
  }
  
  // Primeiro valor é SMA
  const firstSMA = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  ema.push(firstSMA);
  
  // Calcular EMA para o resto dos valores
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
};

/**
 * Calcula o MACD (Moving Average Convergence Divergence)
 * @param prices Array de preços
 * @param fastPeriod Período curto (padrão: 12)
 * @param slowPeriod Período longo (padrão: 26)
 * @param signalPeriod Período do sinal (padrão: 9)
 * @returns Objeto com arrays para MACD, Signal e Histogram
 */
export const calculateMACD = (
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[], signal: number[], histogram: number[] } => {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  // Calcular a linha MACD (diferença entre EMAs)
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  // Calcular a linha Signal (EMA do MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calcular o histograma (MACD - Signal)
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
};

/**
 * Normaliza um array de valores entre 0 e 1
 * @param values Array de valores
 * @returns Array normalizado
 */
export const normalize = (values: number[]): number[] => {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) return values.map(() => 0.5);
  
  return values.map(value => (value - min) / (max - min));
};

/**
 * Prepara os recursos (features) para o modelo de aprendizado de máquina
 * @param klines Array de candles
 * @returns Array 2D com as features para cada candle
 */
export const prepareFeatures = (klines: Kline[]): number[][] => {
  if (!klines || klines.length < 30) {
    console.error('Insufficient data for feature engineering');
    return [];
  }
  
  try {
    const prices = klines.map(k => k.close);
    const volumes = klines.map(k => k.volume);
    
    // Calcular indicadores
    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const ema10 = calculateEMA(prices, 10);
    const ema20 = calculateEMA(prices, 20);
    const { macd, signal, histogram } = calculateMACD(prices);
    
    // Normalizar volumes
    const normalizedVolumes = normalize(volumes);
    
    // Feature: diferença percentual entre preço atual e SMA20
    const sma20Diff = prices.map((price, i) => 
      sma20[i] ? (price - sma20[i]) / sma20[i] * 100 : 0
    );
    
    // Feature: diferença percentual entre EMA10 e EMA20
    const emaDiff = ema10.map((ema, i) => 
      ema20[i] ? (ema - ema20[i]) / ema20[i] * 100 : 0
    );
    
    // Feature: retornos percentuais para diferentes períodos
    const returns1d = prices.map((price, i) => 
      i > 0 ? (price - prices[i - 1]) / prices[i - 1] * 100 : 0
    );
    
    const returns3d = prices.map((price, i) => 
      i >= 3 ? (price - prices[i - 3]) / prices[i - 3] * 100 : 0
    );
    
    const returns5d = prices.map((price, i) => 
      i >= 5 ? (price - prices[i - 5]) / prices[i - 5] * 100 : 0
    );
    
    // Feature: volatilidade de preço (desvio padrão dos retornos)
    const volatility = [];
    const period = 10;
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        volatility.push(0);
        continue;
      }
      
      const priceSlice = prices.slice(i - period, i);
      const returns = priceSlice.slice(1).map((p, j) => (p - priceSlice[j]) / priceSlice[j]);
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      volatility.push(Math.sqrt(variance) * 100);
    }
    
    // Construir a matriz de features
    const features: number[][] = [];
    for (let i = 0; i < klines.length; i++) {
      // Precisamos garantir que temos todos os indicadores para este índice
      if (i < 26) { // 26 é o período máximo que usamos (para MACD slow)
        continue;
      }
      
      // Adicionar features para cada candle
      features.push([
        returns1d[i],          // retorno diário
        returns3d[i],          // retorno de 3 dias
        returns5d[i],          // retorno de 5 dias
        rsi[i],                // RSI
        sma20Diff[i],          // diferença percentual entre preço e SMA20
        emaDiff[i],            // diferença percentual entre EMA10 e EMA20
        macd[i],               // linha MACD
        signal[i],             // linha de sinal
        histogram[i],          // histograma MACD
        normalizedVolumes[i],  // volume normalizado
        volatility[i],         // volatilidade
        // Adicionar os preços normalizados dos últimos 3 candles para capturar padrões
        normalize(prices.slice(i-3, i+1))[0],
        normalize(prices.slice(i-3, i+1))[1],
        normalize(prices.slice(i-3, i+1))[2]
      ]);
    }
    
    return features;
  } catch (error) {
    console.error('Error preparing features:', error);
    return [];
  }
};
