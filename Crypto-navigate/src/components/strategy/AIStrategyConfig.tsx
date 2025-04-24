// src/components/strategy/AIStrategyConfig.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';

export const AIStrategyConfig: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Trading Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select 
              value={settings.aiModel} 
              onValueChange={(value) => updateSettings({ aiModel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tensorflow">TensorFlow.js (Client-side)</SelectItem>
                <SelectItem value="backend">Advanced LSTM (Server-side)</SelectItem>
                <SelectItem value="ensemble">Ensemble (Combined models)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Position Size (% of Balance)</Label>
              <span className="text-sm">{settings.aiPositionSize}%</span>
            </div>
            <Slider
              value={[settings.aiPositionSize]}
              min={1}
              max={25}
              step={1}
              onValueChange={(values) => updateSettings({ aiPositionSize: values[0] })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Confidence Threshold</Label>
              <span className="text-sm">{settings.aiConfidenceThreshold}%</span>
            </div>
            <Slider
              value={[settings.aiConfidenceThreshold]}
              min={50}
              max={95}
              step={5}
              onValueChange={(values) => updateSettings({ aiConfidenceThreshold: values[0] })}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Leverage</Label>
              <span className="text-sm">{settings.aiLeverage}x</span>
            </div>
            <Slider
              value={[settings.aiLeverage]}
              min={1}
              max={20}
              step={1}
              onValueChange={(values) => updateSettings({ aiLeverage: values[0] })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="trade-automation"
              checked={settings.aiAutomation}
              onCheckedChange={(checked) => updateSettings({ aiAutomation: checked })}
            />
            <Label htmlFor="trade-automation">Enable Automated Trading</Label>
          </div>
          
          <div className="space-y-2">
            <Label>Safety Features</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="safety-circuitBreaker"
                  checked={settings.aiCircuitBreaker}
                  onCheckedChange={(checked) => updateSettings({ aiCircuitBreaker: checked })}
                />
                <Label htmlFor="safety-circuitBreaker">Circuit Breaker</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="safety-sandboxMode"
                  checked={settings.aiSandboxMode}
                  onCheckedChange={(checked) => updateSettings({ aiSandboxMode: checked })}
                />
                <Label htmlFor="safety-sandboxMode">Sandbox Mode</Label>
              </div>
            </div>
          </div>
          
          <Button className="w-full">Save Configuration</Button>
        </CardContent>
      </Card>
    </div>
  );
};