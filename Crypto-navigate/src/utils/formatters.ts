
import { format, parseISO } from 'date-fns';

// Format currency values
export const formatCurrency = (value: number, currency: string = 'USD', options?: Intl.NumberFormatOptions): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new Intl.NumberFormat('en-US', mergedOptions).format(value);
};

// Format crypto values (e.g., BTC amount)
export const formatCrypto = (value: number, precision: number = 8): string => {
  return value.toFixed(precision);
};

// Format percentage values
export const formatPercentage = (value: number | null | undefined, precision: number = 2): string => {
  if (value === null || value === undefined) {
    return '0.00%';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(precision)}%`;
};

// Format date
export const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch (err) {
    return 'Invalid date';
  }
};

// Format time
export const formatTime = (dateString: string, formatStr: string = 'h:mm a'): string => {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch (err) {
    return 'Invalid time';
  }
};

// Format date and time
export const formatDateTime = (dateString: string, formatStr: string = 'MMM d, yyyy h:mm a'): string => {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch (err) {
    return 'Invalid date/time';
  }
};

// Format large numbers with appropriate abbreviations (K, M, B)
export const formatNumber = (value: number): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  
  return value.toFixed(2);
};

// Format profit/loss with color class
export const formatProfitLoss = (value: number | undefined): { value: string; className: string } => {
  if (value === undefined) {
    return { value: '-', className: 'text-muted-foreground' };
  }
  
  const formattedValue = formatCurrency(value);
  const className = value >= 0 ? 'text-profit font-medium' : 'text-loss font-medium';
  
  return { value: formattedValue, className };
};

// Format profit/loss percentage with color class
export const formatProfitLossPercentage = (value: number | undefined | null): { value: string; className: string } => {
  if (value === undefined || value === null) {
    return { value: '-', className: 'text-muted-foreground' };
  }
  
  const formattedValue = formatPercentage(value);
  const className = value >= 0 ? 'text-profit font-medium' : 'text-loss font-medium';
  
  return { value: formattedValue, className };
};

// Convert Unix timestamp to date string
export const unixToDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toISOString();
};
