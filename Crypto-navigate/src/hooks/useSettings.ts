// src/hooks/useSettings.ts
import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface AISettings {
  aiModel: string;
  aiPositionSize: number;
  aiConfidenceThreshold: number;
  aiLeverage: number;
  aiAutomation: boolean;
  aiCircuitBreaker: boolean;
  aiSandboxMode: boolean;
  // Additional settings
}

interface Settings extends AISettings {
  // Other app settings
  theme: string;
  // etc.
}

const DEFAULT_SETTINGS: Settings = {
  // AI settings
  aiModel: 'tensorflow',
  aiPositionSize: 5, // 5% of balance
  aiConfidenceThreshold: 70, // 70% confidence
  aiLeverage: 2,
  aiAutomation: false,
  aiCircuitBreaker: true,
  aiSandboxMode: true,
  
  // Other settings
  theme: 'system',
  // etc.
};

export const useSettings = () => {
  const [settings, setSettings] = useLocalStorage<Settings>('crypto-settings', DEFAULT_SETTINGS);
  
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };
  
  return {
    settings,
    updateSettings
  };
};