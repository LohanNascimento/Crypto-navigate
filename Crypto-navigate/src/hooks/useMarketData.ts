import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketData, Kline } from '../types';
import BinanceWebSocket from '../services/binanceWebSocket';

// Flag para usar dados mockados durante o desenvolvimento, quando necessário
const USE_MOCK_DATA = false;
// Intervalo mínimo para atualização via REST (30 segundos)
const MIN_REFRESH_INTERVAL = 30000;
// Tempo para expiração do cache (5 minutos)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const useMarketData = (symbol: string, timeframe: string = '1m') => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [klines, setKlines] = useState<Kline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para controle de cache e atualizações
  const lastFetchTime = useRef<number>(0);
  const klinesCache = useRef<Map<string, { data: Kline[], timestamp: number }>>(new Map());
  const isMounted = useRef<boolean>(true);
  const pendingFetch = useRef<boolean>(false);

  const webSocket = BinanceWebSocket.getInstance();

  const fetchKlines = useCallback(async (force = false) => {
    const cacheKey = `${symbol}_${timeframe}`;
    const now = Date.now();
    
    // Não fazer requisições em paralelo
    if (pendingFetch.current) {
      console.log('Kline fetch already in progress, skipping');
      return;
    }
    
    // Verificar se já passou o intervalo mínimo desde a última atualização
    if (!force && now - lastFetchTime.current < MIN_REFRESH_INTERVAL) {
      console.log(`Skipping klines update, last update was ${(now - lastFetchTime.current) / 1000}s ago`);
      return;
    }
    
    // Verificar cache
    const cachedData = klinesCache.current.get(cacheKey);
    if (cachedData && !force && now - cachedData.timestamp < CACHE_EXPIRY) {
      console.log('Using cached klines data');
      setKlines(cachedData.data);
      return;
    }
    
    if (!isMounted.current) return;
    
    try {
      pendingFetch.current = true;
      setIsLoading(true);

      if (USE_MOCK_DATA) {
        // Mock data implementation
        const mockKlines = Array.from({ length: 100 }, (_, i) => ({
          time: Date.now() - (100 - i) * 60000,
          open: 50000 + Math.random() * 1000,
          high: 51000 + Math.random() * 1000,
          low: 49000 + Math.random() * 1000,
          close: 50500 + Math.random() * 1000,
          volume: 100 + Math.random() * 50,
          isClosed: false
        }));
        setKlines(mockKlines);
        klinesCache.current.set(cacheKey, { data: mockKlines, timestamp: now });
        lastFetchTime.current = now;
        return;
      }

      // Verificar se já temos dados de klines WebSocket antes de fazer chamada REST
      if (klines.length > 0 && !force) {
        console.log('Already have klines data from WebSocket, skipping REST fetch');
        return;
      }

      // Precisamos usar uma abordagem com REST primeiro para obter os dados históricos iniciais
      // depois usamos o WebSocket para atualizações em tempo real
      const formattedSymbol = symbol.replace('/', '');
      
      // Tratamento de erro e retry mais robusto
      let retryCount = 0;
      const maxRetries = 3;
      let fetchSuccess = false;
      
      while (retryCount < maxRetries && !fetchSuccess) {
        try {
          // Adicionar um delay progressivo nas tentativas
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
          
          // Usamos fetch diretamente para os dados históricos
          const response = await fetch(`https://testnet.binancefuture.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${timeframe}&limit=100`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch klines: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          const data = await response.json();
          
          if (!isMounted.current) return;
          
          const formattedKlines = data.map((kline: unknown) => ({
            time: kline[0],
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5]),
            isClosed: true
          }));
          
          // Atualizar cache
          klinesCache.current.set(cacheKey, { data: formattedKlines, timestamp: now });
          
          setKlines(formattedKlines);
          setError(null);
          lastFetchTime.current = now;
          fetchSuccess = true;
        } catch (err) {
          retryCount++;
          console.error(`Error fetching klines (attempt ${retryCount}/${maxRetries}):`, err);
          
          if (retryCount === maxRetries) {
            if (!isMounted.current) return;
            
            setError('Failed to fetch klines data. Using cached data if available.');
            
            // Se temos dados em cache, usar eles mesmo se expirados
            if (cachedData) {
              console.log('Using expired cache data after fetch failure');
              setKlines(cachedData.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching klines:', err);
      setError('An unexpected error occurred');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      pendingFetch.current = false;
    }
  }, [klines.length, symbol, timeframe]);

  useEffect(() => {
    isMounted.current = true;
    
    // Resetar estado quando symbol ou timeframe mudam
    setKlines([]);
    setMarketData(null);
    setError(null);
    setIsLoading(true);
    
    // Atrasar o fetch inicial para evitar múltiplas chamadas simultâneas
    const fetchTimer = setTimeout(() => {
      fetchKlines().catch(err => {
        console.error('Error in initial klines fetch:', err);
      });
    }, 500);

    // Set up WebSocket for real-time market data
    const handleMarketData = (data: MarketData) => {
      if (isMounted.current) {
        setMarketData(data);
      }
    };

    const handleKlineUpdate = (kline: Kline) => {
      if (!isMounted.current) return;
      
      // Se o kline foi fechado (candle completo)
      if (kline.isClosed) {
        // Adicionar o novo kline à lista e remover o mais antigo se necessário
        setKlines(prev => {
          const newKlines = [...prev];
          
          // Verificar se este kline já existe na lista (pelo timestamp)
          const existingIndex = newKlines.findIndex(k => k.time === kline.time);
          
          if (existingIndex >= 0) {
            // Substituir o existente
            newKlines[existingIndex] = kline;
          } else {
            // Adicionar o novo e remover o mais antigo se houver mais de 100
            newKlines.push(kline);
            if (newKlines.length > 100) {
              newKlines.shift();
            }
          }
          
          // Atualizar o cache também
          const cacheKey = `${symbol}_${timeframe}`;
          klinesCache.current.set(cacheKey, { 
            data: newKlines, 
            timestamp: Date.now() 
          });
          
          return newKlines;
        });
      } else {
        // Atualizar o candle atual (último da lista)
        setKlines(prev => {
          const newKlines = [...prev];
          const lastIndex = newKlines.length - 1;
          
          // Se o timestamp é o mesmo, atualizamos o último candle
          if (lastIndex >= 0 && newKlines[lastIndex].time === kline.time) {
            newKlines[lastIndex] = kline;
            
            // Atualizar o cache também
            const cacheKey = `${symbol}_${timeframe}`;
            klinesCache.current.set(cacheKey, { 
              data: newKlines, 
              timestamp: Date.now() 
            });
          }
          
          return newKlines;
        });
      }
    };

    // Subscribe to market ticker
    webSocket.subscribe(symbol, handleMarketData);
    
    // Subscribe to klines updates
    webSocket.subscribeKlines(symbol, timeframe, handleKlineUpdate);

    return () => {
      // Marcar componente como desmontado
      isMounted.current = false;
      
      // Limpar timeout
      clearTimeout(fetchTimer);
      
      // Unsubscribe when component unmounts or deps change
      webSocket.unsubscribe(symbol, handleMarketData);
      webSocket.unsubscribeKlines(symbol, timeframe, handleKlineUpdate);
    };
  }, [symbol, timeframe, fetchKlines, webSocket]);

  return {
    marketData,
    klines,
    isLoading,
    error,
    refetchKlines: () => fetchKlines(true)
  };
};
