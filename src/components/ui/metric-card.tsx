import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  colorScheme: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  description?: string;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}

const colorSchemeClasses = {
  success: 'metric-card--success text-chart-success',
  warning: 'metric-card--warning text-chart-warning',
  error: 'metric-card--error text-chart-error',
  info: 'metric-card--info text-chart-info',
  neutral: 'border-border text-foreground'
};

const trendClasses = {
  up: 'text-chart-success',
  down: 'text-chart-error',
  neutral: 'text-muted-foreground'
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  colorScheme,
  description,
  className,
  trend = 'neutral',
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className={cn("metric-card", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="skeleton h-4 w-20" />
          </CardTitle>
          <div className="skeleton h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <div className="skeleton h-8 w-16 mb-2" />
          <div className="skeleton h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: number | string): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const formatChange = (changeValue: number): string => {
    const sign = changeValue > 0 ? '+' : '';
    return `${sign}${changeValue.toFixed(1)}%`;
  };

  return (
    <Card className={cn(
      "metric-card glass-effect-subtle hover-lift",
      colorSchemeClasses[colorScheme],
      className
    )}>
      <CardHeader className="flex flex-col items-center text-center space-y-2 pb-2">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {formatValue(value)}
        </div>
        
        {change !== undefined && (
          <div className="flex items-center justify-center space-x-2 mt-1">
            <span className={cn(
              "text-xs font-medium",
              trendClasses[trend]
            )}>
              {formatChange(change)}
            </span>
            {changeLabel && (
              <span className="text-xs text-muted-foreground">
                {changeLabel}
              </span>
            )}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
