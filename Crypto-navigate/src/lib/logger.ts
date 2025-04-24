import { z } from 'zod';

// Schema para validação de logs
const logSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  timestamp: z.date(),
  context: z.object({
    module: z.string(),
    action: z.string(),
    symbol: z.string().optional(),
    timeframe: z.string().optional(),
    symbolValidation: z.boolean().optional(),
    availableSymbols: z.array(z.string()).optional(),
      hasApiCredentials: z.boolean().optional(),
    userId: z.string().optional(),
    banEndTime: z.number().optional(),
    remainingMinutes: z.number().optional(),
    errorMessage: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type LogEntry = z.infer<typeof logSchema>;

class Logger {
  private static instance: Logger;
  private readonly maxLogSize = 1000; // Número máximo de logs mantidos em memória
  private logs: LogEntry[] = [];

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(level: LogEntry['level'], message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): LogEntry {
    return logSchema.parse({
      level,
      message,
      timestamp: new Date(),
      context,
      metadata,
    });
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Log no console com formatação melhorada
    const formattedMessage = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
    const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    const metadataStr = entry.metadata ? ` | Metadata: ${JSON.stringify(entry.metadata)}` : '';

    switch (entry.level) {
      case 'error':
        console.error(formattedMessage + contextStr + metadataStr);
        break;
      case 'warn':
        console.warn(formattedMessage + contextStr + metadataStr);
        break;
      case 'info':
        console.info(formattedMessage + contextStr + metadataStr);
        break;
      case 'debug':
        console.debug(formattedMessage + contextStr + metadataStr);
        break;
    }
  }

  public info(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): void {
    const entry = this.createLogEntry('info', message, context, metadata);
    this.addLog(entry);
  }

  public warn(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): void {
    const entry = this.createLogEntry('warn', message, context, metadata);
    this.addLog(entry);
  }

  public error(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): void {
    const entry = this.createLogEntry('error', message, context, metadata);
    this.addLog(entry);
  }

  public debug(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): void {
    const entry = this.createLogEntry('debug', message, context, metadata);
    this.addLog(entry);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  public getLogsByTimeRange(startDate: Date, endDate: Date): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );
  }
}

export const logger = Logger.getInstance();