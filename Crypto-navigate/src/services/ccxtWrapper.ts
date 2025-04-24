/**
 * Wrapper seguro para a biblioteca CCXT que lida com erros de importação e polyfills
 */

// Declare o tipo para a variável global ccxt
declare global {
  interface Window {
    ccxt: any;
  }
}

// Funções dummy para caso a biblioteca CCXT não possa ser carregada
const dummyExchange: ExchangeInterface = {
  async fetchTicker() { return {}; },
  async fetchOHLCV() { return []; },
  async fetchBalance() { return { info: {}, total: {}, free: {}, used: {} }; },
  async createOrder() { return { id: 'dummy' }; },
  async cancelOrder() { return {}; },
  async fetchOrders() { return []; },
  async fetchOpenOrders() { return []; },
  async fetchClosedOrders() { return []; },
  async loadMarkets() { return {}; },
  checkRequiredCredentials() { return; },
  async fetchPositions() { return []; },
  async setLeverage() { return {}; },
  markets: {},
  symbols: [],
};

// Interface para garantir que o tipo seja compatível
export interface ExchangeInterface {
  fetchTicker: (symbol: string, params?: any) => Promise<any>;
  fetchOHLCV: (symbol: string, timeframe?: string, since?: number, limit?: number, params?: any) => Promise<any[]>;
  fetchBalance: (params?: any) => Promise<any>;
  createOrder: (symbol: string, type: string, side: string, amount: number, price?: number, params?: any) => Promise<any>;
  cancelOrder: (id: string, symbol?: string, params?: any) => Promise<any>;
  fetchOrders: (symbol?: string, since?: number, limit?: number, params?: any) => Promise<any[]>;
  fetchOpenOrders: (symbol?: string, since?: number, limit?: number, params?: any) => Promise<any[]>;
  fetchClosedOrders: (symbol?: string, since?: number, limit?: number, params?: any) => Promise<any[]>;
  loadMarkets?: () => Promise<any>;
  checkRequiredCredentials?: () => void;
  fetchPositions?: (symbols?: string[], params?: any) => Promise<any[]>;
  setLeverage?: (leverage: number, symbol: string, params?: any) => Promise<any>;
  markets: any;
  symbols: string[];
}

// Variável que armazenará a biblioteca CCXT quando (e se) for carregada
let ccxtModule: any = null;
let ccxtLoaded = false;
let isLoading = false;
let loadError: Error | null = null;

/**
 * Carrega a biblioteca CCXT de forma assíncrona e segura
 */
export async function loadCCXT(): Promise<boolean> {
  if (ccxtLoaded) return true;
  if (isLoading) {
    // Aguardar até que o carregamento seja concluído
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return ccxtLoaded;
  }
  
  isLoading = true;
  
  try {
    // Primeiro verificar se o CCXT está disponível globalmente (carregado via CDN)
    if (typeof window !== 'undefined' && window.ccxt) {
      console.log('CCXT encontrado globalmente (via CDN)');
      ccxtModule = window.ccxt;
      ccxtLoaded = true;
      return true;
    }
    
    // Tentar importar a biblioteca CCXT
    console.log('Tentando importar CCXT dinamicamente...');
    ccxtModule = await import('ccxt');
    ccxtLoaded = true;
    loadError = null;
    console.log('CCXT carregado com sucesso via import');
    return true;
  } catch (error) {
    console.error('Erro ao carregar CCXT:', error);
    loadError = error as Error;
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Cria uma instância de uma exchange da CCXT
 * @param exchangeId ID da exchange (ex: 'binance', 'binanceusdm')
 * @param config Configuração da exchange
 * @returns Instância da exchange ou uma exchange dummy em caso de erro
 */
export async function createExchange(exchangeId: string, config: any = {}): Promise<ExchangeInterface> {
  await loadCCXT();
  
  if (!ccxtLoaded || !ccxtModule) {
    console.warn(`CCXT não disponível, usando exchange simulada para ${exchangeId}`);
    return dummyExchange;
  }
  
  try {
    const ExchangeClass = ccxtModule[exchangeId];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeId} não encontrada na CCXT`);
    }
    
    return new ExchangeClass(config);
  } catch (error) {
    console.error(`Erro ao criar exchange ${exchangeId}:`, error);
    return dummyExchange;
  }
}

/**
 * Retorna a lista de exchanges disponíveis na CCXT
 */
export async function getAvailableExchanges(): Promise<string[]> {
  await loadCCXT();
  
  if (!ccxtLoaded || !ccxtModule) {
    return ['binance', 'binanceusdm']; // Retorna valores padrão para o caso de falha
  }
  
  return ccxtModule.exchanges || [];
}

/**
 * Verifica se a CCXT está carregada e disponível
 */
export function isCCXTAvailable(): boolean {
  // Verificar também a disponibilidade global
  if (typeof window !== 'undefined' && window.ccxt) {
    return true;
  }
  return ccxtLoaded && !!ccxtModule;
}

/**
 * Retorna o erro de carregamento da CCXT, se houver
 */
export function getCCXTLoadError(): Error | null {
  return loadError;
} 