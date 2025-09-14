import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, TrendingUp } from "lucide-react";

export interface ConflictDataPoint {
  date: string;
  conflictScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  eventCount: number;
  dayOfWeek: string;
}

export interface ConflictHeatmapProps {
  data: ConflictDataPoint[];
  title?: string;
  description?: string;
  className?: string;
  showLegend?: boolean;
  onDateClick?: (date: string) => void;
}

const getRiskColor = (riskLevel: string, conflictScore: number): string => {
  const intensity = Math.min(conflictScore / 100, 1);
  
  switch (riskLevel) {
    case 'Low':
      return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`;
    case 'Medium':
      return `rgba(234, 179, 8, ${0.2 + intensity * 0.6})`;
    case 'High':
      return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
    default:
      return `rgba(156, 163, 175, ${0.2 + intensity * 0.6})`;
  }
};

const getRiskTextColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low': return 'text-green-700 dark:text-green-400';
    case 'Medium': return 'text-yellow-700 dark:text-yellow-400';
    case 'High': return 'text-red-700 dark:text-red-400';
    default: return 'text-gray-700 dark:text-gray-400';
  }
};

export const ConflictHeatmap: React.FC<ConflictHeatmapProps> = ({
  data,
  title = "Conflict Analysis Heatmap",
  description = "Visual representation of event conflicts across dates",
  className,
  showLegend = true,
  onDateClick
}) => {
  // Group data by weeks
  const groupedData = React.useMemo(() => {
    const weeks: ConflictDataPoint[][] = [];
    let currentWeek: ConflictDataPoint[] = [];
    
    data.forEach((point, index) => {
      currentWeek.push(point);
      
      // Start new week on Sunday or when we have 7 days
      if (currentWeek.length === 7 || index === data.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  }, [data]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTooltipDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className={cn("data-visualization-container", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs text-center text-muted-foreground font-medium p-1">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {groupedData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((dataPoint, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={cn(
                      "relative group aspect-square rounded-md border cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10",
                      "flex flex-col items-center justify-center text-xs font-medium",
                      onDateClick && "hover:shadow-lg"
                    )}
                    style={{ backgroundColor: getRiskColor(dataPoint.riskLevel, dataPoint.conflictScore) }}
                    onClick={() => onDateClick?.(dataPoint.date)}
                  >
                    <span className={cn("text-xs font-medium", getRiskTextColor(dataPoint.riskLevel))}>
                      {new Date(dataPoint.date).getDate()}
                    </span>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 min-w-48">
                      <div className="text-sm font-medium text-popover-foreground">
                        {formatTooltipDate(dataPoint.date)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div>Conflict Score: {dataPoint.conflictScore}/100</div>
                        <div>Risk Level: <span className={getRiskTextColor(dataPoint.riskLevel)}>{dataPoint.riskLevel}</span></div>
                        <div>Events Found: {dataPoint.eventCount}</div>
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">Risk Level:</span>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getRiskColor('Low', 50) }} />
                    <span className="text-xs text-green-700 dark:text-green-400">Low</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getRiskColor('Medium', 50) }} />
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">Medium</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getRiskColor('High', 50) }} />
                    <span className="text-xs text-red-700 dark:text-red-400">High</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Click dates for details</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
