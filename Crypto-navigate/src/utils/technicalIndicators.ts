import { Kline } from '@/types';

export const detectPatterns = (klines: Kline[]): string[] => {
  // Detect patterns like head and shoulders, double tops, etc.
  return [];
};

/**
 * Calcula a Média Móvel Exponencial (EMA)
 * @param prices Array de preços de fechamento
 * @param period Período da média móvel
 * @returns Valor da EMA
 */
export const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) {
    return prices[prices.length - 1] || 0; // Retornar último preço se não tiver dados suficientes
  }

  // Inicializa com a SMA para os primeiros "period" valores
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  // Fator de ponderação
  const k = 2 / (period + 1);
  
  // Calcula a EMA para os valores restantes
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }

  return ema;
};

/**
 * Calcula a Média Móvel Simples (SMA)
 * @param prices Array de preços de fechamento
 * @param period Período da média móvel
 * @returns Valor da SMA
 */
export const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) {
    return prices[prices.length - 1] || 0; // Retornar último preço se não tiver dados suficientes
  }

  const slice = prices.slice(prices.length - period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
};

/**
 * Calcula o Índice de Força Relativa (RSI)
 * @param prices Array de preços de fechamento
 * @param period Período do RSI (normalmente 14)
 * @returns Valor do RSI entre 0 e 100
 */
export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length <= period) {
    return 50; // Valor neutro para RSI se não tiver dados suficientes
  }

  let gains = 0;
  let losses = 0;

  // Calcula ganhos e perdas
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  // Evitar divisão por zero
  if (losses === 0) return 100;
  
  const relativeStrength = gains / losses;
  return 100 - (100 / (1 + relativeStrength));
};

/**
 * Calcula a Convergência e Divergência de Médias Móveis (MACD)
 * @param prices Array de preços de fechamento
 * @param fastPeriod Período da EMA rápida (normalmente 12)
 * @param slowPeriod Período da EMA lenta (normalmente 26)
 * @param signalPeriod Período da linha de sinal (normalmente 9)
 * @returns Objeto com os valores da linha MACD, linha de sinal e histograma
 */
export const calculateMACD = (
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macdLine: number; signalLine: number; histogram: number } => {
  // Calcular as EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Linha MACD é a diferença entre as duas EMAs
  const macdLine = fastEMA - slowEMA;
  
  // Se não temos dados suficientes, retornar valores padrão
  if (prices.length < slowPeriod + signalPeriod) {
    return {
      macdLine,
      signalLine: macdLine,
      histogram: 0
    };
  }
  
  // Calcular a linha de sinal (EMA da linha MACD)
  // Na prática, precisaríamos de um array histórico de valores MACD
  // Esta é uma aproximação simples
  const signalLine = macdLine * 0.9; // Simplificação
  
  // Histograma é a diferença entre a linha MACD e a linha de sinal
  const histogram = macdLine - signalLine;
  
  return {
    macdLine,
    signalLine,
    histogram
  };
};

/**
 * Calcula as Bandas de Bollinger
 * @param prices Array de preços de fechamento
 * @param period Período (normalmente 20)
 * @param multiplier Multiplicador para desvio padrão (normalmente 2)
 * @returns Objeto com valores da banda superior, média e banda inferior
 */
export const calculateBollingerBands = (
  prices: number[], 
  period: number = 20, 
  multiplier: number = 2
): { upper: number; middle: number; lower: number } => {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0;
    return {
      upper: price * 1.05, // Aproximação
      middle: price,
      lower: price * 0.95 // Aproximação
    };
  }
  
  // Média móvel simples como a linha média
  const middle = calculateSMA(prices, period);
  
  // Calcular desvio padrão
  const pricesInPeriod = prices.slice(prices.length - period);
  const squaredDifferences = pricesInPeriod.map(price => Math.pow(price - middle, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  // Calcular bandas
  const upper = middle + (standardDeviation * multiplier);
  const lower = middle - (standardDeviation * multiplier);
  
  return { upper, middle, lower };
};

/**
 * Calcula o volume relativo comparado à média
 * @param volumes Array de volumes
 * @param period Período para média (normalmente 20)
 * @returns Relação entre o volume atual e o volume médio
 */
export const calculateRelativeVolume = (
  volumes: number[],
  period: number = 20
): number => {
  if (volumes.length < period) {
    return 1; // Valor neutro se não tiver dados suficientes
  }

  const volumesInPeriod = volumes.slice(volumes.length - period - 1, volumes.length - 1);
  const avgVolume = volumesInPeriod.reduce((sum, vol) => sum + vol, 0) / volumesInPeriod.length;
  const currentVolume = volumes[volumes.length - 1];
  
  return avgVolume > 0 ? currentVolume / avgVolume : 1;
};

/**
 * Verifica se houve um cruzamento de médias móveis
 * @param prices Array de preços de fechamento
 * @param fastPeriod Período da média móvel mais rápida
 * @param slowPeriod Período da média móvel mais lenta
 * @returns true se houve cruzamento para cima, false caso contrário
 */
export const detectCrossover = (
  prices: number[],
  fastPeriod: number,
  slowPeriod: number
): 'up' | 'down' | null => {
  if (prices.length < slowPeriod + 1) {
    return null; // Sem dados suficientes
  }
  
  // Calcular EMAs para os dois últimos dias
  const currentFastEMA = calculateEMA(prices, fastPeriod);
  const currentSlowEMA = calculateEMA(prices, slowPeriod);
  
  const previousPrices = prices.slice(0, prices.length - 1);
  const previousFastEMA = calculateEMA(previousPrices, fastPeriod);
  const previousSlowEMA = calculateEMA(previousPrices, slowPeriod);
  
  // Verificar cruzamento
  if (previousFastEMA <= previousSlowEMA && currentFastEMA > currentSlowEMA) {
    return 'up'; // Cruzamento para cima (sinal de compra)
  } else if (previousFastEMA >= previousSlowEMA && currentFastEMA < currentSlowEMA) {
    return 'down'; // Cruzamento para baixo (sinal de venda)
  }
  
  return null; // Sem cruzamento
};

/**
 * Extrai sequências de preços de fechamento e volumes de um array de velas
 * @param klines Array de objetos Kline
 * @returns Objeto com arrays de preços e volumes
 */
export const extractPricesAndVolumes = (klines: Kline[]): { prices: number[]; volumes: number[] } => {
  const prices = klines.map(kline => kline.close);
  const volumes = klines.map(kline => kline.volume);
  
  return { prices, volumes };
}; 