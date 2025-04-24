export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

export interface Kline {
  timeframe: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price: number;
  timestamp: number;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  leverage: number;
  entryPrice: number;
  entryTime: string;
  exitPrice?: number;
  exitTime?: string;
  profit?: number;
  profitPercentage?: number;
  strategyId?: string;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnL: number;
  leverage: number;
}

export interface AccountUpdate {
  eventType: 'ACCOUNT_UPDATE' | 'ORDER_TRADE_UPDATE';
  eventTime: number;
  transactionTime: number;
  data: {
    balances?: {
      asset: string;
      walletBalance: number;
      crossWalletBalance: number;
      balanceChange: number;
    }[];
    positions?: {
      symbol: string;
      positionAmount: number;
      entryPrice: number;
      accumulatedRealized: number;
      unrealizedPnL: number;
      marginType: string;
      isolatedWallet: number;
      positionSide: string;
    }[];
    orders?: {
      symbol: string;
      clientOrderId: string;
      side: string;
      orderType: string;
      timeInForce: string;
      originalQuantity: number;
      originalPrice: number;
      averagePrice: number;
      stopPrice: number;
      executionType: string;
      orderStatus: string;
      orderId: number;
      lastFilledQuantity: number;
      cumulativeFilledQuantity: number;
      lastFilledPrice: number;
      commissionAsset: string;
      commissionAmount: number;
      orderTradeTime: number;
      tradeId: number;
      bidsNotional: number;
      asksNotional: number;
      isMakerSide: boolean;
      isReduceOnly: boolean;
      stopPriceWorkingType: string;
      originalOrderType: string;
      positionSide: string;
      closePosition: boolean;
      activationPrice: number;
      callbackRate: number;
      realizedProfit: number;
    }[];
  };
}