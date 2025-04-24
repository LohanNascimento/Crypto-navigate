import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Plus, Eye, PencilLine, Trash2, Zap, Cpu } from 'lucide-react';
import { useStrategies } from '@/hooks/useStrategies';
import PageHeader from '@/components/shared/PageHeader';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import CandlestickChart from '@/components/shared/CandlestickChart';
import { generateMockKlines } from '@/utils/mockData';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAI } from '@/hooks/useAI';

const Strategies: React.FC = () => {
  const {
    strategies,
    updateStrategy,
    deleteStrategy
  } = useStrategies();
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const mockKlines = generateMockKlines(selectedSymbol, '1h', 100);

  const {
    isEnabled,
    isInitialized,
    isLoading: isAiLoading,
    settings: aiSettings,
    updateSettings: updateAiSettings,
    enableAI,
    disableAI,
    error: aiError
  } = useAI();

  const handleToggleActive = (id: string, active: boolean) => {
    updateStrategy(id, {
      active
    });
    toast({
      title: active ? 'Strategy Activated' : 'Strategy Deactivated',
      description: `Strategy ${strategies.find(s => s.id === id)?.name} has been ${active ? 'activated' : 'deactivated'}`
    });
  };

  const handleDeleteStrategy = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the strategy "${name}"?`)) {
      deleteStrategy(id);
      toast({
        title: 'Strategy Deleted',
        description: `Strategy "${name}" has been deleted`
      });
    }
  };

  const handleAiSettingsChange = (setting: string, value: unknown) => {
    updateAiSettings({ [setting]: value });
    toast({
      title: 'AI Settings Updated',
      description: `${setting.charAt(0).toUpperCase() + setting.slice(1)} has been updated.`
    });
  };

  const activateAI = async () => {
    try {
      const success = await enableAI();
      if (success) {
        toast({
          title: 'AI System Activated',
          description: 'The AI trading system has been successfully activated.'
        });
      } else {
        toast({
          title: 'AI Activation Failed',
          description: 'Could not activate the AI system.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error activating AI:', error);
      toast({
        title: 'AI Activation Failed',
        description: 'Could not activate the AI system. Check console for details.',
        variant: 'destructive'
      });
    }
  };

  const deactivateAI = () => {
    disableAI();
    toast({
      title: 'AI System Deactivated',
      description: 'The AI trading system has been deactivated.'
    });
  };

  return <div>
      <PageHeader title="Trading Strategies" subtitle="Create and manage automated trading strategies" actions={<Button className="flex items-center gap-2">
            <Plus size={16} />
            <span>New Strategy</span>
          </Button>} />
      
      <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">Strategies List</TabsTrigger>
          <TabsTrigger value="backtest">Backtesting</TabsTrigger>
          <TabsTrigger value="create">Create Strategy</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Your Trading Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Win Rate</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategies.length === 0 ? <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          No strategies found
                        </TableCell>
                      </TableRow> : strategies.map(strategy => <TableRow key={strategy.id}>
                          <TableCell className="font-medium">
                            {strategy.name}
                          </TableCell>
                          <TableCell>{strategy.symbol}</TableCell>
                          <TableCell>
                            {strategy.indicators.map(i => i.type).join('/')}
                          </TableCell>
                          <TableCell className="text-right">
                            {strategy.performance?.winRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className={`text-right ${(strategy.performance?.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(strategy.performance?.profit || 0)}
                            <span className="text-xs block">
                              {formatPercentage(strategy.performance?.profitPercentage || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={strategy.active} onCheckedChange={checked => handleToggleActive(strategy.id, checked)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye size={16} />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <PencilLine size={16} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteStrategy(strategy.id, strategy.name)}>
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="backtest">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Backtest Chart</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      BTC/USDT
                    </Button>
                    <Button variant="outline" size="sm">
                      1H
                    </Button>
                    <Button variant="default" size="sm" className="gap-1">
                      <Zap size={14} />
                      Run Test
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <CandlestickChart data={mockKlines} height={500} />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Strategy Parameters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select Strategy</label>
                      <select className="mt-1 w-full rounded-md border border-input p-2">
                        {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Timeframe</label>
                      <div className="mt-1 grid grid-cols-4 gap-2">
                        <Button variant="outline" size="sm">1H</Button>
                        <Button variant="outline" size="sm">4H</Button>
                        <Button variant="outline" size="sm">1D</Button>
                        <Button variant="outline" size="sm">1W</Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Test Period</label>
                      <div className="mt-1 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">1M</Button>
                        <Button variant="outline" size="sm" className="flex-1">3M</Button>
                        <Button variant="outline" size="sm" className="flex-1">6M</Button>
                        <Button variant="outline" size="sm" className="flex-1">1Y</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Backtest Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Net Profit</span>
                      <span className="font-medium text-profit">+$2,458.32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Win Rate</span>
                      <span className="font-medium">68.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Trades</span>
                      <span className="font-medium">54</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Profit Factor</span>
                      <span className="font-medium">2.3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max Drawdown</span>
                      <span className="font-medium text-loss">-$742.19</span>
                    </div>
                    <Button className="w-full mt-2">Save as Strategy</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} />
                Create New Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Strategy Name</label>
                    <Input type="text" placeholder="My Strategy" className="mt-1 w-full" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Trading Pair</label>
                    <select className="mt-1 w-full rounded-md border border-input p-2 bg-background text-foreground">
                      <option>BTC/USDT</option>
                      <option>ETH/USDT</option>
                      <option>BNB/USDT</option>
                      <option>SOL/USDT</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                  <Textarea placeholder="Strategy description..." className="mt-1 w-full h-24" />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Indicators</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-end gap-2 p-3 border rounded-md">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">Indicator Type</label>
                        <select className="mt-1 w-full rounded-md border border-input p-2 bg-background text-foreground">
                          <option>RSI</option>
                          <option>MACD</option>
                          <option>Moving Average</option>
                          <option>Bollinger Bands</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">Period</label>
                        <Input type="number" defaultValue="14" className="mt-1 w-full" />
                      </div>
                      <Button variant="outline" className="shrink-0">
                        Remove
                      </Button>
                    </div>
                    
                    <Button variant="outline" className="w-full">
                      + Add Indicator
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Conditions</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-end flex-wrap gap-2 p-3 border rounded-md">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-foreground">Indicator</label>
                        <select className="mt-1 w-full rounded-md border border-input p-2 bg-background text-foreground">
                          <option>RSI(14)</option>
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <label className="text-xs font-medium text-foreground">Operator</label>
                        <select className="mt-1 w-full rounded-md border border-input p-2 bg-background text-foreground">
                          <option>Crosses Below</option>
                          <option>Crosses Above</option>
                          <option>Greater Than</option>
                          <option>Less Than</option>
                        </select>
                      </div>
                      <div className="w-[80px]">
                        <label className="text-xs font-medium text-foreground">Value</label>
                        <Input type="number" defaultValue="30" className="mt-1 w-full" />
                      </div>
                      <div className="w-[100px]">
                        <label className="text-xs font-medium text-foreground">Action</label>
                        <select className="mt-1 w-full rounded-md border border-input p-2 bg-background text-foreground">
                          <option>BUY</option>
                          <option>SELL</option>
                        </select>
                      </div>
                      <Button variant="outline" className="shrink-0">
                        Remove
                      </Button>
                    </div>
                    
                    <Button variant="outline" className="w-full">
                      + Add Condition
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={() => {
                  toast({
                    title: "Strategy Created",
                    description: "Your new strategy has been created successfully."
                  });
                  setActiveTab('list');
                }}>
                    Save Strategy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai-settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={20} />
                AI Trading Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Enable AI Trading System</h3>
                    <p className="text-sm text-muted-foreground">
                      Activate the AI system to analyze markets and generate trading signals
                    </p>
                  </div>
                  <Switch 
                    checked={isEnabled} 
                    onCheckedChange={checked => checked ? activateAI() : deactivateAI()}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select 
                      value={aiSettings.model} 
                      onValueChange={(value) => handleAiSettingsChange('model', value)}
                      disabled={!isEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tensorflow">TensorFlow.js (Client-side)</SelectItem>
                        <SelectItem value="backend">Advanced LSTM (Server-side)</SelectItem>
                        <SelectItem value="ensemble">Ensemble (Combined models)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Position Size (% of Balance)</Label>
                      <span className="text-sm">{aiSettings.positionSize}%</span>
                    </div>
                    <Slider
                      value={[aiSettings.positionSize]}
                      min={1}
                      max={25}
                      step={1}
                      disabled={!isEnabled}
                      onValueChange={(values) => handleAiSettingsChange('positionSize', values[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Confidence Threshold</Label>
                      <span className="text-sm">{aiSettings.confidenceThreshold}%</span>
                    </div>
                    <Slider
                      value={[aiSettings.confidenceThreshold]}
                      min={50}
                      max={95}
                      step={5}
                      disabled={!isEnabled}
                      onValueChange={(values) => handleAiSettingsChange('confidenceThreshold', values[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Leverage</Label>
                      <span className="text-sm">{aiSettings.leverage}x</span>
                    </div>
                    <Slider
                      value={[aiSettings.leverage]}
                      min={1}
                      max={20}
                      step={1}
                      disabled={!isEnabled}
                      onValueChange={(values) => handleAiSettingsChange('leverage', values[0])}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="trade-automation"
                      checked={aiSettings.automatedTrading}
                      disabled={!isEnabled}
                      onCheckedChange={(checked) => handleAiSettingsChange('automatedTrading', checked)}
                    />
                    <Label htmlFor="trade-automation">Enable Automated Trading</Label>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <Label>Safety Features</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="safety-circuitBreaker"
                          checked={aiSettings.circuitBreaker}
                          disabled={!isEnabled}
                          onCheckedChange={(checked) => handleAiSettingsChange('circuitBreaker', checked)}
                        />
                        <Label htmlFor="safety-circuitBreaker">Circuit Breaker</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="safety-sandboxMode"
                          checked={aiSettings.sandboxMode}
                          disabled={!isEnabled}
                          onCheckedChange={(checked) => handleAiSettingsChange('sandboxMode', checked)}
                        />
                        <Label htmlFor="safety-sandboxMode">Sandbox Mode</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      disabled={!isEnabled}
                      onClick={() => {
                        toast({
                          title: 'AI Settings Saved',
                          description: 'Your AI configuration has been saved successfully.'
                        });
                      }}
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};

export default Strategies;
