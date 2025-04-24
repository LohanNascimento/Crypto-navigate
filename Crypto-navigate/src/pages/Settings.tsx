import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/components/ui/link';
import PageHeader from '@/components/shared/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import AuthService from '@/services/authService';
import BinanceService from '@/services/binanceService';
import { useTrades } from '@/hooks/useTrades';
import { Info } from 'lucide-react';

const apiFormSchema = z.object({
  binanceApiKey: z.string().min(1, 'API Key is required'),
  binanceSecretKey: z.string().min(1, 'Secret Key is required'),
});

const notificationFormSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  desktop: z.boolean(),
});

const tradingLimitsFormSchema = z.object({
  maxTradeSize: z.string().min(1, 'Maximum trade size is required'),
  maxDailyLoss: z.string().min(1, 'Maximum daily loss is required'),
  maxOpenTrades: z.string().min(1, 'Maximum open trades is required'),
});

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark']),
});

const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { syncTradesFromBinance } = useTrades();
  
  const authService = AuthService.getInstance();
  const binanceService = BinanceService.getInstance();
  
  useEffect(() => {
    const savedCredentials = authService.getApiCredentials();
    if (savedCredentials) {
      apiForm.setValue('binanceApiKey', savedCredentials.binanceApiKey);
      apiForm.setValue('binanceSecretKey', savedCredentials.binanceSecretKey);
    }
  }, []);

  const apiForm = useForm({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      binanceApiKey: '',
      binanceSecretKey: '',
    },
  });

  const notificationForm = useForm({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      email: user?.settings?.notificationSettings?.email ?? true,
      push: user?.settings?.notificationSettings?.push ?? true,
      desktop: user?.settings?.notificationSettings?.desktop ?? true,
    },
  });

  const tradingLimitsForm = useForm({
    resolver: zodResolver(tradingLimitsFormSchema),
    defaultValues: {
      maxTradeSize: String(user?.settings?.tradingLimits?.maxTradeSize || 1000),
      maxDailyLoss: String(user?.settings?.tradingLimits?.maxDailyLoss || 500),
      maxOpenTrades: String(user?.settings?.tradingLimits?.maxOpenTrades || 5),
    },
  });

  const appearanceForm = useForm({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: user?.settings?.theme || theme,
    },
  });

  const onApiFormSubmit = async (data: z.infer<typeof apiFormSchema>) => {
    try {
      authService.saveApiCredentials({
        binanceApiKey: data.binanceApiKey,
        binanceSecretKey: data.binanceSecretKey
      });
      
      binanceService.updateCredentials({
        apiKey: data.binanceApiKey,
        apiSecret: data.binanceSecretKey
      });
      
      try {
        await binanceService.getAccountInfo();
        
        toast({
          title: 'API Settings Saved',
          description: 'Your Binance Futures Testnet credentials have been successfully verified and saved'
        });
        
        await syncTradesFromBinance();
        
      } catch (error) {
        toast({
          title: 'API Connection Failed',
          description: 'The provided Testnet API credentials are invalid or have insufficient permissions',
          variant: 'destructive'
        });
        
        authService.clearApiCredentials();
      }
      
      updateUser({
        apiKeys: {
          binanceApiKey: data.binanceApiKey,
          binanceSecretKey: data.binanceSecretKey
        }
      });
    } catch (error) {
      console.error('Error saving API credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to save API credentials',
        variant: 'destructive'
      });
    }
  };

  const onNotificationFormSubmit = (data: z.infer<typeof notificationFormSchema>) => {
    updateUser({
      settings: {
        ...user?.settings,
        notificationSettings: {
          email: data.email,
          push: data.push,
          desktop: data.desktop
        }
      }
    });
    
    toast({
      title: 'Notification Settings Saved',
      description: 'Your notification preferences have been updated'
    });
  };

  const onTradingLimitsFormSubmit = (data: z.infer<typeof tradingLimitsFormSchema>) => {
    updateUser({
      settings: {
        ...user?.settings,
        tradingLimits: {
          maxTradeSize: Number(data.maxTradeSize),
          maxDailyLoss: Number(data.maxDailyLoss),
          maxOpenTrades: Number(data.maxOpenTrades)
        }
      }
    });
    
    toast({
      title: 'Trading Limits Saved',
      description: 'Your trading limits have been updated successfully'
    });
  };

  const onAppearanceFormSubmit = (data: z.infer<typeof appearanceFormSchema>) => {
    updateUser({
      settings: {
        ...user?.settings,
        theme: data.theme
      }
    });
    
    setTheme(data.theme);
    
    toast({
      title: 'Appearance Saved',
      description: `Theme switched to ${data.theme} mode`
    });
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences"
      />
      
      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="tradingLimits">Trading Limits</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Binance Futures Testnet API Credentials</CardTitle>
              <CardDescription>
                Enter your Binance Futures Testnet API credentials to connect to the trading testnet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Testnet Information</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    This app uses Binance Futures Testnet for practice trading with virtual funds.
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-sm">
                    <li>Visit <a href="https://testnet.binancefuture.com/en/futures/BTCUSDT" className="text-blue-500 underline" target="_blank" rel="noreferrer">Binance Futures Testnet</a></li>
                    <li>Register for a testnet account or log in if you already have one</li>
                    <li>Go to your account settings and create an API key</li>
                    <li>Copy both the API Key and Secret Key and paste them below</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <Form {...apiForm}>
                <form onSubmit={apiForm.handleSubmit(onApiFormSubmit)} className="space-y-4">
                  <FormField
                    control={apiForm.control}
                    name="binanceApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your Binance Futures Testnet API key" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your API key from Binance Futures Testnet. This is used to authenticate requests.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={apiForm.control}
                    name="binanceSecretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your Binance Futures Testnet secret key" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Your secret key from Binance Futures Testnet. Keep this secure and never share it.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save API Credentials</Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  authService.clearApiCredentials();
                  apiForm.reset({ binanceApiKey: '', binanceSecretKey: '' });
                  toast({
                    title: "Credentials Cleared",
                    description: "Your API credentials have been removed"
                  });
                }}
              >
                Clear Credentials
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive trading notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationFormSubmit)} className="space-y-4">
                  <FormField
                    control={notificationForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Email Notifications</FormLabel>
                          <FormDescription>
                            Receive trading alerts via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="push"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Push Notifications</FormLabel>
                          <FormDescription>
                            Receive push notifications on your device
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="desktop"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Desktop Notifications</FormLabel>
                          <FormDescription>
                            Show notifications in your browser
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save Notification Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tradingLimits">
          <Card>
            <CardHeader>
              <CardTitle>Trading Limits</CardTitle>
              <CardDescription>
                Set risk management limits for your trading activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...tradingLimitsForm}>
                <form onSubmit={tradingLimitsForm.handleSubmit(onTradingLimitsFormSubmit)} className="space-y-4">
                  <FormField
                    control={tradingLimitsForm.control}
                    name="maxTradeSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Trade Size (USDT)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          The maximum size for any single trade
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tradingLimitsForm.control}
                    name="maxDailyLoss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Daily Loss (USDT)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Stop trading if you lose this amount in a day
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tradingLimitsForm.control}
                    name="maxOpenTrades"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Open Trades</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Maximum number of positions to have open at once
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save Trading Limits</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...appearanceForm}>
                <form onSubmit={appearanceForm.handleSubmit(onAppearanceFormSubmit)} className="space-y-4">
                  <FormField
                    control={appearanceForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center space-y-2 ${
                              field.value === 'light' ? 'border-primary' : 'border-muted'
                            }`}
                            onClick={() => field.onChange('light')}
                          >
                            <div className="h-24 w-full bg-white border rounded-md"></div>
                            <span>Light</span>
                          </div>
                          <div
                            className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center space-y-2 ${
                              field.value === 'dark' ? 'border-primary' : 'border-muted'
                            }`}
                            onClick={() => field.onChange('dark')}
                          >
                            <div className="h-24 w-full bg-slate-900 border rounded-md"></div>
                            <span>Dark</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save Appearance Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
