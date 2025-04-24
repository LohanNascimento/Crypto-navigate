import { z } from 'zod';

// Validação para timeframes permitidos
export const timeframeSchema = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']);

// Validação para símbolos de trading
export const tradingSymbolSchema = z.string()
  .regex(/^[A-Z0-9]+\/[A-Z0-9]+$/, {
    message: 'Símbolo deve estar no formato BASE/QUOTE (ex: BTC/USDT)'
  });

// Validação para dados de mercado
export const marketDataSchema = z.object({
  symbol: tradingSymbolSchema,
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  change24h: z.number(),
  high24h: z.number().positive(),
  low24h: z.number().positive(),
  timestamp: z.number()
});

// Validação para posições
export const positionSchema = z.object({
  symbol: tradingSymbolSchema,
  size: z.number(),
  entryPrice: z.number().positive(),
  markPrice: z.number().positive(),
  pnl: z.number(),
  liquidationPrice: z.number().positive().optional(),
  leverage: z.number().positive(),
  marginType: z.enum(['isolated', 'cross']),
  timestamp: z.number()
});

// Validação para configurações do dashboard
export const dashboardConfigSchema = z.object({
  defaultSymbol: tradingSymbolSchema,
  defaultTimeframe: timeframeSchema,
  favoriteSymbols: z.array(tradingSymbolSchema).max(10),
  chartSettings: z.object({
    showVolume: z.boolean(),
    showGrid: z.boolean(),
    theme: z.enum(['light', 'dark']),
  }).optional()
});

// Tipos inferidos dos schemas
export type Timeframe = z.infer<typeof timeframeSchema>;
export type TradingSymbol = z.infer<typeof tradingSymbolSchema>;
export type MarketData = z.infer<typeof marketDataSchema>;
export type Position = z.infer<typeof positionSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;