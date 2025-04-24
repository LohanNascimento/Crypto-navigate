import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTrades } from '@/hooks/useTrades';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatDateTime, formatProfitLoss, formatProfitLossPercentage } from '@/utils/formatters';
import { Trade, Position } from '@/types';
import { 
  Download, 
  ArrowUpDown, 
  Filter,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const History: React.FC = () => {
  const { trades, positions, syncTradesFromBinance, fetchPositions, createOrder, error, isLoading, getBanStatus } = useTrades();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Trade>('entryTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('positions');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [closePositionData, setClosePositionData] = useState<{
    position: Position;
    closeType: 'MARKET' | 'LIMIT';
    price?: number;
  } | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  
  // Verificar status de banimento periodicamente
  useEffect(() => {
    const checkBan = () => {
      const banStatus = getBanStatus();
      setIsBanned(banStatus.isBanned);
    };
    
    checkBan();
    const interval = setInterval(checkBan, 30000);
    return () => clearInterval(interval);
  }, [getBanStatus]);
  
  // Auto-atualizar posições a cada 30 segundos
  useEffect(() => {
    if (activeTab === 'positions') {
      const interval = setInterval(() => {
        if (!isLoading && !isBanned) {
          fetchPositions();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchPositions, isLoading, isBanned]);
  
  const handleSort = (field: keyof Trade) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'positions') {
        await fetchPositions();
      } else {
        await syncTradesFromBinance();
      }
      toast({
        title: 'Data refreshed',
        description: activeTab === 'positions' ? 'Open positions updated' : 'Trade history updated',
      });
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: 'Could not refresh data. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, fetchPositions, syncTradesFromBinance, toast]);
  
  const handleClosePosition = async () => {
    if (!closePositionData) return;
    
    try {
      const { position, closeType, price } = closePositionData;
      
      // Convert position to close order parameters
      // For a LONG position, we need to SELL to close
      // For a SHORT position, we need to BUY to close
      const side = position.side === 'LONG' ? 'SELL' : 'BUY';
      
      await createOrder(
        position.symbol,
        side,
        closeType,
        position.size,
        closeType === 'LIMIT' ? price : undefined,
        position.leverage
      );
      
      toast({
        title: 'Position closing initiated',
        description: `${position.side} position on ${position.symbol} is being closed`,
      });
      
      // Refresh data after a short delay
      setTimeout(() => fetchPositions(), 1000);
      
      // Close dialog
      setClosePositionData(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to close position',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  const filteredTrades = trades
    .filter(trade => 
      searchTerm === '' || 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (fieldA === undefined) return 1;
      if (fieldB === undefined) return -1;
      
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  
  const filteredPositions = positions
    .filter(position => 
      searchTerm === '' || 
      position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by unrealized PnL by default
      if (a.unrealizedPnL > b.unrealizedPnL) return sortDirection === 'asc' ? 1 : -1;
      if (a.unrealizedPnL < b.unrealizedPnL) return sortDirection === 'asc' ? -1 : 1;
      return 0;
    });
  
  const exportCSV = () => {
    // Create CSV header
    const headers = ['Symbol', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'Entry Time', 'Exit Time', 'Profit/Loss', 'P/L %'];
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map(trade => [
        trade.symbol,
        trade.side,
        trade.entryPrice,
        trade.exitPrice || '',
        trade.quantity,
        trade.entryTime,
        trade.exitTime || '',
        trade.profit || '',
        trade.profitPercentage || ''
      ].join(','))
    ].join('\n');
    
    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trading-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    
    toast({
      title: 'Export Complete',
      description: 'Your trading history has been exported as CSV',
    });
  };

  return (
    <div>
      <PageHeader
        title="Positions & History"
        subtitle="View and manage your open positions and trading history"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={refreshData} 
              variant="outline" 
              disabled={isRefreshing || isLoading} 
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
            <Button onClick={exportCSV} className="flex items-center gap-2">
              <Download size={16} />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />
      
      {isBanned && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>IP Temporarily Banned</AlertTitle>
          <AlertDescription>
            Your IP is currently banned by Binance API. Position management is limited. 
            You can view cached data, but closing positions may not work until the ban expires.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="positions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="positions">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Open Positions</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search symbol..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-[180px] pl-8"
                    />
                    <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Entry Price</TableHead>
                      <TableHead className="text-right">Mark Price</TableHead>
                      <TableHead className="text-right">Leverage</TableHead>
                      <TableHead className="text-right">Unrealized PnL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          <div className="flex justify-center items-center gap-2">
                            <RefreshCw size={16} className="animate-spin" /> 
                            <span>Loading positions...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPositions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                          No open positions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPositions.map((position) => {
                        const pnlFormatted = formatProfitLoss(position.unrealizedPnL);
                        // Calculate PnL percentage 
                        const pnlPercentage = position.entryPrice > 0 
                          ? (position.unrealizedPnL / (position.size * position.entryPrice)) * 100
                          : 0;
                        
                        const pnlPercentageFormatted = formatProfitLossPercentage(pnlPercentage);
                        
                        const pnlClass = pnlPercentage >= 0 ? 'text-profit font-medium' : 'text-loss font-medium';
                        
                        return (
                          <TableRow key={`${position.symbol}-${position.side}`}>
                            <TableCell className="font-medium">{position.symbol}</TableCell>
                            <TableCell>
                              <Badge variant={position.side === 'LONG' ? 'default' : 'destructive'}>
                                {position.side}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{position.size.toFixed(4)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(position.entryPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(position.markPrice)}</TableCell>
                            <TableCell className="text-right">{position.leverage}x</TableCell>
                            <TableCell className="text-right">
                              <div className={pnlFormatted.className}>
                                {pnlFormatted.value}
                              </div>
                              <div className={`text-xs ${pnlPercentageFormatted.className}`}>
                                {pnlPercentageFormatted.value}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    disabled={isBanned}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Close
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Close Position</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to close your {position.side.toLowerCase()} position on {position.symbol}?
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                      <Label>Position Details</Label>
                                      <div className="rounded-md bg-secondary p-3 text-sm">
                                        <div className="flex justify-between">
                                          <span>Symbol:</span>
                                          <span className="font-medium">{position.symbol}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                          <span>Side:</span>
                                          <span className="font-medium">{position.side}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                          <span>Size:</span>
                                          <span className="font-medium">{position.size.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                          <span>Entry Price:</span>
                                          <span className="font-medium">{formatCurrency(position.entryPrice)}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                          <span>Current P/L:</span>
                                          <span className={`font-medium ${pnlFormatted.className}`}>{pnlFormatted.value}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid gap-2">
                                      <Label>Close Type</Label>
                                      <div className="flex gap-2">
                                        <Button 
                                          type="button" 
                                          variant={!closePositionData || closePositionData.closeType === 'MARKET' ? 'default' : 'outline'}
                                          onClick={() => setClosePositionData({
                                            position,
                                            closeType: 'MARKET'
                                          })}
                                          className="flex-1"
                                        >
                                          Market
                                        </Button>
                                        <Button 
                                          type="button" 
                                          variant={closePositionData?.closeType === 'LIMIT' ? 'default' : 'outline'}
                                          onClick={() => setClosePositionData({
                                            position,
                                            closeType: 'LIMIT',
                                            price: position.markPrice
                                          })}
                                          className="flex-1"
                                        >
                                          Limit
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {closePositionData?.closeType === 'LIMIT' && (
                                      <div className="grid gap-2">
                                        <Label>Limit Price</Label>
                                        <Input 
                                          type="number" 
                                          value={closePositionData.price}
                                          onChange={(e) => setClosePositionData({
                                            ...closePositionData,
                                            price: parseFloat(e.target.value)
                                          })}
                                          step="0.00000001"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <DialogFooter>
                                    <Button 
                                      variant="ghost" 
                                      onClick={() => setClosePositionData(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={handleClosePosition}
                                      disabled={!closePositionData || (closePositionData.closeType === 'LIMIT' && !closePositionData.price)}
                                    >
                                      {closePositionData?.closeType === 'MARKET' ? 'Close at Market' : 'Place Limit Order'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Trade History</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search symbol..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-[180px] pl-8"
                    />
                    <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => handleSort('symbol')} className="cursor-pointer">
                        Symbol {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('side')} className="cursor-pointer">
                        Type {sortField === 'side' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                        Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('entryPrice')} className="text-right cursor-pointer">
                        Entry Price {sortField === 'entryPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('quantity')} className="text-right cursor-pointer">
                        Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('entryTime')} className="cursor-pointer">
                        Time {sortField === 'entryTime' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSort('profit')} className="text-right cursor-pointer">
                        P/L {sortField === 'profit' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          <div className="flex justify-center items-center gap-2">
                            <RefreshCw size={16} className="animate-spin" /> 
                            <span>Loading trades...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          No trades found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrades.map((trade) => {
                        const profitLoss = formatProfitLoss(trade.profit);
                        const profitLossPercentage = formatProfitLossPercentage(trade.profitPercentage);
                        
                        return (
                          <TableRow key={trade.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{trade.symbol}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                              >
                                {trade.side}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  trade.status === 'FILLED' ? 'outline' : 
                                  trade.status === 'NEW' || trade.status === 'PARTIALLY_FILLED' ? 'secondary' : 
                                  'destructive'
                                }
                              >
                                {trade.status === 'NEW' && <Clock className="h-3 w-3 mr-1 inline" />}
                                {trade.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(trade.entryPrice)}</TableCell>
                            <TableCell className="text-right">{trade.quantity.toFixed(4)}</TableCell>
                            <TableCell>{formatDateTime(trade.entryTime)}</TableCell>
                            <TableCell className="text-right">
                              {trade.profit !== undefined && trade.profit !== null ? (
                                <div>
                                  <div className={profitLoss.className}>{profitLoss.value}</div>
                                  <div className={`text-xs ${profitLossPercentage.className}`}>
                                    {profitLossPercentage.value}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
