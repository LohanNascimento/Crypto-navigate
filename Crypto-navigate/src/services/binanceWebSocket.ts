import { Trade, MarketData, Position } from '../types';
import AuthService from './authService';

const WS_URL = 'wss://testnet.binancefuture.com/ws';
const BASE_API_URL = 'https://testnet.binancefuture.com';
const PING_INTERVAL = 30000; // 30 seconds

// Rate limiting configuration - ainda mais conservador
const MAX_REQUESTS_PER_MINUTE = 600; // Muito mais conservador (10% do limite de 6000)
const REQUEST_WINDOW_MS = 60000; // 1 minuto
const RATE_LIMIT_BUFFER = 200; // Buffer maior para evitar chegar perto do limite
const BAN_CHECK_STORAGE_KEY = 'binance-ban-timestamp';

// Interface para armazenar informações sobre banimento de IP
interface BanInfo {
  isBanned: boolean;
  banUntil: number; // timestamp em milissegundos
}

class BinanceWebSocket {
  private static instance: BinanceWebSocket;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private accountSubscribers: Set<(data: any) => void> = new Set();
  private klineSubscribers: Map<string, Set<(data: any) => void>> = new Map();
  private depthSubscribers: Map<string, Set<(data: any) => void>> = new Map();
  private listenKey: string | null = null;
  private listenKeyInterval: NodeJS.Timeout | null = null;
  private authService: AuthService;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 10000;
  private isConnecting: boolean = false;
  private requestTimestamps: number[] = [];
  private pendingRequests: Map<string, { resolve: Function, reject: Function, params: any }[]> = new Map();
  private orderHistoryCache: Map<string, { data: Trade[], timestamp: number }> = new Map();
  private accountInfoCache: { data: any, timestamp: number } | null = null;
  private banInfo: BanInfo = { isBanned: false, banUntil: 0 };
  private lastBanCheckTime: number = 0;
  
  // Propriedade para verificar o status da conexão
  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private constructor() {
    this.authService = AuthService.getInstance();
    this.loadBanInfo();
  }

  public static getInstance(): BinanceWebSocket {
    if (!BinanceWebSocket.instance) {
      BinanceWebSocket.instance = new BinanceWebSocket();
    }
    return BinanceWebSocket.instance;
  }

  // Carregar informações de banimento do localStorage
  private loadBanInfo(): void {
    try {
      const storedBanInfo = localStorage.getItem(BAN_CHECK_STORAGE_KEY);
      if (storedBanInfo) {
        this.banInfo = JSON.parse(storedBanInfo);
        console.log(`Loaded ban info: banned until ${new Date(this.banInfo.banUntil).toLocaleString()}`);
        
        // Verificar se o período de banimento já passou
        if (this.banInfo.isBanned && Date.now() > this.banInfo.banUntil) {
          console.log('Ban period has expired, resetting ban info');
          this.resetBanInfo();
        }
      }
    } catch (err) {
      console.error('Error loading ban info:', err);
      this.resetBanInfo();
    }
  }

  // Resetar informações de banimento
  private resetBanInfo(): void {
    this.banInfo = { isBanned: false, banUntil: 0 };
    localStorage.setItem(BAN_CHECK_STORAGE_KEY, JSON.stringify(this.banInfo));
  }

  // Verificar e atualizar status de banimento
  private checkIfBanned(): boolean {
    // Se não estiver banido ou o período de banimento já passou, não está banido
    if (!this.banInfo.isBanned || Date.now() > this.banInfo.banUntil) {
      if (this.banInfo.isBanned) {
        // Se estava banido mas o período expirou, resetar
        this.resetBanInfo();
      }
      return false;
    }
    
    // Calcular tempo restante do banimento
    const remainingTimeMs = this.banInfo.banUntil - Date.now();
    const remainingTimeMin = Math.ceil(remainingTimeMs / 60000);
    
    // Se verificamos recentemente, apenas logar a cada minuto para evitar spam
    const now = Date.now();
    if (now - this.lastBanCheckTime > 60000) {
      console.warn(`IP is currently banned by Binance for ${remainingTimeMin} more minutes. Using cached data only.`);
      this.lastBanCheckTime = now;
    }
    
    return true;
  }

  // Marcar como banido com base no timestamp retornado pela API
  private setBanned(banUntilTimestamp: number): void {
    this.banInfo = {
      isBanned: true,
      banUntil: banUntilTimestamp
    };
    
    // Persistir no localStorage
    localStorage.setItem(BAN_CHECK_STORAGE_KEY, JSON.stringify(this.banInfo));
    
    // Calcular duração do banimento em minutos
    const banDurationMin = Math.ceil((banUntilTimestamp - Date.now()) / 60000);
    console.warn(`IP has been banned by Binance until ${new Date(banUntilTimestamp).toLocaleString()} (${banDurationMin} minutes). Will use cached data only during this period.`);
  }

  // Detecção de banimento a partir de mensagens de erro
  private detectBanFromError(error: Error): boolean {
    if (!error || !error.message) return false;
    
    // Detectar padrão de erro que indica banimento
    const banRegex = /IP\(.*\) banned until (\d+)/;
    const match = error.message.match(banRegex);
    
    if (match && match[1]) {
      const banUntilTimestamp = parseInt(match[1], 10);
      if (!isNaN(banUntilTimestamp)) {
        this.setBanned(banUntilTimestamp);
        return true;
      }
    }
    
    // Verificar erro 418 (I'm a teapot) que a Binance usa para banimentos
    if (error.message.includes('418') || error.message.toLowerCase().includes('banned')) {
      // Se não conseguimos extrair o timestamp exato, banir por 12 horas por segurança
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      this.setBanned(Date.now() + twelveHoursMs);
      return true;
    }
    
    return false;
  }

  private canMakeRequest(): boolean {
    // Se estiver banido, não pode fazer requisições
    if (this.checkIfBanned()) {
      return false;
    }
    
    const now = Date.now();
    // Remover timestamps mais antigos que REQUEST_WINDOW_MS
    this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < REQUEST_WINDOW_MS);
    
    // Verificar se estamos dentro do limite
    return this.requestTimestamps.length < MAX_REQUESTS_PER_MINUTE - RATE_LIMIT_BUFFER;
  }

  private async waitForRateLimit(): Promise<void> {
    // Se estiver banido, falhar imediatamente
    if (this.checkIfBanned()) {
      throw new Error(`API requests are blocked due to Binance IP ban until ${new Date(this.banInfo.banUntil).toLocaleString()}`);
    }
    
    if (this.canMakeRequest()) {
      this.requestTimestamps.push(Date.now());
      return;
    }
    
    // Se não podemos fazer a requisição agora, aguardar
    console.log('Rate limit reached, waiting for an available slot...');
    return new Promise((resolve, reject) => {
      // Aumentar o tempo máximo de espera para evitar timeouts em situações de alta carga
      const maxWaitTime = 30000; // 30 segundos (aumentado de 10s)
      const startTime = Date.now();
      
      // Calcular quando a próxima slot ficará disponível
      const oldestRequest = this.requestTimestamps.length > 0 ? 
        Math.min(...this.requestTimestamps) : 
        Date.now() - REQUEST_WINDOW_MS;
      
      const nextSlotTime = oldestRequest + REQUEST_WINDOW_MS;
      const waitTime = Math.max(100, nextSlotTime - Date.now());
      
      console.log(`Next request slot available in ~${Math.ceil(waitTime/1000)}s`);
      
      let timeoutId: NodeJS.Timeout | null = null;
      
      const wait = () => {
        // Verificar se excedeu o tempo máximo de espera
        if (Date.now() - startTime > maxWaitTime) {
          console.error(`Timeout after ${maxWaitTime/1000}s waiting for rate limit window`);
          clearTimeout(timeoutId!);
          
          // Se temos muitos timestamps acumulados, limpar os mais antigos para evitar bloqueio permanente
          if (this.requestTimestamps.length > MAX_REQUESTS_PER_MINUTE - RATE_LIMIT_BUFFER - 10) {
            const now = Date.now();
            // Remover 10% dos timestamps mais antigos
            const removeCount = Math.ceil(this.requestTimestamps.length * 0.1);
            this.requestTimestamps.sort((a, b) => a - b);
            this.requestTimestamps = this.requestTimestamps.slice(removeCount);
            console.warn(`Forcibly removed ${removeCount} old timestamps to prevent deadlock`);
          }
          
          reject(new Error(`Timeout waiting for rate limit window (${this.requestTimestamps.length}/${MAX_REQUESTS_PER_MINUTE} requests in window)`));
          return;
        }
        
        // Verificar se estiver banido durante a espera
        if (this.checkIfBanned()) {
          clearTimeout(timeoutId!);
          reject(new Error(`API requests are blocked due to Binance IP ban until ${new Date(this.banInfo.banUntil).toLocaleString()}`));
          return;
        }
        
        if (this.canMakeRequest()) {
          this.requestTimestamps.push(Date.now());
          resolve();
        } else {
          // Usar um intervalo adaptativo - verificar com mais frequência quando estiver próximo do tempo esperado
          const remainingTime = Math.max(100, nextSlotTime - Date.now());
          const checkInterval = Math.min(1000, Math.max(100, remainingTime / 2));
          
          timeoutId = setTimeout(wait, checkInterval);
        }
      };
      
      // Iniciar com um delay proporcional à ocupação atual do rate limit
      // Isso distribui melhor as requisições ao longo do tempo
      const initialDelay = Math.min(1000, waitTime / 2);
      timeoutId = setTimeout(wait, initialDelay);
    });
  }

  private async makeAuthenticatedRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    params: Record<string, string> = {},
    requiresSignature: boolean = true,
    cacheKey?: string,
    cacheTTL: number = 30000, // 30 segundos de cache por padrão
    allowDuringBan: boolean = false // Alguns endpoints podem ser permitidos durante banimento
  ): Promise<T> {
    const credentials = this.authService.getApiCredentials();
    
    if (requiresSignature && !credentials) {
      throw new Error('API credentials not found');
    }
    
    // Verificar se estamos banidos e não é um endpoint permitido durante ban
    if (!allowDuringBan && this.checkIfBanned()) {
      throw new Error(`API requests are blocked due to Binance IP ban until ${new Date(this.banInfo.banUntil).toLocaleString()}`);
    }
    
    // Verificar cache se temos uma chave de cache
    if (cacheKey) {
      const cacheEntry = this.pendingRequests.get(cacheKey);
      
      // Se já existe uma requisição pendente com a mesma chave, 
      // aguarde o resultado em vez de fazer uma nova requisição
      if (cacheEntry && cacheEntry.length > 0) {
        console.log(`Request to ${endpoint} already pending, waiting for result...`);
        return new Promise((resolve, reject) => {
          cacheEntry.push({ resolve, reject, params });
        });
      }
      
      // Criar uma nova entrada no cache de requisições pendentes
      this.pendingRequests.set(cacheKey, []);
    }
    
    // Aguardar o rate limiting
    try {
      await this.waitForRateLimit();
    } catch (error) {
      // Se falhar no rate limiting, rejeitar todas as requisições pendentes
      if (cacheKey && this.pendingRequests.has(cacheKey)) {
        const pending = this.pendingRequests.get(cacheKey) || [];
        pending.forEach(({ reject }) => reject(error));
        this.pendingRequests.delete(cacheKey);
      }
      throw error;
    }
    
    try {
      // Adicionar timestamp se necessário para assinatura
      if (requiresSignature) {
        params.timestamp = Date.now().toString();
      }
      
      let url = `${BASE_API_URL}${endpoint}`;
      let body: string | null = null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      if (credentials?.binanceApiKey) {
        headers['X-MBX-APIKEY'] = credentials.binanceApiKey;
      }
      
      // Adicionar assinatura HMAC se necessário
      let queryString = this.buildQueryString(params);
      if (requiresSignature && credentials) {
        const signature = await this.generateSignature(queryString, credentials.binanceSecretKey);
        queryString = `${queryString}&signature=${signature}`;
      }
      
      // Para GET e DELETE, adicionar parâmetros à URL
      if (method === 'GET' || method === 'DELETE') {
        url = `${url}?${queryString}`;
      } else {
        // Para POST e PUT, adicionar parâmetros ao corpo
        body = queryString;
      }
      
      console.log(`Making ${method} request to ${endpoint}`);
      
      // Configurar timeout para a requisição
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
      
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: method === 'POST' || method === 'PUT' ? body : null,
          signal: controller.signal,
          // Adicionar um modo que permite a solicitação ser feita sem credenciais
          credentials: 'omit',
          // Adicionar modo de cache para requisições que podem ser cacheadas
          cache: method === 'GET' ? 'default' : 'no-store'
        });
        
        // Limpar o timeout quando a resposta chegar
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // Se for erro 418 (I'm a teapot) ou 429 (Too Many Requests), verificar banimento
          if (response.status === 418 || response.status === 429) {
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson && errorJson.code === -1003) {
                // Tentar encontrar o timestamp de banimento
                const banRegex = /IP\(.*\) banned until (\d+)/;
                const match = errorJson.msg.match(banRegex);
                
                if (match && match[1]) {
                  const banUntilTimestamp = parseInt(match[1], 10);
                  if (!isNaN(banUntilTimestamp)) {
                    this.setBanned(banUntilTimestamp);
                  } else {
                    // Se não encontrar timestamp, banir por 12 horas
                    this.setBanned(Date.now() + 12 * 60 * 60 * 1000);
                  }
                } else {
                  // Se não conseguir extrair o timestamp, banir por 12 horas
                  this.setBanned(Date.now() + 12 * 60 * 60 * 1000);
                }
              }
            } catch (parseError) {
              console.error('Error parsing API error response:', parseError);
            }
          }
          
          throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        // Tentar analisar o JSON, se falhar, retornar um objeto vazio
        let data = {};
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Error parsing response JSON:', jsonError);
          // Se não conseguirmos analisar o JSON, retornamos um objeto vazio
          data = {};
        }
        
        // Resolver todas as promessas pendentes com a mesma chave de cache
        if (cacheKey && this.pendingRequests.has(cacheKey)) {
          const pending = this.pendingRequests.get(cacheKey) || [];
          pending.forEach(({ resolve }) => resolve(data));
          this.pendingRequests.delete(cacheKey);
        }
        
        return data as T;
      } catch (fetchError) {
        // Certificar-se de limpar o timeout se a requisição falhar
        clearTimeout(timeoutId);
        
        // Se for um erro de abort (timeout), criar uma mensagem mais descritiva
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds');
        }
        
        // Repassar o erro para o tratamento externo
        throw fetchError;
      }
    } catch (error) {
      // Verificar se o erro indica banimento
      this.detectBanFromError(error as Error);
      
      // Adicionar mais detalhes ao erro para facilitar depuração
      const enhancedError = new Error(
        `Network error while ${method} ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      // Rejeitar todas as promessas pendentes em caso de erro
      if (cacheKey && this.pendingRequests.has(cacheKey)) {
        const pending = this.pendingRequests.get(cacheKey) || [];
        pending.forEach(({ reject }) => reject(enhancedError));
        this.pendingRequests.delete(cacheKey);
      }
      
      throw enhancedError;
    }
  }

  public async connect() {
    // Evitar múltiplas tentativas de conexão simultâneas
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('Connection already in progress or established');
      return;
    }
    
    this.isConnecting = true;

    try {
      // Get API credentials
      const credentials = this.authService.getApiCredentials();
      
      // Iniciar conexão WebSocket primeiro, sem depender do listenKey
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.startPingInterval();
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Resubscribe to all active streams
        this.resubscribeAll();
        
        // Após a conexão bem-sucedida, tentar obter o listenKey se tiver credenciais
        if (credentials?.binanceApiKey && this.accountSubscribers.size > 0) {
          this.getListenKey(credentials.binanceApiKey)
            .then(listenKey => {
              if (listenKey && this.ws?.readyState === WebSocket.OPEN) {
                this.sendSubscription([listenKey]);
              }
            })
            .catch(err => {
              console.error('Failed to get listen key after connection:', err);
            });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
        this.stopPingInterval();
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  private async getListenKey(apiKey: string): Promise<string | null> {
    // Se estiver banido, não tentar obter listenKey
    if (this.checkIfBanned()) {
      console.warn('Cannot get listen key: IP is banned');
      return null;
    }
    
    try {
      if (this.listenKey) {
        return this.listenKey;
      }

      const data = await this.makeAuthenticatedRequest<{ listenKey: string }>(
        '/fapi/v1/listenKey',
        'POST',
        {},
        false, // Não requer assinatura, apenas API key no header
        'listenKey',
        30000, // Cache por 30 segundos
        true // Permitir durante banimento (não tem impacto no rate limit)
      );
      
      this.listenKey = data.listenKey;
      this.startListenKeyRefresh(apiKey);
      return this.listenKey;
    } catch (error) {
      console.error('Failed to get listen key:', error);
      this.detectBanFromError(error as Error);
      return null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => this.connect(), delay);
    } else {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
      
      // Resetar contador e tentar novamente após um período mais longo
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 60000); // 1 minuto
    }
  }

  private resubscribeAll() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Resubscribe to market tickers
    this.subscribers.forEach((_, symbol) => {
      this.sendSubscription([`${symbol.toLowerCase()}@ticker`]);
    });

    // Resubscribe to klines
    this.klineSubscribers.forEach((_, key) => {
      const [symbol, interval] = key.split('_');
      this.sendSubscription([`${symbol.toLowerCase()}@kline_${interval}`]);
    });

    // Resubscribe to depth
    this.depthSubscribers.forEach((_, symbol) => {
      this.sendSubscription([`${symbol.toLowerCase()}@depth20@100ms`]);
    });

    // Resubscribe to user data stream if we have a listenKey
    if (this.listenKey && this.accountSubscribers.size > 0) {
      this.sendSubscription([this.listenKey]);
    }
  }

  private startListenKeyRefresh(apiKey: string) {
    if (this.listenKeyInterval) {
      clearInterval(this.listenKeyInterval);
    }

    // Refresh a cada 55 minutos (o listenKey expira em 60 minutos)
    this.listenKeyInterval = setInterval(async () => {
      try {
        if (!this.listenKey) return;
        
        await this.makeAuthenticatedRequest(
          '/fapi/v1/listenKey',
          'PUT',
          {},
          false, // Não requer assinatura
          'refreshListenKey'
        );
      } catch (error) {
        console.error('Failed to refresh listen key:', error);
        
        // Se falhar em atualizar, tentar obter um novo
        this.listenKey = null;
        this.getListenKey(apiKey).catch(err => {
          console.error('Failed to get new listen key after refresh failure:', err);
        });
      }
    }, 55 * 60 * 1000); // 55 minutos
  }

  private handleMessage(data: any) {
    // Handle pong response
    if (data.id === 'pong') {
      return;
    }

    // Handle ticker data
    if (data.e === '24hrTicker') {
      const symbol = data.s;
      if (symbol && this.subscribers.has(symbol)) {
        const marketData: MarketData = {
          symbol: data.s,
          price: parseFloat(data.c),
          change: parseFloat(data.p),
          changePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          lastUpdated: new Date().toISOString()
        };
        
        this.subscribers.get(symbol)?.forEach(callback => {
          try {
            callback(marketData);
          } catch (err) {
            console.error(`Error in market data callback for ${symbol}:`, err);
          }
        });
      }
    } 
    // Handle kline data
    else if (data.e === 'kline') {
      const symbol = data.s;
      const interval = data.k.i;
      const key = `${symbol}_${interval}`;
      
      if (this.klineSubscribers.has(key)) {
        const kline = {
          time: data.k.t,
          open: parseFloat(data.k.o),
          high: parseFloat(data.k.h),
          low: parseFloat(data.k.l),
          close: parseFloat(data.k.c),
          volume: parseFloat(data.k.v),
          isClosed: data.k.x
        };
        
        this.klineSubscribers.get(key)?.forEach(callback => {
          try {
            callback(kline);
          } catch (err) {
            console.error(`Error in kline callback for ${key}:`, err);
          }
        });
      }
    }
    // Handle depth data
    else if (data.e === 'depthUpdate') {
      const symbol = data.s;
      if (symbol && this.depthSubscribers.has(symbol)) {
        this.depthSubscribers.get(symbol)?.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error(`Error in depth callback for ${symbol}:`, err);
          }
        });
      }
    }
    // Handle account updates (positions, balances, orders)
    else if (data.e === 'ACCOUNT_UPDATE' || data.e === 'ORDER_TRADE_UPDATE') {
      this.accountSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in account update callback:`, err);
        }
      });
    }
  }

  private sendSubscription(params: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not open, cannot subscribe');
      return;
    }
    
    try {
      this.ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params,
        id: Date.now()
      }));
    } catch (err) {
      console.error('Error sending subscription:', err);
    }
  }
  
  private sendUnsubscription(params: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not open, cannot unsubscribe');
      return;
    }
    
    try {
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params,
        id: Date.now()
      }));
    } catch (err) {
      console.error('Error sending unsubscription:', err);
    }
  }

  // Subscribe to ticker for a specific symbol
  public subscribe(symbol: string, callback: (data: MarketData) => void) {
    // Iniciar conexão se ainda não estiver conectado
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription([`${symbol.toLowerCase()}@ticker`]);
      }
    }
    this.subscribers.get(symbol)?.add(callback);
  }

  // Subscribe to klines for a specific symbol and interval
  public subscribeKlines(symbol: string, interval: string, callback: (data: any) => void) {
    // Iniciar conexão se ainda não estiver conectado
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    const key = `${symbol}_${interval}`;
    if (!this.klineSubscribers.has(key)) {
      this.klineSubscribers.set(key, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription([`${symbol.toLowerCase()}@kline_${interval}`]);
      }
    }
    this.klineSubscribers.get(key)?.add(callback);
  }

  // Subscribe to depth for a specific symbol
  public subscribeDepth(symbol: string, callback: (data: any) => void) {
    // Iniciar conexão se ainda não estiver conectado
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    if (!this.depthSubscribers.has(symbol)) {
      this.depthSubscribers.set(symbol, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendSubscription([`${symbol.toLowerCase()}@depth20@100ms`]);
      }
    }
    this.depthSubscribers.get(symbol)?.add(callback);
  }

  // Subscribe to account updates (balance, positions, orders)
  public subscribeAccount(callback: (data: any) => void) {
    this.accountSubscribers.add(callback);
    
    // Start connection if not already connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    } else if (this.listenKey) {
      this.sendSubscription([this.listenKey]);
    }
  }

  // Unsubscribe from ticker
  public unsubscribe(symbol: string, callback: (data: any) => void) {
    const subscribers = this.subscribers.get(symbol);
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.subscribers.delete(symbol);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendUnsubscription([`${symbol.toLowerCase()}@ticker`]);
        }
      }
    }
  }

  // Unsubscribe from klines
  public unsubscribeKlines(symbol: string, interval: string, callback: (data: any) => void) {
    const key = `${symbol}_${interval}`;
    const subscribers = this.klineSubscribers.get(key);
    
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.klineSubscribers.delete(key);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendUnsubscription([`${symbol.toLowerCase()}@kline_${interval}`]);
        }
      }
    }
  }

  // Unsubscribe from depth
  public unsubscribeDepth(symbol: string, callback: (data: any) => void) {
    const subscribers = this.depthSubscribers.get(symbol);
    
    if (subscribers) {
      subscribers.delete(callback);
      
      if (subscribers.size === 0) {
        this.depthSubscribers.delete(symbol);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendUnsubscription([`${symbol.toLowerCase()}@depth20@100ms`]);
        }
      }
    }
  }

  // Unsubscribe from account updates
  public unsubscribeAccount(callback: (data: any) => void) {
    this.accountSubscribers.delete(callback);
    
    if (this.accountSubscribers.size === 0 && this.listenKey && this.ws?.readyState === WebSocket.OPEN) {
      this.sendUnsubscription([this.listenKey]);
    }
  }

  // Send order via REST API (WebSocket doesn't support order placement)
  public async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number,
    leverage?: number
  ): Promise<Trade> {
    try {
      // Verificar conectividade antes de tentar enviar ordem
      if (!navigator.onLine) {
        throw new Error('No internet connection available');
      }
      
      // Verificar se o WebSocket está conectado
      if (!this.isConnected) {
        console.warn('WebSocket is not connected, attempting to connect before placing order');
        await this.connect();
      }
      
      // Validar parâmetros
      if (!symbol || !side || !type || !quantity || quantity <= 0) {
        throw new Error('Invalid order parameters');
      }
      
      // Para ordens LIMIT, o preço é obrigatório
      if (type === 'LIMIT' && (!price || price <= 0)) {
        throw new Error('Price is required for LIMIT orders');
      }
      
      // Set leverage first if specified
      if (leverage) {
        try {
          await this.setLeverage(symbol, leverage);
        } catch (leverageError) {
          console.warn('Failed to set leverage, proceeding with order anyway:', leverageError);
          // Não interromper a ordem só porque a alavancagem falhou
        }
      }
      
      const params: Record<string, string> = {
        symbol: symbol.replace('/', ''),
        side,
        type,
        quantity: quantity.toString()
      };
      
      if (price && type === 'LIMIT') {
        params.price = price.toString();
      }
      
      // Adicionar timeInForce para ordens LIMIT
      if (type === 'LIMIT') {
        params.timeInForce = 'GTC'; // Good Till Cancelled
      }
      
      console.log('Placing order with params:', params);
      
      // Tentar até 3 vezes com backoff
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const data = await this.makeAuthenticatedRequest<any>(
            '/fapi/v1/order',
            'POST',
            params,
            true,
            `order_${symbol}_${side}_${type}_${quantity}_${price || ''}`
          );
          
          return {
            id: data.orderId?.toString() || String(Date.now()),
            symbol: data.symbol || symbol.replace('/', ''),
            side: data.side || side,
            status: data.status || 'NEW',
            quantity: parseFloat(data.origQty) || quantity,
            price: parseFloat(data.price) || price || 0,
            entryPrice: parseFloat(data.price) || parseFloat(data.avgPrice) || price || 0,
            entryTime: data.time ? new Date(data.time).toISOString() : new Date().toISOString(),
            type: data.type || type,
            timestamp: data.time || Date.now(),
            leverage: leverage || 1
          } as Trade;
        } catch (error) {
          attempts++;
          
          // Se for último attempt ou erro de credenciais/parâmetros, não tentar novamente
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          if (
            attempts >= maxAttempts || 
            errorMsg.includes('Invalid API-key') || 
            errorMsg.includes('Signature') ||
            errorMsg.includes('Parameter') ||
            errorMsg.includes('banned')
          ) {
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, attempts) * 1000;
          console.warn(`Order attempt ${attempts} failed, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw new Error(`Failed to place order after ${maxAttempts} attempts`);
    } catch (error) {
      console.error('Error placing order:', error);
      
      // Melhorar a mensagem de erro para o usuário
      let userMessage = 'Failed to place order';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          userMessage = 'Network error: Could not connect to Binance API. Please check your internet connection.';
        } else if (error.message.includes('banned')) {
          userMessage = `Your IP is currently banned by Binance. Please try again later.`;
        } else if (error.message.includes('Invalid API-key')) {
          userMessage = 'Invalid API credentials. Please check your API key and secret.';
        } else if (error.message.includes('Signature')) {
          userMessage = 'Authentication error. Please check your API credentials.';
        } else if (error.message.includes('Parameter')) {
          userMessage = 'Invalid order parameters. Please check your order details.';
        } else {
          userMessage = `Error: ${error.message}`;
        }
      }
      
      throw new Error(userMessage);
    }
  }

  // Set leverage via REST API
  private async setLeverage(
    symbol: string, 
    leverage: number
  ): Promise<void> {
    try {
      await this.makeAuthenticatedRequest(
        '/fapi/v1/leverage',
        'POST',
        {
          symbol: symbol.replace('/', ''),
          leverage: leverage.toString()
        },
        true,
        `leverage_${symbol}_${leverage}`
      );
    } catch (error) {
      console.error('Error setting leverage:', error);
      throw error;
    }
  }

  // Get account information via REST API
  public async getAccountInfo(): Promise<any> {
    // Verificar cache primeiro - usar um tempo de cache mais longo para reduzir chamadas
    const now = Date.now();
    if (this.accountInfoCache && now - this.accountInfoCache.timestamp < 60000) { // Cache por 1 minuto (aumentado de 30s)
      return this.accountInfoCache.data;
    }
    
    // Se estiver banido e não tivermos cache, retornar erro ou dados mockados
    if (this.checkIfBanned()) {
      if (this.accountInfoCache) {
        console.warn('Using expired account info cache due to IP ban');
        return this.accountInfoCache.data;
      }
      
      // Se não temos nenhum cache, retornar uma estrutura mínima mockada
      console.warn('Returning mock account info due to IP ban');
      return {
        positions: [],
        assets: [],
        canTrade: false,
        canDeposit: false,
        canWithdraw: false,
        updateTime: Date.now(),
        totalWalletBalance: "0.00000000"
      };
    }
    
    try {
      // Verificar se já existe uma solicitação em andamento
      const cacheKey = 'account_info';
      if (this.pendingRequests.has(cacheKey) && this.pendingRequests.get(cacheKey)?.length) {
        console.log('Account info request already in progress, waiting for result...');
        return new Promise((resolve, reject) => {
          this.pendingRequests.get(cacheKey)?.push({ resolve, reject, params: {} });
        });
      }
      
      this.pendingRequests.set(cacheKey, []);
      
      const data = await this.makeAuthenticatedRequest<any>(
        '/fapi/v2/account',
        'GET',
        {},
        true,
        cacheKey,
        60000 // Cache por 1 minuto
      );
      
      // Atualizar cache mesmo em caso de falha parcial
      if (data) {
        this.accountInfoCache = {
          data,
          timestamp: now
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error getting account info:', error);
      
      this.detectBanFromError(error as Error);
      
      // Se estamos banidos e temos cache, mesmo que expirado, devolver o cache
      if ((this.checkIfBanned() || error.toString().includes('rate limit')) && this.accountInfoCache) {
        console.warn('Using expired account info cache due to rate limit or ban');
        return this.accountInfoCache.data;
      }
      
      throw error;
    }
  }

  // Get open positions com melhor gerenciamento de cache e retentativas
  public async getOpenPositions(): Promise<Position[]> {
    // Usar cacheKey para controlar solicitações pendentes
    const cacheKey = 'open_positions';
    
    try {
      // Se já existe uma solicitação em andamento, aguardar pelo resultado
      if (this.pendingRequests.has(cacheKey) && this.pendingRequests.get(cacheKey)?.length) {
        console.log('Open positions request already in progress, waiting for result...');
        return new Promise((resolve, reject) => {
          this.pendingRequests.get(cacheKey)?.push({ resolve, reject, params: {} });
        });
      }
      
      // Criar uma entrada para esta solicitação no map de solicitações pendentes
      this.pendingRequests.set(cacheKey, []);
      
      // Tentar obter dados da conta com tratamento de falhas aprimorado
      let retryCount = 0;
      const maxRetries = 3;
      const accountInfo = await this.getAccountInfo().catch(async (error) => {
        // Se falhar por rate limit, tentar novamente com backoff exponencial
        if (error.toString().includes('rate limit') && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          console.warn(`Retrying getOpenPositions in ${delay}ms due to rate limit (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getAccountInfo();
        }
        throw error;
      });
      
      // Se temos os dados da conta, extrair as posições abertas
      if (accountInfo && accountInfo.positions) {
        const positions = accountInfo.positions
          .filter((position: any) => parseFloat(position.positionAmt) !== 0)
          .map((position: any) => ({
            symbol: position.symbol,
            side: parseFloat(position.positionAmt) > 0 ? 'LONG' : 'SHORT',
            size: Math.abs(parseFloat(position.positionAmt)),
            entryPrice: parseFloat(position.entryPrice),
            markPrice: parseFloat(position.markPrice),
            unrealizedPnL: parseFloat(position.unrealizedProfit),
            leverage: parseFloat(position.leverage)
          }));
        
        // Resolver todas as solicitações pendentes com o mesmo resultado
        const pendingRequests = this.pendingRequests.get(cacheKey) || [];
        pendingRequests.forEach(({ resolve }) => resolve(positions));
        this.pendingRequests.delete(cacheKey);
        
        return positions;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting open positions:', error);
      this.detectBanFromError(error as Error);
      
      // Rejeitar todas as solicitações pendentes
      const pendingRequests = this.pendingRequests.get(cacheKey) || [];
      pendingRequests.forEach(({ reject }) => reject(error));
      this.pendingRequests.delete(cacheKey);
      
      // Retornar um array vazio em caso de erro
      return [];
    }
  }

  // Get order history with caching
  public async getOrderHistory(symbol?: string): Promise<Trade[]> {
    const cacheKey = `orderHistory_${symbol || 'all'}`;
    const now = Date.now();
    const cachedEntry = this.orderHistoryCache.get(cacheKey);
    
    // Verificar cache
    if (cachedEntry && now - cachedEntry.timestamp < 60000) { // Cache por 1 minuto
      return cachedEntry.data;
    }
    
    // Se estiver banido, tentar usar cache mesmo que expirado
    if (this.checkIfBanned()) {
      if (cachedEntry) {
        console.warn('Using expired order history cache due to IP ban');
        return cachedEntry.data;
      }
      
      // Se não tem cache, retornar um array vazio e alertar
      console.warn('Cannot fetch order history: IP is banned. Returning empty array.');
      return [];
    }
    
    try {
      const params: Record<string, string> = {
        limit: '50' // Default limit
      };
      
      if (symbol) {
        params.symbol = symbol.replace('/', '');
      }
      
      const orders = await this.makeAuthenticatedRequest<any[]>(
        '/fapi/v1/allOrders',
        'GET',
        params,
        true,
        `orders_${symbol || 'all'}`,
        60000 // Cache por 1 minuto
      );
      
      const trades: Trade[] = orders.map((order: any) => ({
        id: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price),
        entryPrice: parseFloat(order.avgPrice) || parseFloat(order.price) || 0,
        entryTime: new Date(order.time).toISOString(),
        status: order.status,
        timestamp: order.time,
        leverage: 1 // Leverage not provided in order history
      }));
      
      // Atualizar cache
      this.orderHistoryCache.set(cacheKey, {
        data: trades,
        timestamp: now
      });
      
      return trades;
    } catch (error) {
      console.error('Error getting order history:', error);
      
      // Verificar se o erro indica banimento
      this.detectBanFromError(error as Error);
      
      // Em caso de erro de rate limit ou banimento, retornar dados do cache se disponíveis
      if (cachedEntry) {
        console.log('Using cached order history due to API error');
        return cachedEntry.data;
      }
      
      throw error;
    }
  }

  // Método para verificar o status de banimento - útil para UI
  public getBanStatus(): { isBanned: boolean, banUntil: number, remainingMinutes: number } {
    this.checkIfBanned(); // Isso atualizará o ban status se necessário
    const remainingMs = Math.max(0, this.banInfo.banUntil - Date.now());
    return {
      isBanned: this.banInfo.isBanned && remainingMs > 0,
      banUntil: this.banInfo.banUntil,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000))
    };
  }

  // Helper method to build query string
  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  // Helper method to generate HMAC signature
  private async generateSignature(queryString: string, secretKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = encoder.encode(secretKey);
    const message = encoder.encode(queryString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopPingInterval();
    if (this.listenKeyInterval) {
      clearInterval(this.listenKeyInterval);
      this.listenKeyInterval = null;
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ method: 'ping', id: 'pong' }));
        } catch (err) {
          console.error('Error sending ping:', err);
        }
      }
    }, PING_INTERVAL);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export default BinanceWebSocket; 