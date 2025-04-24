import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, DollarSign, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AIPerformanceCard: React.FC = () => {
  // Dados simulados - em uma implementação real, viriam de um hook
  const isLoading = false;
  const performance = {
    winRate: 0.72, // Taxa de acerto (0-1)
    totalSignals: 128, // Total de sinais gerados
    avgProfit: 2.8, // Lucro médio por operação (%)
    avgLoss: -1.2, // Perda média por operação (%)
    profitFactor: 2.33, // Fator de lucro
    lastTrades: [
      { symbol: 'BTC/USDT', result: 'win', profit: 3.2, timestamp: '2023-04-02T14:30:00Z' },
      { symbol: 'ETH/USDT', result: 'loss', profit: -1.5, timestamp: '2023-04-01T09:15:00Z' },
      { symbol: 'BNB/USDT', result: 'win', profit: 2.7, timestamp: '2023-03-31T18:45:00Z' },
    ],
    lastUpdated: new Date().toISOString()
  };

  // Renderiza histórico das últimas operações
  const renderLastTrades = () => {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Últimas Operações</h4>
        <div className="space-y-2">
          {performance.lastTrades.map((trade, index) => (
            <div key={index} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
              <div className="flex items-center">
                <span className="font-medium">{trade.symbol}</span>
                <Badge 
                  variant={trade.result === 'win' ? 'default' : 'destructive'} 
                  className="ml-2"
                >
                  {trade.result === 'win' ? 'Ganho' : 'Perda'}
                </Badge>
              </div>
              <div className="flex items-center">
                <span className={trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {trade.profit >= 0 ? '+' : ''}{trade.profit}%
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Performance da IA</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium">Taxa de Acerto</span>
                </div>
                <div className="text-2xl font-bold">{Math.round(performance.winRate * 100)}%</div>
                <div className="text-xs text-muted-foreground">
                  Em {performance.totalSignals} sinais gerados
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm font-medium">Fator de Lucro</span>
                </div>
                <div className="text-2xl font-bold">{performance.profitFactor.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  Lucro/Perda média: {performance.avgProfit}% / {performance.avgLoss}%
                </div>
              </div>
            </div>
            
            {renderLastTrades()}
            
            <div className="text-xs text-muted-foreground mt-4">
              Última atualização: {new Date(performance.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIPerformanceCard; 