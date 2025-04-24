import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, AlertCircle, Layers, BarChart, RefreshCw, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/useAI';
import { useMarketData } from '@/hooks/useMarketData';
import { useTrendAnalysis, TrendDirection, TrendStrength, VolumeLevel } from '@/hooks/useTrendAnalysis';

interface AIAnalysisCardProps {
  symbol: string;
  timeframe: string;
}

// Função para converter força da tendência em porcentagem
const strengthToPercent = (strength: TrendStrength): number => {
  switch (strength) {
    case 'weak': return 30;
    case 'moderate': return 65;
    case 'strong': return 90;
    default: return 0;
  }
};

// Função para obter a cor da tendência baseada na direção e força
const getTrendColor = (direction: TrendDirection, strength: TrendStrength): string => {
  if (direction === 'neutral') return 'bg-gray-400 dark:bg-gray-600';
  
  // Ajustar intensidade da cor com base na força
  if (direction === 'up') {
    switch (strength) {
      case 'weak': return 'bg-green-300 dark:bg-green-800';
      case 'moderate': return 'bg-green-500 dark:bg-green-600';
      case 'strong': return 'bg-green-700 dark:bg-green-500';
      default: return 'bg-green-500';
    }
  } else {
    switch (strength) {
      case 'weak': return 'bg-red-300 dark:bg-red-800';
      case 'moderate': return 'bg-red-500 dark:bg-red-600';
      case 'strong': return 'bg-red-700 dark:bg-red-500';
      default: return 'bg-red-500';
    }
  }
};

const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ symbol, timeframe }) => {
  // Usar o hook useMarketData para obter os dados de mercado
  const { klines, isLoading: isLoadingMarketData } = useMarketData(symbol, timeframe);
  
  // Usar o hook useTrendAnalysis para obter análise de tendência
  const { 
    shortTerm, 
    mediumTerm, 
    longTerm, 
    lastUpdated, 
    isLoading: isLoadingTrend,
    error: trendError,
    refreshData: refreshTrendData
  } = useTrendAnalysis(symbol);
  
  // Usar o hook useAI para acessar as funcionalidades de IA
  const { 
    isEnabled, 
    isLoading: isLoadingAI, 
    lastPrediction, 
    error: aiError,
    predict 
  } = useAI(klines);
  
  // Realizar uma previsão quando os dados de mercado mudarem
  useEffect(() => {
    if (isEnabled && klines && klines.length > 0 && !isLoadingMarketData) {
      predict(klines);
    }
  }, [klines, isEnabled, predict, isLoadingMarketData]);
  
  // Estado de carregamento combinado
  const isLoading = isLoadingMarketData || isLoadingAI || isLoadingTrend;
  const error = aiError || trendError;
  
  // Dados para exibição
  const prediction = lastPrediction || {
    action: 'HOLD' as const,
    confidence: 0,
    factors: isEnabled ? ['Waiting for data...'] : ['AI is disabled'],
    timestamp: new Date().toISOString()
  };
  
  // Mapear ação para direção
  const directionMap = {
    'BUY': 'buy',
    'SELL': 'sell',
    'HOLD': 'neutral'
  };
  
  // Direção com base na predição da IA
  const aiDirection = directionMap[prediction.action] as 'buy' | 'sell' | 'neutral';
  
  // Mapear as tendências para a estrutura de timeframes para o display
  const timeframes = {
    short: {
      direction: shortTerm.direction === 'up' ? 'bullish' : shortTerm.direction === 'down' ? 'bearish' : 'neutral',
      strength: shortTerm.strength,
      rsi: shortTerm.rsi14,
      volumeLevel: shortTerm.volumeLevel
    },
    medium: {
      direction: mediumTerm.direction === 'up' ? 'bullish' : mediumTerm.direction === 'down' ? 'bearish' : 'neutral',
      strength: mediumTerm.strength,
      rsi: mediumTerm.rsi14,
      volumeLevel: mediumTerm.volumeLevel
    },
    long: {
      direction: longTerm.direction === 'up' ? 'bullish' : longTerm.direction === 'down' ? 'bearish' : 'neutral',
      strength: longTerm.strength,
      rsi: longTerm.rsi14,
      volumeLevel: longTerm.volumeLevel
    }
  };
  
  // Determinar os indicadores técnicos com base nas tendências e na predição
  const indicators = {
    trend: shortTerm.direction === 'up' ? 'uptrend' : shortTerm.direction === 'down' ? 'downtrend' : 'sideways',
    volatility: shortTerm.rsi14 > 70 || shortTerm.rsi14 < 30 ? 'high' : 
                shortTerm.rsi14 > 60 || shortTerm.rsi14 < 40 ? 'medium' : 'low',
    momentum: mediumTerm.direction === 'up' ? 'increasing' : 
              mediumTerm.direction === 'down' ? 'decreasing' : 'stable',
    volume: shortTerm.volumeLevel
  };
  
  // Resumo baseado nos fatores da IA e tendências
  const summary = prediction.factors && prediction.factors.length > 0
    ? prediction.factors.join('. ')
    : 'Análise pendente. Aguardando mais dados para gerar previsões.';

  // Renderiza os indicadores técnicos com ícones
  const renderIndicators = () => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">Tendência</Badge>
          <span className={indicators.trend === 'uptrend' ? 'text-green-500' : indicators.trend === 'downtrend' ? 'text-red-500' : 'text-yellow-500'}>
            {indicators.trend === 'uptrend' ? 'Alta' : indicators.trend === 'downtrend' ? 'Baixa' : 'Lateral'}
          </span>
        </div>
        
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">Volatilidade</Badge>
          <span>{indicators.volatility === 'low' ? 'Baixa' : indicators.volatility === 'medium' ? 'Média' : 'Alta'}</span>
        </div>
        
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">Momentum</Badge>
          <span>{indicators.momentum === 'increasing' ? 'Crescente' : indicators.momentum === 'decreasing' ? 'Decrescente' : 'Estável'}</span>
        </div>
        
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">Volume</Badge>
          <span>{indicators.volume === 'low' ? 'Baixo' : indicators.volume === 'average' ? 'Médio' : 'Alto'}</span>
        </div>
      </div>
    );
  };

  // Renderiza a análise de multitimeframes
  const renderTimeframes = () => {
    return (
      <div className="flex flex-col space-y-4 mt-3">
        {/* Curto Prazo */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Curto prazo (5min)
            </span>
            <Badge variant={timeframes.short.direction === 'bullish' ? 'default' : timeframes.short.direction === 'bearish' ? 'destructive' : 'secondary'}>
              {timeframes.short.direction === 'bullish' ? 'Bullish' : timeframes.short.direction === 'bearish' ? 'Bearish' : 'Neutro'}
            </Badge>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Força da tendência:</span>
              <span className="font-medium">
                {timeframes.short.strength === 'strong' ? 'Forte' : 
                 timeframes.short.strength === 'moderate' ? 'Moderada' : 'Fraca'}
              </span>
            </div>
            <Progress 
              value={strengthToPercent(timeframes.short.strength)} 
              className="h-2" 
              indicatorClassName={getTrendColor(shortTerm.direction, timeframes.short.strength)} 
            />
          </div>
        </div>
        
        {/* Médio Prazo */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Médio prazo (1h)
            </span>
            <Badge variant={timeframes.medium.direction === 'bullish' ? 'default' : timeframes.medium.direction === 'bearish' ? 'destructive' : 'secondary'}>
              {timeframes.medium.direction === 'bullish' ? 'Bullish' : timeframes.medium.direction === 'bearish' ? 'Bearish' : 'Neutro'}
            </Badge>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Força da tendência:</span>
              <span className="font-medium">
                {timeframes.medium.strength === 'strong' ? 'Forte' : 
                 timeframes.medium.strength === 'moderate' ? 'Moderada' : 'Fraca'}
              </span>
            </div>
            <Progress 
              value={strengthToPercent(timeframes.medium.strength)} 
              className="h-2" 
              indicatorClassName={getTrendColor(mediumTerm.direction, timeframes.medium.strength)} 
            />
          </div>
        </div>
        
        {/* Longo Prazo */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Longo prazo (1d)
            </span>
            <Badge variant={timeframes.long.direction === 'bullish' ? 'default' : timeframes.long.direction === 'bearish' ? 'destructive' : 'secondary'}>
              {timeframes.long.direction === 'bullish' ? 'Bullish' : timeframes.long.direction === 'bearish' ? 'Bearish' : 'Neutro'}
            </Badge>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Força da tendência:</span>
              <span className="font-medium">
                {timeframes.long.strength === 'strong' ? 'Forte' : 
                 timeframes.long.strength === 'moderate' ? 'Moderada' : 'Fraca'}
              </span>
            </div>
            <Progress 
              value={strengthToPercent(timeframes.long.strength)} 
              className="h-2" 
              indicatorClassName={getTrendColor(longTerm.direction, timeframes.long.strength)} 
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Análise Integrada: {symbol}</CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshTrendData}
              disabled={isLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Atualizar</span>
            </Button>
            {!isLoading && (
              <Badge variant={aiDirection === 'buy' ? 'default' : aiDirection === 'sell' ? 'destructive' : 'secondary'}>
                {aiDirection === 'buy' ? (
                  <div className="flex items-center">
                    <ArrowUp className="mr-1 h-4 w-4" />
                    Compra
                  </div>
                ) : aiDirection === 'sell' ? (
                  <div className="flex items-center">
                    <ArrowDown className="mr-1 h-4 w-4" />
                    Venda
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Layers className="mr-1 h-4 w-4" />
                    Neutro
                  </div>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full mt-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        ) : (
          <div>
            <div className="text-sm mb-4">{summary}</div>
            
            <div className="flex items-center mt-3 mb-4">
              <span className="mr-2">Confiança:</span>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                <div 
                  className={`h-2 rounded-full ${
                    prediction.confidence > 0.7 ? 'bg-green-500' : 
                    prediction.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${prediction.confidence * 100}%` }}
                ></div>
              </div>
              <span className="ml-2">{Math.round(prediction.confidence * 100)}%</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Indicadores Técnicos</h4>
                {renderIndicators()}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Análise Multitimeframe</h4>
                {renderTimeframes()}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-4 pt-2 border-t flex justify-between items-center">
              <div>
                Última atualização: {lastUpdated ? lastUpdated.toLocaleTimeString() : new Date().toLocaleTimeString()}
                {timeframe && ` • Timeframe: ${timeframe}`}
              </div>
              <div className="flex items-center gap-1">
                <BarChart className="w-3 h-3" />
                <span>EMA(9), SMA(50), RSI(14), Volume</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisCard; 