
import { useState, useCallback } from 'react';
import { Strategy } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { generateMockStrategies } from '../utils/mockData';

export const useStrategies = () => {
  const [strategies, setStrategies] = useLocalStorage<Strategy[]>('crypto-strategies', generateMockStrategies(5));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // In a real app, this would be an API call
      // For now, we'll just return the local data
      setIsLoading(false);
      return strategies;
    } catch (err) {
      setError('Failed to fetch strategies');
      setIsLoading(false);
      return [];
    }
  }, [strategies]);

  const addStrategy = useCallback((strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newStrategy: Strategy = {
      ...strategy,
      id: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    
    setStrategies(prevStrategies => [...prevStrategies, newStrategy]);
    return newStrategy;
  }, [setStrategies]);

  const updateStrategy = useCallback((id: string, updates: Partial<Strategy>) => {
    setStrategies(prevStrategies => 
      prevStrategies.map(strategy => 
        strategy.id === id 
          ? { 
              ...strategy, 
              ...updates,
              updatedAt: new Date().toISOString()
            } 
          : strategy
      )
    );
  }, [setStrategies]);

  const deleteStrategy = useCallback((id: string) => {
    setStrategies(prevStrategies => prevStrategies.filter(strategy => strategy.id !== id));
  }, [setStrategies]);

  return {
    strategies,
    isLoading,
    error,
    fetchStrategies,
    addStrategy,
    updateStrategy,
    deleteStrategy
  };
};
