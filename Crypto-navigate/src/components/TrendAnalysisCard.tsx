import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useTrendAnalysis, TrendDirection, TrendStrength, VolumeLevel } from '@/hooks/useTrendAnalysis';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, ArrowRight, BarChart, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrendSectionProps {
  title: string;
  direction: TrendDirection;
  strength: TrendStrength;
  volumeLevel: VolumeLevel;
  rsi: number;
  isLoading: boolean;
}

const strengthToPercent = (strength: TrendStrength): number => {
  switch (strength) {
    case 'weak': return 30;
    case 'moderate': return 65;
    case 'strong': return 90;
    default: return 0;
  }
};

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

const getTrendIcon = (direction: TrendDirection) => {
  switch (direction) {
    case 'up': return <ArrowUp className="w-5 h-5 text-green-500" />;
    case 'down': return <ArrowDown className="w-5 h-5 text-red-500" />;
    default: return <ArrowRight className="w-5 h-5 text-gray-500" />;
  }
};

const getVolumeBadge = (level: VolumeLevel) => {
  switch (level) {
    case 'high':
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Volume Alto</Badge>;
    case 'low':
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Volume Baixo</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Volume Médio</Badge>;
  }
};

const getRsiBadge = (rsi: number) => {
  if (rsi > 70) {
    return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Sobrecomprado</Badge>;
  } else if (rsi < 30) {
    return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Sobrevendido</Badge>;
  } else {
    return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">RSI Neutro</Badge>;
  }
};

const TrendSection: React.FC<TrendSectionProps> = ({
  title,
  direction,
  strength,
  volumeLevel,
  rsi,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="p-4 border-b last:border-b-0 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    );
  }

  const strengthPercent = strengthToPercent(strength);
  const trendColor = getTrendColor(direction, strength);

  return (
    <div className="p-4 border-b last:border-b-0 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {title}
        </h3>
        <div className="flex items-center">
          {getTrendIcon(direction)}
          <span className="text-sm font-bold ml-1">
            {direction === 'up' && 'Alta'}
            {direction === 'down' && 'Baixa'}
            {direction === 'neutral' && 'Neutra'}
          </span>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Força da tendência:</span>
          <span className="font-medium">
            {strength === 'strong' && 'Forte'}
            {strength === 'moderate' && 'Moderada'}
            {strength === 'weak' && 'Fraca'}
          </span>
        </div>
        <Progress value={strengthPercent} className="h-2" indicatorClassName={trendColor} />
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        {getVolumeBadge(volumeLevel)}
        {getRsiBadge(rsi)}
      </div>
    </div>
  );
};

interface TrendAnalysisCardProps {
  symbol: string;
}

const TrendAnalysisCard: React.FC<TrendAnalysisCardProps> = ({ symbol }) => {
  const { shortTerm, mediumTerm, longTerm, lastUpdated, isLoading, error, refreshData } = useTrendAnalysis(symbol);

  const handleRefresh = () => {
    refreshData();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Análise de Tendência</CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Atualizar</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              {lastUpdated && !isLoading ? `Atualizado: ${lastUpdated.toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b dark:border-red-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        
        <TrendSection
          title="5 Minutos"
          direction={shortTerm.direction}
          strength={shortTerm.strength}
          volumeLevel={shortTerm.volumeLevel}
          rsi={shortTerm.rsi14}
          isLoading={isLoading || shortTerm.isLoading}
        />
        
        <TrendSection
          title="1 Hora"
          direction={mediumTerm.direction}
          strength={mediumTerm.strength}
          volumeLevel={mediumTerm.volumeLevel}
          rsi={mediumTerm.rsi14}
          isLoading={isLoading || mediumTerm.isLoading}
        />
        
        <TrendSection
          title="1 Dia"
          direction={longTerm.direction}
          strength={longTerm.strength}
          volumeLevel={longTerm.volumeLevel}
          rsi={longTerm.rsi14}
          isLoading={isLoading || longTerm.isLoading}
        />
        
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-muted-foreground border-t dark:border-gray-700">
          <div className="flex items-center gap-1">
            <BarChart className="w-3 h-3" />
            <span>Indicadores: EMA(9), SMA(50), RSI(14), Volume</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysisCard; 