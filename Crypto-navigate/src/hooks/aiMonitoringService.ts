// src/services/aiMonitoringService.ts
export class AIMonitoringService {
    private MAX_LOSS_THRESHOLD = -5; // 5% max loss
    private CONSECUTIVE_LOSSES_THRESHOLD = 3;
    
    // Track AI performance
    private consecutiveLosses = 0;
    private totalTrades = 0;
    private winningTrades = 0;
    
    recordTrade(result: { profit: number, prediction: number, actual: number }) {
      this.totalTrades++;
      
      if (result.profit > 0) {
        this.winningTrades++;
        this.consecutiveLosses = 0;
      } else {
        this.consecutiveLosses++;
      }
      
      // Check if circuit breaker should trigger
      if (this.shouldTriggerCircuitBreaker()) {
        this.triggerCircuitBreaker();
      }
      
      // Log trade for analytics
      this.logTrade(result);
    }
    
    private shouldTriggerCircuitBreaker(): boolean {
      return this.consecutiveLosses >= this.CONSECUTIVE_LOSSES_THRESHOLD;
    }
    
    private triggerCircuitBreaker() {
      // Disable automated trading
      const settings = JSON.parse(localStorage.getItem('crypto-settings') || '{}');
      settings.aiAutomation = false;
      localStorage.setItem('crypto-settings', JSON.stringify(settings));
      
      // Send notification
      this.sendNotification('Circuit breaker triggered due to consecutive losses');
    }
    
    private logTrade(result: { profit: number; prediction: number; actual: number }) {
      // Add to log store
      const logs = JSON.parse(localStorage.getItem('ai-trade-logs') || '[]');
      logs.unshift({
        timestamp: new Date().toISOString(),
        ...result
      });
      localStorage.setItem('ai-trade-logs', JSON.stringify(logs.slice(0, 100)));
    }
    
    private sendNotification(message: string) {
      // Implementation depends on your notification system
      console.warn('AI NOTIFICATION:', message);
      // Could integrate with browser notifications, email service, etc.
    }
    
    getPerformanceMetrics() {
      return {
        winRate: this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0,
        accuracy: 0, // Calculate from logs
        profitFactor: 0, // Calculate from logs
      };
    }
  }
  
  export default new AIMonitoringService();