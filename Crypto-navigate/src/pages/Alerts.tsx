
import React, { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Trash2, Bell, AlertTriangle, BellOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'volume' | 'indicator';
  condition: 'above' | 'below' | 'crosses';
  value: number;
  active: boolean;
  createdAt: string;
}

const Alerts = () => {
  const [alerts, setAlerts] = useLocalStorage<Alert[]>('crypto-alerts', []);
  const [newAlert, setNewAlert] = useState<Omit<Alert, 'id' | 'createdAt'>>({
    symbol: 'BTC/USDT',
    type: 'price',
    condition: 'above',
    value: 0,
    active: true,
  });
  
  const { toast } = useToast();

  const popularPairs = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 
    'ADA/USDT', 'XRP/USDT', 'DOT/USDT', 'DOGE/USDT'
  ];

  const handleCreateAlert = () => {
    if (newAlert.value <= 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a value greater than 0",
        variant: "destructive",
      });
      return;
    }

    const alert: Alert = {
      ...newAlert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setAlerts([...alerts, alert]);
    
    toast({
      title: "Alert created",
      description: `${newAlert.symbol} ${newAlert.condition} ${newAlert.value}`,
    });

    // Reset form except for the symbol
    setNewAlert(prev => ({
      ...prev,
      type: 'price',
      condition: 'above',
      value: 0,
    }));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
    toast({
      title: "Alert deleted",
      description: "The alert has been removed",
    });
  };

  const toggleAlertActive = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'above': return '>';
      case 'below': return '<';
      case 'crosses': return '⟷';
      default: return condition;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Market Alerts" 
        subtitle="Set up custom alerts for market conditions"
        actions={
          <Button variant="outline" size="sm" onClick={() => setAlerts([])}>
            Clear All
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="symbol">Market Pair</Label>
                  <Select 
                    value={newAlert.symbol} 
                    onValueChange={(value) => setNewAlert(prev => ({ ...prev, symbol: value }))}
                  >
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularPairs.map(pair => (
                        <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Alert Type</Label>
                  <Tabs 
                    value={newAlert.type} 
                    onValueChange={(value: 'price' | 'volume' | 'indicator') => 
                      setNewAlert(prev => ({ ...prev, type: value }))
                    }
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="price">Price</TabsTrigger>
                      <TabsTrigger value="volume">Volume</TabsTrigger>
                      <TabsTrigger value="indicator">Indicator</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="price" className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="condition">Condition</Label>
                          <Select 
                            value={newAlert.condition} 
                            onValueChange={(value: 'above' | 'below' | 'crosses') => 
                              setNewAlert(prev => ({ ...prev, condition: value }))
                            }
                          >
                            <SelectTrigger id="condition">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                              <SelectItem value="crosses">Crosses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="value">Price Value</Label>
                          <Input 
                            id="value"
                            type="number"
                            value={newAlert.value || ''}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                            placeholder="0.00"
                            min="0"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="volume" className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="condition">Condition</Label>
                          <Select 
                            value={newAlert.condition} 
                            onValueChange={(value: 'above' | 'below' | 'crosses') => 
                              setNewAlert(prev => ({ ...prev, condition: value }))
                            }
                          >
                            <SelectTrigger id="condition">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="value">Volume (24h)</Label>
                          <Input 
                            id="value"
                            type="number"
                            value={newAlert.value || ''}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                            placeholder="0.00"
                            min="0"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="indicator" className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="indicator">Indicator</Label>
                          <Select defaultValue="rsi">
                            <SelectTrigger id="indicator">
                              <SelectValue placeholder="Select indicator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rsi">RSI</SelectItem>
                              <SelectItem value="macd">MACD</SelectItem>
                              <SelectItem value="sma">SMA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="condition">Condition</Label>
                          <Select 
                            value={newAlert.condition} 
                            onValueChange={(value: 'above' | 'below' | 'crosses') => 
                              setNewAlert(prev => ({ ...prev, condition: value }))
                            }
                          >
                            <SelectTrigger id="condition">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="above">Above</SelectItem>
                              <SelectItem value="below">Below</SelectItem>
                              <SelectItem value="crosses">Crosses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="value">Value</Label>
                          <Input 
                            id="value"
                            type="number"
                            value={newAlert.value || ''}
                            onChange={(e) => setNewAlert(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                            placeholder="0.00"
                            min="0"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleCreateAlert}>
                <Bell className="mr-2 h-4 w-4" />
                Create Alert
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No alerts set up yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an alert to get notified when market conditions change
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className="overflow-hidden">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${alert.active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            {alert.active ? (
                              <Bell className={`h-5 w-5 text-green-500`} />
                            ) : (
                              <BellOff className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{alert.symbol}</h3>
                              <Badge variant="outline">{alert.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} {getConditionLabel(alert.condition)} {alert.value}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={alert.active} 
                            onCheckedChange={() => toggleAlertActive(alert.id)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
