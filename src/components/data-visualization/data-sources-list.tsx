"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUSPMetrics } from "@/lib/hooks/use-usp-data";
import { 
  Globe, 
  Database, 
  Server, 
  MapPin, 
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

export function DataSourcesList() {
  const { metrics, isLoading } = useUSPMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics?.dataSources) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data sources available</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'maintenance':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api':
        return <Server className="h-4 w-4" />;
      case 'local':
        return <Database className="h-4 w-4" />;
      case 'external':
        return <Globe className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Our Data Sources
        </h3>
        <p className="text-gray-600">
          Comprehensive event data from multiple sources to ensure accurate conflict detection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.dataSources.map((source) => (
          <Card key={source.id} className="h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(source.type)}
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(source.status)}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(source.status)}`}
                  >
                    {source.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                {source.description}
              </CardDescription>
              
              {source.coverage && source.coverage.length > 0 && (
                <div className="flex items-center space-x-1 mb-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {source.coverage.join(', ')}
                  </span>
                </div>
              )}

              {source.eventCount && (
                <div className="text-xs text-muted-foreground">
                  {source.eventCount.toLocaleString()} events
                </div>
              )}

              {source.lastUpdated && (
                <div className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date(source.lastUpdated).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
