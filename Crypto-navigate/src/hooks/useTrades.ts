import { useState, useCallback, useEffect, useRef } from 'react';
import { Trade, Position } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateMockTrades } from '../utils/mockData';
import BinanceWebSocket from '../services/binanceWebSocket';
import AuthService from '../services/authService';

// Flag para usar dados mockados durante o desenvolvimento
const USE_MOCK_DATA = false;
// Intervalo mínimo para atualização de dados (para evitar chamadas excessivas)
const MIN_REFRESH_INTERVAL = 30000; // 30 segundos
// Tempo para aguardar entre tentativas quando ocorrer um erro
const ERROR_RETRY_INTERVAL = 5 * 60 * 1000; // 5 minutos

export const useTrades = () => {
  const [trades, setTrades] = useLocalStorage<Trade[]>('crypto-trades', []);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para controlar quando ocorreu a última atualização
  const lastPositionsUpdate = useRef<number>(0);
  const lastTradesUpdate = useRef<number>(0);
  const lastErrorTime = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);
  const isMounted = useRef<boolean>(true);
  
  const webSocket = BinanceWebSocket.getInstance();
  const authService = AuthService.getInstance();

  // Verificar se o IP está banido antes de fazer chamadas REST
  const checkBanStatus = useCallback(() => {
    return webSocket.getBanStatus();
  }, [webSocket]);

  const retryWithBackoff = async (fn, retries = 5, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries) throw error;
        const backoffDelay = delay * Math.pow(2, attempt);
        console.log(`Retrying in ${backoffDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  };

  const fetchPositions = useCallback(async (force = false) => {
    const now = Date.now();
    const banStatus = checkBanStatus();
    if (banStatus.isBanned) {
      console.log(`Skipping positions fetch due to IP ban (${banStatus.remainingMinutes} minutes remaining)`);
      setIsLoading(false);
      if (positions.length > 0 && now - lastErrorTime.current < ERROR_RETRY_INTERVAL) {
        return;
      }
      if (now - lastErrorTime.current > ERROR_RETRY_INTERVAL) {
        setError(`Using cached positions data due to Binance IP ban (${banStatus.remainingMinutes} min remaining)`);
        lastErrorTime.current = now;
      }
      return;
    }
    if (!force && now - lastPositionsUpdate.current < MIN_REFRESH_INTERVAL) {
      console.log(`Skipping positions update, last update was ${(now - lastPositionsUpdate.current) / 1000}s ago`);
      return;
    }
    try {
      setIsLoading(true);
      if (USE_MOCK_DATA) {
        const mockPositions = [
          {
            symbol: 'BTCUSDT',
            side: 'LONG' as const,
            size: 0.1,
            entryPrice: 50000,
            markPrice: 51000,
            unrealizedPnL: 100,
            leverage: 10
          }
        ];
        setPositions(mockPositions);
        return;
      }
      const data = await retryWithBackoff(() => webSocket.getOpenPositions());
      if (!isMounted.current) return;
      setPositions(data);
      lastPositionsUpdate.current = now;
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error fetching positions:', err);
      if (!isMounted.current) return;
      if (errorMessage.includes('ban') || errorMessage.includes('418')) {
        const banStatus = checkBanStatus();
        if (banStatus.isBanned) {
          setError(`Using cached positions data due to Binance IP ban (${banStatus.remainingMinutes} min remaining)`);
        } else {
          if (now - lastPositionsUpdate.current > ERROR_RETRY_INTERVAL) {
            setError('Failed to fetch positions. Using cached data.');
          }
        }
      } else {
        if (now - lastPositionsUpdate.current > ERROR_RETRY_INTERVAL) {
          setError('Failed to fetch positions. Using cached data.');
        }
      }
      lastErrorTime.current = now;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [webSocket, positions.length, checkBanStatus]);

  const syncTradesFromBinance = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Verificar se estamos banidos
    const banStatus = checkBanStatus();
    if (banStatus.isBanned) {
      console.log(`Skipping trades sync due to IP ban (${banStatus.remainingMinutes} minutes remaining)`);
      
      // Ainda atualizar estado de carregamento
      setIsLoading(false);
      
      // Se já temos trades e o último erro foi recente, não mostrar erro
      if (trades.length > 0 && now - lastErrorTime.current < ERROR_RETRY_INTERVAL) {
        return;
      }
      
      // Atualizar mensagem de erro apenas se não foi recentemente atualizada
      if (now - lastErrorTime.current > ERROR_RETRY_INTERVAL) {
        setError(`Using cached trades data due to Binance IP ban (${banStatus.remainingMinutes} min remaining)`);
        lastErrorTime.current = now;
      }
      return;
    }
    
    // Verificar se já passou o intervalo mínimo desde a última atualização
    if (!force && now - lastTradesUpdate.current < MIN_REFRESH_INTERVAL) {
      console.log(`Skipping trades update, last update was ${(now - lastTradesUpdate.current) / 1000}s ago`);
      return;
    }
    
    try {
      setIsLoading(true);

      if (USE_MOCK_DATA) {
        // Mock data implementation
        const mockTrades = [
          {
            id: '1',
            symbol: 'BTCUSDT',
            side: 'BUY' as const,
            type: 'MARKET' as const,
            quantity: 0.1,
            price: 50000,
            entryPrice: 50000,
            entryTime: new Date().toISOString(),
            timestamp: Date.now(),
            status: 'FILLED' as const,
            leverage: 10
          }
        ];
        setTrades(mockTrades);
        return;
      }

      const data = await webSocket.getOrderHistory('BTCUSDT');
      
      if (!isMounted.current) return;
      
      setTrades(data);
      lastTradesUpdate.current = now;
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Error syncing trades:', err);
      
      if (!isMounted.current) return;
      
      // Verificar se o erro pode ser devido a banimento
      if (errorMessage.includes('ban') || errorMessage.includes('418')) {
        // Verificar novamente o status de banimento
        const banStatus = checkBanStatus();
        if (banStatus.isBanned) {
          setError(`Using cached trades data due to Binance IP ban (${banStatus.remainingMinutes} min remaining)`);
        } else {
          // Se a última atualização foi há muito tempo, mostrar erro
          if (now - lastTradesUpdate.current > ERROR_RETRY_INTERVAL) {
            setError('Failed to sync trades. Using cached data.');
          }
        }
      } else {
        // Se a última atualização foi há muito tempo, mostrar erro genérico
        if (now - lastTradesUpdate.current > ERROR_RETRY_INTERVAL) {
          setError('Failed to sync trades. Using cached data.');
        }
      }
      
      lastErrorTime.current = now;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [webSocket, setTrades, trades.length, checkBanStatus]);

  const createOrder = useCallback(async (
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number,
    leverage?: number
  ): Promise<Trade> => {
    try {
      // Verificar se estamos banidos antes de tentar criar ordem
      const banStatus = checkBanStatus();
      if (banStatus.isBanned) {
        throw new Error(`Cannot place orders: Binance IP ban active for ${banStatus.remainingMinutes} more minutes`);
      }
      
      setIsLoading(true);
      setError(null);
      
      const trade = await webSocket.placeOrder(
        symbol,
        side,
        type,
        quantity,
        price,
        leverage
      );
      
      // Adicionar o novo trade à lista
      setTrades(prev => {
        // Verificar se já existe um trade com o mesmo ID
        const existingIndex = prev.findIndex(t => t.id === trade.id);
        if (existingIndex >= 0) {
          // Substituir o existente
          const updated = [...prev];
          updated[existingIndex] = trade;
          return updated;
        } else {
          // Adicionar novo
          return [...prev, trade];
        }
      });
      
      // Atualizar posições forçando a atualização
      await fetchPositions(true);
      
      return trade;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar ordem';
      setError(errorMessage);
      console.error('Error creating order:', error);
      
      // Verificar se foi banido durante a tentativa
      checkBanStatus();
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPositions, setTrades, webSocket, checkBanStatus]);

  // Função para inicializar dados com verificação de status de banimento
  const initializeData = useCallback(async () => {
    if (hasInitialized.current) {
      return;
    }
    
    if (!authService.hasApiCredentials()) {
      return;
    }
    
    try {
      // Verificar se estamos banidos
      const banStatus = checkBanStatus();
      
      // Tentar conectar o WebSocket primeiro (isso sempre funciona mesmo com banimento)
      await webSocket.connect();
      
      // Se não estiver banido, buscar dados iniciais em sequência
      if (!banStatus.isBanned) {
        // Aguardar um tempo entre chamadas para evitar rate limit
        await fetchPositions(true);
        
        // Aguardar um pouco antes da próxima chamada
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted.current) return;
        
        await syncTradesFromBinance(true);
      } else {
        console.warn(`Initialization limited due to Binance IP ban (${banStatus.remainingMinutes} minutes remaining). Using cached data if available.`);
      }
      
      hasInitialized.current = true;
    } catch (err) {
      console.error('Failed to initialize data:', err);
      // Não definir erro aqui para evitar mensagens de erro na inicialização
    }
  }, [authService, webSocket, fetchPositions, syncTradesFromBinance, checkBanStatus]);

  useEffect(() => {
    isMounted.current = true;
    
    // Initial data fetch - com atraso para evitar muitas chamadas simultâneas
    setTimeout(() => {
      initializeData();
    }, 1000);

    // Set up WebSocket for account updates
    const handleAccountUpdate = (data: {
      e: string;
      a?: {
        P?: Array<{
          s: string;      // Symbol
          pa: string;     // Position Amount
          ep: string;     // Entry Price
          mp?: string;    // Mark Price
          up: string;     // Unrealized PnL
          l?: string;     // Leverage
        }>;
      };
      o?: {
        i: number;        // Order ID
        s: string;        // Symbol
        S: 'BUY' | 'SELL'; // Side
        X: string;        // Status
        q: string;        // Quantity
        p: string;        // Price
        ap?: string;      // Average Price
        T: number;        // Transaction Time
        o: string;        // Order Type
        lev?: string;     // Leverage
      };
    }) => {
      if (data.e === 'ACCOUNT_UPDATE') {
        // Parse positions from ACCOUNT_UPDATE event
        if (data.a && data.a.P) {
          const updatedPositions = data.a.P
            .filter((position: { pa: string }) => parseFloat(position.pa) !== 0)
            .map((position: { 
              s: string;      // Symbol
              pa: string;     // Position Amount
              ep: string;     // Entry Price
              mp?: string;    // Mark Price
              up: string;     // Unrealized PnL
              l?: string;     // Leverage
            }) => ({
              symbol: position.s,
              side: parseFloat(position.pa) > 0 ? 'LONG' : 'SHORT',
              size: Math.abs(parseFloat(position.pa)),
              entryPrice: parseFloat(position.ep),
              markPrice: parseFloat(position.mp || position.ep),
              unrealizedPnL: parseFloat(position.up),
              leverage: parseFloat(position.l || '1')
            }));
          
          if (updatedPositions.length > 0) {
            setPositions(updatedPositions as Position[]);
            lastPositionsUpdate.current = Date.now();
          }
        }
      } else if (data.e === 'ORDER_TRADE_UPDATE') {
        // Handle new or updated order
        const orderData = data.o;
        
        const trade: Trade = {
          id: orderData.i.toString(),
          symbol: orderData.s,
          side: orderData.S,
          status: orderData.X as 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED',
          quantity: parseFloat(orderData.q),
          price: parseFloat(orderData.p || '0'),
          entryPrice: parseFloat(orderData.ap || orderData.p),
          entryTime: new Date(orderData.T).toISOString(),
          type: orderData.o as 'MARKET' | 'LIMIT',
          timestamp: orderData.T,
          leverage: parseFloat(orderData.lev || '1')
        };
        
        // Update the trade list, replacing existing trades with the same ID
        setTrades(prev => {
          const existingIndex = prev.findIndex(t => t.id === trade.id);
          if (existingIndex >= 0) {
            // Replace existing
            const updated = [...prev];
            updated[existingIndex] = trade;
            return updated;
          } else {
            // Add new
            return [...prev, trade];
          }
        });
        
        lastTradesUpdate.current = Date.now();
      }
    };

    // Subscribe to account updates
    if (authService.hasApiCredentials()) {
      webSocket.subscribeAccount(handleAccountUpdate);
    }

    return () => {
      isMounted.current = false;
      if (authService.hasApiCredentials()) {
        webSocket.unsubscribeAccount(handleAccountUpdate);
      }
    };
  }, [initializeData, webSocket, authService, setTrades]);

  // Fornecer método para verificar o status de banimento
  const getBanStatus = useCallback(() => {
    return checkBanStatus();
  }, [checkBanStatus]);

  return {
    trades,
    positions,
    isLoading,
    error,
    syncTradesFromBinance: () => syncTradesFromBinance(true),
    fetchPositions: () => fetchPositions(true),
    createOrder,
    addTrade: async (trade: Trade) => {
      setTrades(prev => [...prev, trade]);
    },
    getBanStatus
  };
};
