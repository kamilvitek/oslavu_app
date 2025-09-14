import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title: string;
  description?: string;
  type: 'bar' | 'line' | 'area';
  className?: string;
  showTrend?: boolean;
  height?: number;
  maxValue?: number;
  formatValue?: (value: number) => string;
}

const defaultColors = [
  'hsl(var(--chart-primary))',
  'hsl(var(--chart-secondary))',
  'hsl(var(--chart-success))',
  'hsl(var(--chart-warning))',
  'hsl(var(--chart-error))',
  'hsl(var(--chart-info))'
];

const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
  switch (trend) {
    case 'up': return TrendingUp;
    case 'down': return TrendingDown;
    case 'neutral': return Minus;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
  switch (trend) {
    case 'up': return 'text-chart-success';
    case 'down': return 'text-chart-error';
    case 'neutral': return 'text-muted-foreground';
  }
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  title,
  description,
  type,
  className,
  showTrend = false,
  height = 200,
  maxValue,
  formatValue = (value: number) => value.toString()
}) => {
  const chartMaxValue = maxValue || Math.max(...data.map(d => d.value)) * 1.1;
  
  const renderBarChart = () => {
    return (
      <div className="flex items-end justify-between space-x-2" style={{ height }}>
        {data.map((point, index) => {
          const barHeight = (point.value / chartMaxValue) * (height - 40);
          const color = point.color || defaultColors[index % defaultColors.length];
          
          return (
            <div key={point.label} className="flex-1 flex flex-col items-center space-y-2">
              <div className="relative group">
                <div
                  className="w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{ 
                    height: Math.max(barHeight, 4),
                    backgroundColor: color,
                    minHeight: '4px'
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  <div className="font-medium">{point.label}</div>
                  <div className="text-muted-foreground">{formatValue(point.value)}</div>
                </div>
              </div>
              
              <div className="text-xs text-center text-muted-foreground max-w-full">
                <div className="truncate">{point.label}</div>
                {showTrend && point.trend && (
                  <div className={cn("flex items-center justify-center mt-1", getTrendColor(point.trend))}>
                    {React.createElement(getTrendIcon(point.trend), { className: "h-3 w-3" })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineChart = () => {
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (point.value / chartMaxValue) * 100;
      return { x, y, ...point };
    });

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="hsl(var(--chart-primary))"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="hsl(var(--chart-primary))"
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className="cursor-pointer hover:r-4 transition-all duration-200"
              />
            </g>
          ))}
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {data.map((point, index) => (
            <div key={index} className="text-xs text-muted-foreground text-center">
              {point.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAreaChart = () => {
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (point.value / chartMaxValue) * 100;
      return { x, y, ...point };
    });

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    const areaPath = `${pathData} L 100 100 L 0 100 Z`;

    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ))}
          
          {/* Area */}
          <path
            d={areaPath}
            fill="hsl(var(--chart-primary))"
            fillOpacity="0.2"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="hsl(var(--chart-primary))"
            strokeWidth="2"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="hsl(var(--chart-primary))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="cursor-pointer hover:r-4 transition-all duration-200"
            />
          ))}
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {data.map((point, index) => (
            <div key={index} className="text-xs text-muted-foreground text-center">
              {point.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'bar': return renderBarChart();
      case 'line': return renderLineChart();
      case 'area': return renderAreaChart();
      default: return renderBarChart();
    }
  };

  return (
    <Card className={cn("data-visualization-container", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderChart()}
          
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">Total</div>
              <div className="text-lg font-bold">
                {formatValue(data.reduce((sum, point) => sum + point.value, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">Average</div>
              <div className="text-lg font-bold">
                {formatValue(data.reduce((sum, point) => sum + point.value, 0) / data.length)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground">Peak</div>
              <div className="text-lg font-bold">
                {formatValue(Math.max(...data.map(d => d.value)))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
