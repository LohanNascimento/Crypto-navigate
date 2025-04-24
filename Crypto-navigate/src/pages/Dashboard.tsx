import type { FC } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useMarketData } from '@/hooks/useMarketData';
import { useTrades } from '@/hooks/useTrades';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import BinanceWebSocket from '@/services/binanceWebSocket';
import AuthService from '@/services/authService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import AIAnalysisCard from '@/components/dashboard/AIAnalysisCard';
import AIPerformanceCard from '@/components/dashboard/AIPerformanceCard';
import { tradingSymbolSchema} from '@/lib/validations/dashboard';
import { logger } from '@/lib/logger';

// Validar e definir símbolos padrão
const DEFAULT_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 
  'ADA/USDT', 'XRP/USDT', 'DOT/USDT', 'DOGE/USDT'
].filter(symbol => tradingSymbolSchema.safeParse(symbol).success);

const Dashboard: React.FC = () => {
  // State hooks
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [timeframe] = useState('1h');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banStatus, setBanStatus] = useState<{ isBanned: boolean, banUntil: number, remainingMinutes: number }>({ isBanned: false, banUntil: 0, remainingMinutes: 0 });
  const [isManualRefreshLoading, setIsManualRefreshLoading] = useState(false);
  
  // Refs para controle de inicialização
  const initAttempted = useRef<boolean>(false);
  const banCheckIntervalRef = useRef<number | null>(null);
  // Ref para as funções de atualização periódica
  const updateFunctionsRef = useRef<{
    fetchPositions: () => Promise<void>;
    refetchKlines: () => Promise<void>;
    isBanned: boolean;
  }>({
    fetchPositions: async () => Promise.resolve(),
    refetchKlines: async () => Promise.resolve(),
    isBanned: false
  });
  // Ref para armazenar funções de inicialização
  const initializationFunctionsRef = useRef<{
    checkBan: () => void;
    initialize: () => Promise<void>;
  }>({
    checkBan: () => {},
    initialize: async () => Promise.resolve()
  });

  // Service instances
  const webSocket = BinanceWebSocket.getInstance();
  const authService = AuthService.getInstance();

  // Custom hooks
  const { klines, marketData, refetchKlines, isLoading: isMarketDataLoading, error: marketDataError } = useMarketData(selectedSymbol, timeframe);
  const { 
    trades, 
    positions, 
    syncTradesFromBinance, 
    fetchPositions, 
    isLoading: isTradesLoading,
    createOrder,
    error: tradesError
  } = useTrades();

  // Verificar status de banimento de IP
  const checkBanStatus = useCallback(() => {
    const status = webSocket.getBanStatus();
    setBanStatus(status);
    
    // Somente atualizar erro se o status de banimento mudar
    if (status.isBanned && !error?.includes('IP ban')) {
      const message = `Binance IP ban active for ${status.remainingMinutes} more minutes. Using cached data where possible.`;
      setError(message);
      logger.warn('IP banido pela Binance', {
        module: 'dashboard',
        action: 'ban_check',
        banEndTime: status.banUntil, // Using banEndTime as a known property in logger type
        remainingMinutes: status.remainingMinutes
      });
    } else if (!status.isBanned && error?.includes('IP ban')) {
      setError(null);
      logger.info('IP ban removido', {
        module: 'dashboard',
        action: 'ban_check'
      });
    }
  }, [webSocket, error]);

  // Callbacks
  const initializeData = useCallback(async () => {
    // Evitar múltiplas tentativas de inicialização
    if (initAttempted.current) {
      return;
    }
    
    initAttempted.current = true;
    
    logger.info('Iniciando inicialização do Dashboard', {
      module: 'dashboard',
      action: 'initialize',
      symbol: selectedSymbol,
      timeframe,
      symbolValidation: tradingSymbolSchema.safeParse(selectedSymbol).success,
      availableSymbols: availableSymbols,
      hasApiCredentials: authService.hasApiCredentials()
    });
    
    try {
      // Verificar status de banimento primeiro - usar getBanStatus diretamente, não o estado
      const banStatus = webSocket.getBanStatus();
      
      // Abrir conexão WebSocket primeiro - isso não faz chamadas REST
      try {
        await webSocket.connect();
        console.log('WebSocket connected successfully');
      } catch (err) {
        console.warn('WebSocket connection failed, will retry automatically:', err);
      }
      
      // Verificar se temos credenciais da API para funcionalidades avançadas
      if (authService.hasApiCredentials()) {
        try {
          // Se não estiver banido, tentar obter informações da conta
          if (!banStatus.isBanned) {
            // Esperar um pouco antes de fazer requisições para evitar problemas de rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
            // Buscar posições primeiro (mais importante)
            await fetchPositions();
            console.log('Positions fetched successfully');
            
            // Aguardar um pouco entre chamadas
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Tentar obter informações da conta para extrair símbolos
            // Essa operação já é throttled e com cache interno
            const accountInfo = await webSocket.getAccountInfo();
            
            // Obter símbolos das posições ativas
            const positionSymbols = accountInfo.positions
              .filter((pos: { positionAmt: string }) => parseFloat(pos.positionAmt) !== 0)
              .map((pos: { symbol: string }) => {
                // Converter formato BTCUSDT para BTC/USDT
                const symbol = pos.symbol;
                const baseAssets = ['USDT', 'USD', 'BTC', 'ETH', 'BNB'];
                
                for (const base of baseAssets) {
                  if (symbol.endsWith(base)) {
                    return `${symbol.slice(0, -base.length)}/${base}`;
                  }
                }
                return symbol;
              });
            
            // Combinar símbolos padrão com símbolos das posições
            if (positionSymbols.length > 0) {
              setAvailableSymbols([...new Set([...DEFAULT_SYMBOLS, ...positionSymbols])]);
            }
          }
        } catch (err) {
          console.warn('Failed to get symbols from account, using defaults:', err);
        }
      }

      // Forçar atualização dos dados de mercado
      refetchKlines();

      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize data:', err);
      setError('Failed to initialize. Using default symbols and cached data.');
      setIsInitialized(true); // Ainda marcar como inicializado para mostrar a UI
    }
  }, [selectedSymbol, timeframe, availableSymbols, authService, webSocket, refetchKlines, fetchPositions]);

  // Effects
  // Melhorar o useEffect de inicialização com cleanup adequado
  useEffect(() => {
    let isSubscribed = true;
    
    // Verificar status de banimento inicialmente
    checkBanStatus();
    
    // Manter a ref atualizada com as funções mais recentes
    initializationFunctionsRef.current = {
      checkBan: checkBanStatus,
      initialize: initializeData
    };
    
    // Configurar verificação periódica de status de banimento
    const banCheckInterval = setInterval(() => {
      if (isSubscribed) {
        initializationFunctionsRef.current.checkBan();
      }
    }, 60000);
    
    // Atraso na inicialização para evitar bloqueio por rate limiting
    const initTimer = setTimeout(() => {
      if (isSubscribed) {
        initializationFunctionsRef.current.initialize().catch(err => {
          logger.error('Erro na inicialização:', {
            module: 'dashboard',
            action: 'initialize',
            errorMessage: err instanceof Error ? err.message : 'Unknown error'
          });
        });
      }
    }, 1500);
    
    // Verificar periodicamente se as credenciais da API foram adicionadas
    const checkCredentials = () => {
      if (!isSubscribed) return;
      
      const hasCredentials = authService.hasApiCredentials();
      
      if (hasCredentials && !initAttempted.current) {
        initializationFunctionsRef.current.initialize().catch(err => {
          logger.error('Erro na inicialização após atualização de credenciais:', {
            module: 'dashboard',
            action: 'initialize_credentials',
            errorMessage: err instanceof Error ? err.message : 'Unknown error'
          });
        });
      }
    };
    
    const credentialsInterval = setInterval(checkCredentials, 3000);
    
    // Cleanup function
    return () => {
      isSubscribed = false;
      clearTimeout(initTimer);
      clearInterval(banCheckInterval);
      clearInterval(credentialsInterval);
    };
  }, [checkBanStatus, initializeData, authService]);
  
  // Simplificar o useEffect de erro para não causar ciclos
  useEffect(() => {
    let newError = null;
    
    if (error) {
      newError = error;
      
      // Verificar se o erro contém indicação de banimento
      if (error.includes('banned') || error.includes('418')) {
        const banStatus = webSocket.getBanStatus();
        if (banStatus.isBanned) {
          setBanStatus(banStatus);
        }
      }
    } else if (marketDataError) {
      newError = marketDataError;
    }
    
    // Atualizar erro somente se for diferente do atual
    if (newError !== error) {
      setError(newError);
    }
  }, [error, marketDataError, webSocket]);
  
  // Modificar o efeito de atualização periódica para usar cleanup adequado
  useEffect(() => {
    let isSubscribed = true;
    
    // Atualizar a ref com os valores atuais
    updateFunctionsRef.current = {
      fetchPositions,
      refetchKlines,
      isBanned: banStatus.isBanned
    };
    
    // Atualizar dados com frequência reduzida
    const updateTimer = setInterval(async () => {
      if (!isSubscribed || updateFunctionsRef.current.isBanned) {
        return;
      }

      try {
        // Primeiro atualizar posições
        await updateFunctionsRef.current.fetchPositions();
        
        // Esperar antes da próxima chamada
        if (!isSubscribed) return;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Depois atualizar dados de mercado
        if (!isSubscribed) return;
        await updateFunctionsRef.current.refetchKlines();
      } catch (error) {
        logger.error('Erro durante atualização periódica:', {
          module: 'dashboard',
          action: 'periodic_update',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 60000);
    
    return () => {
      isSubscribed = false;
      clearInterval(updateTimer);
    };
  }, [fetchPositions, refetchKlines, banStatus.isBanned]);

  // Modificar o useEffect de erro para melhor gerenciamento de estado
  useEffect(() => {
    let newError = null;
    
    if (tradesError) {
      newError = tradesError;
      
      if (tradesError.includes('banned') || tradesError.includes('418')) {
        const banStatus = webSocket.getBanStatus();
        if (banStatus.isBanned) {
          setBanStatus(banStatus);
        }
      }
    } else if (marketDataError) {
      newError = marketDataError;
    }
    
    setError(newError);
  }, [tradesError, marketDataError, webSocket]);
  
  // Função para atualização manual dos dados
  const handleRefresh = async () => {
    try {
      setIsManualRefreshLoading(true);
      
      // Fazer as chamadas sequencialmente em vez de paralelo
      await fetchPositions();
      
      // Esperar um pouco antes da próxima chamada
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await refetchKlines();
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setIsManualRefreshLoading(false);
    }
  };
  
  // Calcular estatísticas de portfólio
  const totalTrades = trades.length;
  const openTrades = trades.filter(trade => trade.status === 'NEW' || trade.status === 'PARTIALLY_FILLED').length;
  const closedTrades = trades.filter(trade => trade.status === 'FILLED' || trade.status === 'CANCELED' || trade.status === 'EXPIRED');
  const winningTrades = closedTrades.filter(trade => (trade.profit || 0) > 0).length;
  const losingTrades = closedTrades.filter(trade => (trade.profit || 0) < 0).length;
  
  const winRate = closedTrades.length > 0 
    ? (winningTrades / closedTrades.length) * 100 
    : 0;
  
  const totalProfit = closedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
  
  // Calcular o PNL total das posições abertas
  const totalPositionPnl = positions.reduce((sum, position) => {
    const pnl = position.unrealizedPnL || 0;
    return sum + pnl;
  }, 0);

  // Renderizar alerta de banimento quando aplicável
  const renderBanAlert = () => {
    if (!banStatus.isBanned) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>IP Ban Detected</AlertTitle>
        <AlertDescription>
          <p>Your IP has been banned by Binance until {new Date(banStatus.banUntil).toLocaleString()} 
          ({banStatus.remainingMinutes} minutes remaining).</p>
          <p className="mt-2">The application will continue to function using cached data. 
          WebSocket connections for real-time updates remain active.</p>
          <p className="mt-2 font-semibold">Trading functionality is limited until the ban expires.</p>
        </AlertDescription>
      </Alert>
    );
  };

  // Se houver erro, mostrar mensagem mas permitir uso da aplicação
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <div className="text-red-700 dark:text-red-400 text-sm">{error}</div>
      </div>
    );
  };

  // Mostrar loading quando necessário
  if (!isInitialized) {
    return (
      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-8 w-[150px]" />
                <Skeleton className="h-4 w-[100px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Overview of your trading performance and market data"
        actions={
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isManualRefreshLoading}
            className="flex items-center gap-2"
          >
            <span className={isManualRefreshLoading ? "animate-spin" : ""}>⟳</span>
            Refresh Data
          </Button>
        }
      />
      
      {/* Mostrar alerta de banimento se aplicável */}
      {renderBanAlert()}
      
      {renderError()}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {isTradesLoading ? (
                <Skeleton className="h-8 w-[150px]" />
              ) : (
                formatCurrency(totalProfit + totalPositionPnl)
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>All Time</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {isTradesLoading ? (
                <Skeleton className="h-8 w-[150px]" />
              ) : (
                formatPercentage(winRate)
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Based on {closedTrades.length} closed trades</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {isTradesLoading ? (
                <Skeleton className="h-8 w-[150px]" />
              ) : (
                positions.length || 0
              )}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Out of {totalTrades} total trades</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              {isMarketDataLoading ? (
                <Skeleton className="h-8 w-[150px]" />
              ) : (
                <div>
                  <div className="text-2xl font-bold">
                    {marketData && marketData.price ? formatCurrency(marketData.price) : 'Waiting...'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSymbol}
                  </div>
                </div>
              )}
              <div className="flex items-center">
                {!isMarketDataLoading && marketData && marketData.changePercent !== undefined && (
                  <Badge className={marketData.changePercent >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                    {formatPercentage(marketData.changePercent / 100)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Seletor de Símbolo e Timeframe */}
      <div className="flex items-center justify-end space-x-4 mt-6 mb-2">
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select symbol" />
          </SelectTrigger>
          <SelectContent>
            {availableSymbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
      </div>
      
      {/* Integrated Analysis Section */}
      <div className="grid gap-4 md:grid-cols-2 mt-2">
        <div className="md:col-span-2">
          <AIAnalysisCard symbol={selectedSymbol} timeframe={timeframe} />
        </div>
        <div className="md:col-span-2">
          <AIPerformanceCard />
          <AIPerformanceCard />
        </div>
      </div>
      
      {/* Debug Info */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
          <h3 className="text-sm font-medium mb-2">Debug Info</h3>
          <div className="text-xs">
            <p>Market Data Loaded: {marketData ? 'Yes' : 'No'}</p>
            <p>Positions Loaded: {positions.length}</p>
            <p>WebSocket Connected: {webSocket.isConnected ? 'Yes' : 'No'}</p>
            <p>IP Ban: {banStatus.isBanned ? `Yes (${banStatus.remainingMinutes}m remaining)` : 'No'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// IMPORTANTE: O erro "Rendered more hooks than during the previous render" estava sendo causado por
// um useEffect de teste que havia sido adicionado após o return do componente para testar o aiTradingService.
// Esse hook foi removido, pois os hooks devem sempre ser chamados na mesma ordem em todas as renderizações.
// Nunca adicione hooks após o return ou dentro de condicionais.
export default Dashboard;
