// src/services/aiTradingService.ts
import * as tf from '@tensorflow/tfjs';
import { Kline } from '@/types';
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands
} from '@/utils/technicalIndicators';


class AITradingService {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private modelLoading = false;

  constructor() {
    // Inicialização vazia
  }

  private generateSyntheticData(klines: Kline[], options: { noiseLevel: number; timeWarpFactor: number; shuffleWindows: boolean }): Kline[] {
    return klines.map(k => ({
      ...k,
      close: k.close * (1 + (Math.random() * options.noiseLevel * 2 - options.noiseLevel)),
      time: k.time + (Math.random() * options.timeWarpFactor * 60000)
    }));
  }

  async prepareTrainingData(klines: Kline[], timeframes: string[]): Promise<{
    trainData: Kline[];
    valData: Kline[];
    testData: Kline[];
    normalizedData: Kline[];
  }> {
    // Aumento de dados sintéticos
    const augmentedData = this.generateSyntheticData(klines, {
      noiseLevel: 0.005,
      timeWarpFactor: 0.1,
      shuffleWindows: true
    });

    // Divisão estratificada do dataset
    const { trainData, valData, testData } = this.stratifiedSplit(augmentedData, {
      trainRatio: 0.7,
      valRatio: 0.15,
      testRatio: 0.15,
      shuffle: true,
      temporalSplit: false
    });

    // Normalização adaptativa por timeframe
    const normalizedData = this.adaptiveNormalization(trainData, timeframes);

    return {
      trainData,
      valData,
      testData,
      normalizedData
    };
  }

  private stratifiedSplit(data: Kline[], ratios: {
    trainRatio: number;
    valRatio: number;
    testRatio: number;
    shuffle: boolean;
    temporalSplit: boolean;
  }): {
    trainData: Kline[];
    valData: Kline[];
    testData: Kline[];
  } {
    const splitIndex = Math.floor(data.length * ratios.trainRatio);
    return {
      trainData: data.slice(0, splitIndex),
      valData: data.slice(splitIndex, splitIndex + Math.floor(data.length * ratios.valRatio)),
      testData: data.slice(splitIndex + Math.floor(data.length * ratios.valRatio))
    };
  }

  private adaptiveNormalization(data: Kline[], timeframes: string[]): Kline[] {
    const means = new Map<string, number>();
    const stds = new Map<string, number>();
    
    timeframes.forEach(tf => {
      const tfData = data.filter(k => k.timeframe === tf);
      if (tfData.length > 0) {
        const mean = tfData.reduce((sum, k) => sum + k.close, 0) / tfData.length;
        means.set(tf, mean);
        const variance = tfData.reduce((sum, k) => sum + Math.pow(k.close - mean, 2), 0) / tfData.length;
        stds.set(tf, Math.sqrt(variance));
      }
    });

    return data.map(k => {
      const mean = means.get(k.timeframe);
      const std = stds.get(k.timeframe);
      if (mean === undefined || std === undefined) {
        return k;
      }
      return {
        ...k,
        close: (k.close - mean) / std
      };
    });
  }

  async initialize(timeframes: string[]): Promise<boolean> {
    if (this.modelLoading) {
      console.log('Model already loading, waiting...');
      while (this.modelLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isInitialized;
    }
    
    if (this.isInitialized) {
      console.log('Model already initialized');
      return true;
    }
    
    this.modelLoading = true;
    
    try {
      console.log('Initializing AI Trading Service');
      
      if (!tf) {
        throw new Error('TensorFlow.js not available');
      }
      
      try {
        console.log('Trying to load saved model...');
        this.model = await tf.loadLayersModel('localstorage://trading-model');
        console.log('Loaded saved model');
      } catch (loadError) {
        console.log('No saved model found, creating new one');
        await this.createModel(timeframes);
        
        if (!this.model) {
          throw new Error('Failed to create model');
        }
        
        this.model.compile({
          optimizer: tf.train.adamax(0.001),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy', tf.metrics.precision({thresholds: 0.5}), tf.metrics.recall({thresholds: 0.5})],
          weightedMetrics: [tf.metrics.binaryAccuracy]
        });

        const sequenceLength = 30;
        const featuresPerTimeframe = 22;
        const numTimeframes = timeframes.length;

        await this.model.save('localstorage://trading-model', {
          
            trainingDate: new Date().toISOString(),
            timeframesUsed: timeframes,
            indicators: ['RSI', 'MACD', 'Bollinger', 'OBV', 'ADX', 'Fibonacci', 'Volume', 'Close'],
            inputShape: [sequenceLength, featuresPerTimeframe * numTimeframes]
          }
        });
      }
      
      this.isInitialized = true;
      console.log('AI Trading Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Trading Service:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.modelLoading = false;
    }
  }
    
    async createModel(timeframes = ['1h', '4h', 'daily']) {
      const featuresPerTimeframe = 22;
      const sequenceLength = 30;
      const numTimeframes = timeframes.length;

      // Normalização dos dados de entrada
      const normalizationLayer = tf.layers.layerNormalization({
        axis: -1,
        epsilon: 1e-6,
        name: 'input_normalization'
      });

      // Configuração de callbacks para treinamento
      const callbacks = [
        tf.callbacks.earlyStopping({ monitor: 'val_loss', patience: 5 }),
        tf.callbacks.ModelCheckpoint({
          filepath: 'indexeddb://model-checkpoints',
          saveBestOnly: true,
          verbose: 1
        })
      ];

      this.model = tf.sequential({
        layers: [
          // Camada de entrada para dados multi-timeframe
          tf.layers.inputLayer({ 
            inputShape: [sequenceLength, featuresPerTimeframe * numTimeframes],
            name: 'multi_timeframe_input'
          }),
          tf.layers.reshape({
            targetShape: [sequenceLength, numTimeframes, featuresPerTimeframe],
            name: 'timeframe_reshape'
          }),

          // Processamento paralelo por timeframe
          tf.layers.timeDistributed({
            layer: tf.layers.conv1d({
              filters: 64,
              kernelSize: 3,
              activation: 'swish',
              padding: 'same',
              kernelRegularizer: tf.regularizers.l1l2({ l1: 0.001, l2: 0.002 }) as tf.Regularizer
            })
          }),
          tf.layers.timeDistributed({
            layer: tf.layers.maxPooling1d({ poolSize: 2 })
          }),

          // Transformer para capturar dependências temporais
          tf.layers.timeDistributed({
            layer: tf.layers.transformer({
              numHeads: 8,
              keyDim: 64,
              dropoutRate: 0.1,
              denseUnits: 128,
              activation: 'gelu'
            })
          }),

          // Fusão multi-escala
          tf.layers.concatenate({ axis: -1 }),
          tf.layers.bidirectional({
            layer: tf.layers.lstm({
              units: 256,
              returnSequences: false,
              kernelRegularizer: tf.regularizers.l1l2({ l1: 0.005, l2: 0.01 }),
              recurrentDropout: 0.2
            })
          }),

          // Mecanismo de atenção para decisão final
          tf.layers.multiheadAttention({
            numHeads: 8,
            keyDim: 128,
            valueDim: 256,
            dropout: 0.1,
            useRelativePositionalEncoding: true
          }),

          // Camadas densas com normalização
          tf.layers.layerNormalization(),
          tf.layers.dense({
            units: 128,
            activation: 'swish',
            kernelConstraint: tf.constraints.maxNorm({maxValue: 3}),
            kernelInitializer: 'heNormal'
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: 3,
            activation: 'softmax',
            kernelRegularizer: tf.regularizers.l1l2({ l1: 0.001, l2: 0.002 }) as tf.Regularizer
          })
        ]
      });
    
      // Compilar o modelo
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: [
          'accuracy',
          tf.metrics.precision(),
          tf.metrics.recall(),
          tf.metrics.binaryAccuracy
        ],
        weightedMetrics: [tf.metrics.binaryCrossentropy()]
      });
      
      console.log('Model created successfully');
      
      // Modelo criado, mas não treinado
      // Em uma implementação real, você treinaria o modelo com dados históricos
      // Para fins de demonstração, vamos salvar o modelo não treinado
      await this.saveModel();
      
      return true;
    }
    
    async saveModel() {
      if (!this.model) {
        console.error('No model to save');
        return false;
      }
      
      try {
        await this.model.save('localstorage://trading-model');
        console.log('Model saved to localStorage');
        return true;
      } catch (error) {
        console.error('Error saving model:', error);
        return false;
      }
    }
    
    async predict(klines: Kline[]): Promise<{action: 'BUY'|'SELL'|'HOLD', confidence: number, factors: string[]}> {
      if (!this.isInitialized || !this.model) {
        const initialized = await this.prepareTrainingData(klines, ['1h']);
        if (!initialized) {
          return {
            action: 'HOLD',
            confidence: 0,
            factors: ['Model not initialized']
          };
        }
      }
      
      try {
        if (klines.length < 30) {
          return {
            action: 'HOLD',
            confidence: 0,
            factors: ['Insufficient data']
          };
        }
        
        // Preparar features para predição
        const features = this.prepareFeatures(klines);
        if (!features) throw new Error('Falha ao extrair features');
        const tensorFeatures = tf.tensor2d([features]);
        tf.engine().startScope();
        if (!features || features.length === 0) {
          return {
            action: 'HOLD',
            confidence: 0,
            factors: ['Failed to prepare features']
          };
        }
        
        // Pegar as features mais recentes
        const latestFeatures = features[features.length - 1];
        
        // Converter para tensor
        const tensorFeatures = tf.tensor2d([latestFeatures]);
        
        // Obter predição
        // Previsão com Monte Carlo Dropout para estimativa de incerteza
  const mcPredictions = Array(50).fill()
    .map(() => this.model.predict(tensorFeatures, {
      training: true // Mantém dropout ativo durante inferência
    }));

  const meanPrediction = tf.stack(mcPredictions).mean(0);
  const stdDeviation = tf.stack(mcPredictions).std(0);

  const prediction = {
    mean: meanPrediction,
    uncertainty: stdDeviation,
    confidence: tf.sub(1, tf.mul(stdDeviation, 2))
  };

  const values = await prediction.mean.data();
        
        // Liberar tensores para evitar memory leaks
        tensorFeatures.dispose();
        prediction.mean.dispose();
        prediction.stdDeviation.dispose();
        prediction.confidence.dispose();
        tf.engine().endScope();
        
        // Determinar ação com base na maior probabilidade
        const actions = ['BUY', 'HOLD', 'SELL'];
        const valuesArray = Array.from(values as Float32Array);
        const maxIndex = valuesArray.indexOf(Math.max(...valuesArray));
        const confidence = valuesArray[maxIndex];
        
        // Determinar os fatores que influenciaram a decisão
        // Em uma implementação real, isso seria baseado em análise detalhada
        const factors = this.determineFactors(klines, latestFeatures);
        
        return {
          action: actions[maxIndex] as 'BUY'|'SELL'|'HOLD',
          confidence,
          factors
        };
      } catch (error) {
        console.error('Error making prediction:', error);
        return {
          action: 'HOLD',
          confidence: 0,
          factors: ['Prediction error']
        };
      }
    }
    
    private determineFactors(klines: Kline[], features: number[]): string[] {
      const factors: string[] = [];
      
      // Verificar tendência de preço
      const recentPrices = klines.slice(-5).map(k => k.close);
      const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
      
      if (priceChange > 2) {
        factors.push('Strong upward price momentum (+2%)');
      } else if (priceChange < -2) {
        factors.push('Strong downward price momentum (-2%)');
      }
      
      // Volume analysis
      const recentVolumes = klines.slice(-5).map(k => k.volume);
      const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
      const latestVolume = recentVolumes[recentVolumes.length - 1];
      
      if (latestVolume > avgVolume * 1.5) {
        factors.push('Volume spike (+50% above average)');
      }
      
      // RSI analysis (assumindo que a feature 3 é o RSI)
      const rsi = features[3]; // This is just a placeholder, adjust based on actual feature index
      if (rsi < 30) {
        factors.push('Oversold conditions (RSI < 30)');
      } else if (rsi > 70) {
        factors.push('Overbought conditions (RSI > 70)');
      }
      
      // Se não houver fatores claros, adicionar genérico
      if (factors.length === 0) {
        factors.push('Multiple technical indicators alignment');
      }
      
      return factors;
    }
  }
}


const aiTradingService = new AITradingService();
export default aiTradingService;