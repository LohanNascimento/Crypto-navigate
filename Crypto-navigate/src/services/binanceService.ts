import { createExchange, ExchangeInterface } from './ccxtWrapper';
import { Kline, MarketData, Trade, Position } from '../types';

interface BinanceCredentials {
  apiKey?: string;
  apiSecret?: string;
}

class BinanceService {
  private static instance: BinanceService;
  private exchange: ExchangeInterface | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  private constructor() {}

  public static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  private async ensureExchange(): Promise<ExchangeInterface> {
    if (!this.exchange) {
      try {
        this.exchange = await createExchange('binance', {
          options: {
            defaultType: 'future',
            adjustForTimeDifference: true,
            recvWindow: 60000,
            timeout: 60000,
            testnet: true
          },
          urls: {
            api: {
              market: 'https://testnet.binance.vision/api/v3',
              public: 'https://testnet.binance.vision/api/v3',
              private: 'https://testnet.binance.vision/api/v3',
              v1: 'https://testnet.binance.vision/api/v3',
            },
          }
        });
        console.log('Exchange Binance Futures Testnet initialized successfully');
      } catch (error) {
        console.error('Failed to initialize exchange:', error);
        throw error;
      }
    }
    return this.exchange;
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Tentativa ${i + 1} falhou, tentando novamente...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw lastError;
  }

  public updateCredentials(credentials: BinanceCredentials): void {
    try {
      createExchange('binance', {
        apiKey: credentials.apiKey,
        secret: credentials.apiSecret,
        options: {
          defaultType: 'future',
          adjustForTimeDifference: true,
          recvWindow: 60000,
          timeout: 60000,
          testnet: true
        },
        urls: {
          api: {
            market: 'https://testnet.binance.vision/api/v3',
            public: 'https://testnet.binance.vision/api/v3',
            private: 'https://testnet.binance.vision/api/v3',
            v1: 'https://testnet.binance.vision/api/v3',
          },
        }
      }).then(exchange => {
        this.exchange = exchange;
        console.log('Credentials updated successfully');
      }).catch(error => {
        console.error('Failed to update credentials:', error);
        throw error;
      });
    } catch (error) {
      console.error('Failed to update credentials:', error);
      throw error;
    }
  }

  private formatSymbol(symbol: string): string {
    return symbol.replace('/', '');
  }

  // No CCXT já temos formatação de símbolos padronizada
  private ccxtSymbol(symbol: string): string {
    // CCXT usa o formato BTC/USDT
    if (symbol.includes('/')) {
      return symbol;
    }
    
    // Converter formato Binance (BTCUSDT) para CCXT (BTC/USDT)
    const baseAssets = ['USDT', 'USD', 'BTC', 'ETH', 'BNB'];
    
    for (const base of baseAssets) {
      if (symbol.endsWith(base)) {
        return `${symbol.slice(0, -base.length)}/${base}`;
      }
    }
    
    return symbol;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public async getMarketData(symbol: string): Promise<MarketData> {
    const cacheKey = `marketData-${symbol}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    await this.rateLimit();
    const ccxtSymbol = this.ccxtSymbol(symbol);
    
    try {
      const exchange = await this.ensureExchange();
      console.log(`Buscando dados de mercado para ${ccxtSymbol}`);
      
      await exchange.loadMarkets();
      const ticker = await exchange.fetchTicker(ccxtSymbol);
      
      const marketData = {
        symbol,
        price: ticker.last || ticker.close,
        change: ticker.change || 0,
        changePercent: ticker.percentage || 0,
        volume: ticker.quoteVolume || ticker.baseVolume || 0,
        high24h: ticker.high || 0,
        low24h: ticker.low || 0,
        lastUpdated: new Date(ticker.timestamp || Date.now()).toISOString()
      };

      this.setCachedData(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error(`Falha ao obter dados de mercado para ${ccxtSymbol}`, error);
      throw new Error(`Falha ao obter dados de mercado para ${symbol}`);
    }
  }

  public async getCandles(symbol: string, timeframe: string): Promise<Kline[]> {
    try {
      const exchange = await this.ensureExchange();
      const formattedSymbol = this.formatSymbol(symbol);
      const ohlcv = await exchange.fetchOHLCV(formattedSymbol, timeframe);
      return ohlcv.map(candle => ({
        time: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));
    } catch (error) {
      console.error('Failed to fetch candles:', error);
      throw error;
    }
  }

  public async getSymbols(): Promise<string[]> {
    try {
      const exchange = await this.ensureExchange();
      console.log('Buscando símbolos disponíveis');
      
      // Carregar mercados
      await exchange.loadMarkets();
      
      // Filtrar para obter apenas os mercados de futuros
      const symbols = Object.keys(exchange.markets)
        .filter(symbol => symbol.includes('/'))
        .filter(symbol => symbol.endsWith('/USDT'));
      
      console.log(`${symbols.length} símbolos encontrados`);
      return symbols;
    } catch (error) {
      console.error('Erro ao obter símbolos:', error);
      throw new Error('Falha ao obter símbolos disponíveis');
    }
  }

  public async getAccountInfo() {
    try {
      if (!this.exchange) {
        throw new Error('Conexão CCXT não inicializada com credenciais');
      }
      
      // Verificar se temos conexão com a autenticação
      await this.exchange.checkRequiredCredentials();
      console.log('Buscando informações da conta');
      
      // No CCXT, isso retorna informações de saldo
      const balanceInfo = await this.exchange.fetchBalance();
      console.log('Informações de saldo obtidas');
      return balanceInfo;
    } catch (error) {
      console.error('Erro ao obter informações da conta:', error);
      throw new Error('Falha ao obter informações da conta. Verifique suas credenciais da API.');
    }
  }

  public async createOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number,
    leverage?: number
  ): Promise<Trade> {
    try {
      const exchange = await this.ensureExchange();
      const formattedSymbol = this.formatSymbol(symbol);

      if (leverage) {
        await exchange.setLeverage(leverage, formattedSymbol);
      }

      const order = await exchange.createOrder(
        formattedSymbol,
        type.toLowerCase(),
        side.toLowerCase(),
        quantity,
        price
      );

      return {
        id: order.id,
        symbol: order.symbol,
        side: order.side.toUpperCase() as 'BUY' | 'SELL',
        type: order.type.toUpperCase() as 'MARKET' | 'LIMIT',
        quantity: order.amount,
        price: order.price || 0,
        timestamp: order.timestamp,
        status: order.status.toUpperCase() as Trade['status'],
        leverage: leverage || 1,
        entryPrice: order.price || 0,
        entryTime: new Date(order.timestamp).toISOString()
      };
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  public async getOrderHistory(symbol?: string): Promise<any[]> {
    const cacheKey = `orderHistory-${symbol || 'all'}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    await this.rateLimit();
    try {
      const exchange = await this.ensureExchange();
      if (!exchange) {
        throw new Error('Exchange not initialized');
      }

      // Validar credenciais
      if ('checkRequiredCredentials' in exchange) {
        await (exchange as any).checkRequiredCredentials();
      }

      console.log('Buscando histórico de ordens', { symbol });
      
      const orders = symbol 
        ? await exchange.fetchClosedOrders(this.ccxtSymbol(symbol))
        : await exchange.fetchClosedOrders();
        
      this.setCachedData(cacheKey, orders);
      return orders;
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      throw error;
    }
  }
  
  public async getOpenPositions(symbol?: string): Promise<any[]> {
    try {
      const exchange = await this.ensureExchange();
      if (!exchange) {
        throw new Error('Exchange not initialized');
      }

      // Validar credenciais
      if ('checkRequiredCredentials' in exchange) {
        await (exchange as any).checkRequiredCredentials();
      }

      // Buscar posições abertas
      if ('fetchPositions' in exchange) {
        const positions = await (exchange as any).fetchPositions(symbol ? [symbol] : undefined);
        return positions;
      }
      
      throw new Error('Method fetchPositions not available');
    } catch (error) {
      console.error('Failed to fetch open positions:', error);
      throw error;
    }
  }
  
  public async setLeverage(symbol: string, leverage: number): Promise<void> {
    try {
      // Verificar se o exchange está disponível
      const exchange = await this.ensureExchange();
      
      // Implementação específica para Binance - use a API diretamente caso necessário
      // como o setLeverage não está na interface ExchangeInterface
      if ('setLeverage' in exchange) {
        await (exchange as any).setLeverage(leverage, symbol);
      } else {
        console.warn('Método setLeverage não disponível na exchange');
      }
    } catch (error) {
      console.error('Erro ao definir alavancagem:', error);
      throw error;
    }
  }
}

export default BinanceService;
