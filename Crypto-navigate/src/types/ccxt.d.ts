declare module 'ccxt' {
  // Definições simplificadas para CCXT
  export class Exchange {
    constructor(config?: any);
    
    // Métodos comuns
    async fetchTicker(symbol: string, params?: any): Promise<any>;
    async fetchOHLCV(symbol: string, timeframe?: string, since?: number, limit?: number, params?: any): Promise<any[]>;
    async fetchBalance(params?: any): Promise<any>;
    async createOrder(symbol: string, type: string, side: string, amount: number, price?: number, params?: any): Promise<any>;
    async cancelOrder(id: string, symbol?: string, params?: any): Promise<any>;
    async fetchOrders(symbol?: string, since?: number, limit?: number, params?: any): Promise<any[]>;
    async fetchOpenOrders(symbol?: string, since?: number, limit?: number, params?: any): Promise<any[]>;
    async fetchClosedOrders(symbol?: string, since?: number, limit?: number, params?: any): Promise<any[]>;
    
    // Propriedades
    markets: any;
    symbols: string[];
    id: string;
    apiKey: string;
    secret: string;
  }
  
  // Exportar classes específicas para testes e funcionalidades básicas
  export class binance extends Exchange {}
  export class binanceusdm extends Exchange {}
  
  // Namespace para utilitários
  export namespace exchanges {
    const ids: string[];
  }
} 