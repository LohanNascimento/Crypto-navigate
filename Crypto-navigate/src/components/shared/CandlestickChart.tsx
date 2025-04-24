
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Kline } from '@/types';
import { format } from 'date-fns';

interface CandlestickChartProps {
  data: Kline[];
  height?: number;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  data, 
  height = 400 
}) => {
  // Format data for recharts
  const chartData = data.map(kline => {
    return {
      date: new Date(kline.time * 1000),
      value: kline.close,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    };
  });

  // Calculate domain for Y-axis
  const minValue = Math.min(...data.map(d => d.low)) * 0.99;
  const maxValue = Math.max(...data.map(d => d.high)) * 1.01;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3861FB" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3861FB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" strokeOpacity={0.2} />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => format(date, 'HH:mm')}
          minTickGap={50}
        />
        <YAxis
          domain={[minValue, maxValue]}
          tickFormatter={(value) => value.toLocaleString()}
          width={70}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border border-border rounded p-2 shadow-lg">
                  <p className="text-sm font-medium">
                    {format(data.date, 'MMM d, yyyy HH:mm')}
                  </p>
                  <p className="text-sm">
                    Open: <span className="text-neutral">{data.open.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    High: <span className="text-profit">{data.high.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    Low: <span className="text-loss">{data.low.toFixed(2)}</span>
                  </p>
                  <p className="text-sm font-medium">
                    Close: <span>{data.close.toFixed(2)}</span>
                  </p>
                  <p className="text-sm text-neutral">
                    Volume: {(data.volume / 1000).toFixed(2)}K
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3861FB"
          fillOpacity={1}
          fill="url(#colorPrice)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default CandlestickChart;
