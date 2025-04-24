// src/services/aiBackendService.ts
export const getPrediction = async (symbol: string, timeframe: string): Promise<{
    action: 'BUY'|'SELL'|'HOLD',
    confidence: number,
    factors: string[]
  }> => {
    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error getting AI prediction:', error);
      return { action: 'HOLD', confidence: 0, factors: ['API Error'] };
    }
  };