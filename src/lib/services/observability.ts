// Observability service for monitoring event sources and normalization quality
import { serverDatabaseService } from '@/lib/supabase';

interface SourceMetrics {
  source: string;
  totalEvents: number;
  normalizedEvents: number;
  avgConfidence: number;
  lastSync: Date | null;
  errors: number;
  categories: Record<string, number>;
  cities: Record<string, number>;
}

interface NormalizationQuality {
  totalProcessed: number;
  highConfidence: number; // > 0.8
  mediumConfidence: number; // 0.5-0.8
  lowConfidence: number; // < 0.5
  avgConfidence: number;
  methodBreakdown: Record<string, number>;
}

interface SeasonalBaseline {
  city: string;
  month: number;
  expectedEvents: number;
  actualEvents: number;
  variance: number;
  status: 'healthy' | 'warning' | 'critical';
}

export class ObservabilityService {
  /**
   * Get comprehensive metrics for all event sources
   */
  async getSourceMetrics(): Promise<SourceMetrics[]> {
    try {
      const client = serverDatabaseService.getClient();
      
      // Get basic counts by source
      const { data: sourceCounts, error: countError } = await client
        .from('events')
        .select('source, count(*)')
        .group('source');
      
      if (countError) throw countError;
      
      // Get normalization stats
      const { data: normalizationStats, error: normError } = await client
        .from('events')
        .select('source, confidence_score, normalization_method')
        .not('confidence_score', 'is', null);
      
      if (normError) throw normError;
      
      // Get category and city distributions
      const { data: categoryStats, error: catError } = await client
        .from('events')
        .select('source, normalized_category, count(*)')
        .not('normalized_category', 'is', null)
        .group('source, normalized_category');
      
      if (catError) throw catError;
      
      const { data: cityStats, error: cityError } = await client
        .from('events')
        .select('source, normalized_city, count(*)')
        .not('normalized_city', 'is', null)
        .group('source, normalized_city');
      
      if (cityError) throw cityError;
      
      // Get last sync times
      const { data: syncStats, error: syncError } = await client
        .from('sync_logs')
        .select('source, completed_at')
        .eq('status', 'success')
        .order('completed_at', { ascending: false });
      
      if (syncError) throw syncError;
      
      // Process and aggregate data
      const metrics: SourceMetrics[] = [];
      const sourceMap = new Map<string, SourceMetrics>();
      
      // Initialize metrics for each source
      sourceCounts?.forEach(({ source, count }) => {
        sourceMap.set(source, {
          source,
          totalEvents: parseInt(count as string),
          normalizedEvents: 0,
          avgConfidence: 0,
          lastSync: null,
          errors: 0,
          categories: {},
          cities: {}
        });
      });
      
      // Add normalization data
      normalizationStats?.forEach(({ source, confidence_score, normalization_method }) => {
        const metric = sourceMap.get(source);
        if (metric) {
          metric.normalizedEvents++;
          metric.avgConfidence += confidence_score || 0;
        }
      });
      
      // Calculate average confidence
      sourceMap.forEach(metric => {
        if (metric.normalizedEvents > 0) {
          metric.avgConfidence = metric.avgConfidence / metric.normalizedEvents;
        }
      });
      
      // Add category distributions
      categoryStats?.forEach(({ source, normalized_category, count }) => {
        const metric = sourceMap.get(source);
        if (metric) {
          metric.categories[normalized_category] = parseInt(count as string);
        }
      });
      
      // Add city distributions
      cityStats?.forEach(({ source, normalized_city, count }) => {
        const metric = sourceMap.get(source);
        if (metric) {
          metric.cities[normalized_city] = parseInt(count as string);
        }
      });
      
      // Add sync times
      syncStats?.forEach(({ source, completed_at }) => {
        const metric = sourceMap.get(source);
        if (metric && !metric.lastSync) {
          metric.lastSync = new Date(completed_at);
        }
      });
      
      return Array.from(sourceMap.values());
      
    } catch (error) {
      console.error('Error getting source metrics:', error);
      return [];
    }
  }
  
  /**
   * Get normalization quality metrics
   */
  async getNormalizationQuality(): Promise<NormalizationQuality> {
    try {
      const client = serverDatabaseService.getClient();
      
      const { data, error } = await client
        .from('events')
        .select('confidence_score, normalization_method')
        .not('confidence_score', 'is', null);
      
      if (error) throw error;
      
      const totalProcessed = data?.length || 0;
      let highConfidence = 0;
      let mediumConfidence = 0;
      let lowConfidence = 0;
      let totalConfidence = 0;
      const methodBreakdown: Record<string, number> = {};
      
      data?.forEach(({ confidence_score, normalization_method }) => {
        const confidence = confidence_score || 0;
        totalConfidence += confidence;
        
        if (confidence > 0.8) highConfidence++;
        else if (confidence >= 0.5) mediumConfidence++;
        else lowConfidence++;
        
        const method = normalization_method || 'unknown';
        methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;
      });
      
      return {
        totalProcessed,
        highConfidence,
        mediumConfidence,
        lowConfidence,
        avgConfidence: totalProcessed > 0 ? totalConfidence / totalProcessed : 0,
        methodBreakdown
      };
      
    } catch (error) {
      console.error('Error getting normalization quality:', error);
      return {
        totalProcessed: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        avgConfidence: 0,
        methodBreakdown: {}
      };
    }
  }
  
  /**
   * Check seasonal baselines for event counts
   */
  async checkSeasonalBaselines(city: string, month: number): Promise<SeasonalBaseline[]> {
    try {
      const client = serverDatabaseService.getClient();
      
      // Get current month's events
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, month, 0).toISOString().split('T')[0];
      
      const { data: currentEvents, error } = await client
        .from('events')
        .select('id')
        .eq('normalized_city', city)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) throw error;
      
      const actualEvents = currentEvents?.length || 0;
      
      // Define expected baselines (these would be learned from historical data)
      const expectedBaselines: Record<string, Record<number, number>> = {
        'Prague': {
          6: 150, // June - summer festivals
          7: 180, // July - peak summer
          8: 160, // August - summer events
          12: 200 // December - holiday events
        },
        'Brno': {
          6: 80,
          7: 100,
          8: 90,
          12: 120
        }
      };
      
      const expectedEvents = expectedBaselines[city]?.[month] || 50;
      const variance = ((actualEvents - expectedEvents) / expectedEvents) * 100;
      
      let status: 'healthy' | 'warning' | 'critical';
      if (variance < -30) status = 'critical';
      else if (variance < -15) status = 'warning';
      else status = 'healthy';
      
      return [{
        city,
        month,
        expectedEvents,
        actualEvents,
        variance,
        status
      }];
      
    } catch (error) {
      console.error('Error checking seasonal baselines:', error);
      return [];
    }
  }
  
  /**
   * Get health status for all sources
   */
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    sources: Array<{
      source: string;
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
    }>;
  }> {
    const metrics = await this.getSourceMetrics();
    const quality = await this.getNormalizationQuality();
    
    const sources = metrics.map(metric => {
      const issues: string[] = [];
      
      // Check for low event counts
      if (metric.totalEvents < 10) {
        issues.push('Low event count');
      }
      
      // Check for poor normalization quality
      if (metric.avgConfidence < 0.5) {
        issues.push('Low normalization confidence');
      }
      
      // Check for stale data
      if (metric.lastSync) {
        const daysSinceSync = (Date.now() - metric.lastSync.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSync > 7) {
          issues.push('Stale data (last sync > 7 days ago)');
        }
      } else {
        issues.push('No recent sync data');
      }
      
      let status: 'healthy' | 'warning' | 'critical';
      if (issues.length === 0) status = 'healthy';
      else if (issues.length <= 2) status = 'warning';
      else status = 'critical';
      
      return {
        source: metric.source,
        status,
        issues
      };
    });
    
    const criticalSources = sources.filter(s => s.status === 'critical').length;
    const warningSources = sources.filter(s => s.status === 'warning').length;
    
    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalSources > 0) overall = 'critical';
    else if (warningSources > 0) overall = 'warning';
    else overall = 'healthy';
    
    return { overall, sources };
  }
  
  /**
   * Log normalization metrics for monitoring
   */
  async logNormalizationMetrics(
    source: string,
    processed: number,
    avgConfidence: number,
    method: string
  ): Promise<void> {
    try {
      const client = serverDatabaseService.getClient();
      
      await client
        .from('normalization_logs')
        .insert({
          source,
          processed_count: processed,
          avg_confidence: avgConfidence,
          method,
          processed_at: new Date().toISOString()
        });
      
    } catch (error) {
      console.error('Error logging normalization metrics:', error);
    }
  }
}

export const observabilityService = new ObservabilityService();
