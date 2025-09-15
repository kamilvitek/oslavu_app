/**
 * USP Updater Service
 * Utility functions to update USP data when events are fetched or APIs change
 */

import { apiRegistry } from './api-registry';

export class USPUpdater {
  /**
   * Update event count for a specific data source
   */
  static async updateEventCount(sourceId: string, eventCount: number): Promise<void> {
    try {
      apiRegistry.updateEventCount(sourceId, eventCount);
      console.log(`Updated event count for ${sourceId}: ${eventCount} events`);
    } catch (error) {
      console.error(`Failed to update event count for ${sourceId}:`, error);
    }
  }

  /**
   * Update multiple event counts at once
   */
  static async updateMultipleEventCounts(counts: Record<string, number>): Promise<void> {
    try {
      for (const [sourceId, count] of Object.entries(counts)) {
        apiRegistry.updateEventCount(sourceId, count);
      }
      console.log('Updated multiple event counts:', counts);
    } catch (error) {
      console.error('Failed to update multiple event counts:', error);
    }
  }

  /**
   * Add a new data source to the registry
   */
  static async addDataSource(dataSource: {
    name: string;
    type: 'api' | 'local' | 'external';
    status: 'active' | 'inactive' | 'maintenance';
    description: string;
    endpoint?: string;
    coverage?: string[];
  }): Promise<void> {
    try {
      const newSource = apiRegistry.addDataSource(dataSource);
      console.log('Added new data source:', newSource);
    } catch (error) {
      console.error('Failed to add data source:', error);
    }
  }

  /**
   * Update data source status
   */
  static async updateDataSourceStatus(sourceId: string, status: 'active' | 'inactive' | 'maintenance'): Promise<void> {
    try {
      const updated = apiRegistry.updateDataSource(sourceId, { status });
      if (updated) {
        console.log(`Updated ${sourceId} status to ${status}`);
      } else {
        console.warn(`Data source ${sourceId} not found`);
      }
    } catch (error) {
      console.error(`Failed to update status for ${sourceId}:`, error);
    }
  }

  /**
   * Get current USP statistics
   */
  static getStatistics() {
    return apiRegistry.getStatistics();
  }

  /**
   * Refresh USP data (useful for periodic updates)
   */
  static async refreshUSPData(): Promise<void> {
    try {
      // This could trigger a re-fetch of event counts from all sources
      // For now, we'll just log that a refresh was requested
      console.log('USP data refresh requested');
      
      // In a real implementation, you might want to:
      // 1. Fetch current event counts from all APIs
      // 2. Update the registry with fresh data
      // 3. Trigger a cache invalidation for the frontend
    } catch (error) {
      console.error('Failed to refresh USP data:', error);
    }
  }
}

// Export for use in other services
export { USPUpdater };
