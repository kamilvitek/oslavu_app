/**
 * API Registry Service
 * Centralized service to track and manage all available APIs and data sources
 */

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'local' | 'external';
  status: 'active' | 'inactive' | 'maintenance';
  description: string;
  endpoint?: string;
  lastUpdated?: Date;
  eventCount?: number;
  coverage?: string[];
}

export interface USPData {
  totalDataSources: number;
  activeAPIs: number;
  totalEvents: number;
  coverage: {
    cities: number;
    countries: number;
  };
  dataSources: DataSource[];
  lastUpdated: Date;
}

class APIRegistryService {
  private dataSources: DataSource[] = [
    {
      id: 'ticketmaster',
      name: 'Ticketmaster Discovery',
      type: 'api',
      status: 'active',
      description: 'Global event discovery API covering concerts, sports, and entertainment events',
      endpoint: 'https://app.ticketmaster.com/discovery/v2/',
      coverage: ['Global'],
    },
    {
      id: 'predicthq',
      name: 'PredictHQ',
      type: 'api',
      status: 'active',
      description: 'Predictive intelligence for events, conferences, and gatherings',
      endpoint: 'https://api.predicthq.com/v1/',
      coverage: ['Global'],
    },
    {
      id: 'brno-local',
      name: 'Brno Local Events',
      type: 'local',
      status: 'active',
      description: 'Local event data for Brno, Czech Republic',
      coverage: ['Brno'],
    },
    {
      id: 'eventbrite',
      name: 'Eventbrite',
      type: 'api',
      status: 'inactive',
      description: 'Event discovery and ticketing platform',
      endpoint: 'https://www.eventbriteapi.com/v3/',
      coverage: ['Global'],
    },
    {
      id: 'meetup',
      name: 'Meetup',
      type: 'api',
      status: 'inactive',
      description: 'Community events and meetups platform',
      endpoint: 'https://api.meetup.com/',
      coverage: ['Global'],
    },
  ];

  /**
   * Get all data sources
   */
  getDataSources(): DataSource[] {
    return this.dataSources;
  }

  /**
   * Get active data sources only
   */
  getActiveDataSources(): DataSource[] {
    return this.dataSources.filter(source => source.status === 'active');
  }

  /**
   * Add a new data source
   */
  addDataSource(dataSource: Omit<DataSource, 'id'>): DataSource {
    const id = dataSource.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newDataSource: DataSource = {
      ...dataSource,
      id,
      lastUpdated: new Date(),
    };
    
    this.dataSources.push(newDataSource);
    return newDataSource;
  }

  /**
   * Update an existing data source
   */
  updateDataSource(id: string, updates: Partial<DataSource>): DataSource | null {
    const index = this.dataSources.findIndex(source => source.id === id);
    if (index === -1) return null;

    this.dataSources[index] = {
      ...this.dataSources[index],
      ...updates,
      lastUpdated: new Date(),
    };

    return this.dataSources[index];
  }

  /**
   * Remove a data source
   */
  removeDataSource(id: string): boolean {
    const index = this.dataSources.findIndex(source => source.id === id);
    if (index === -1) return false;

    this.dataSources.splice(index, 1);
    return true;
  }

  /**
   * Get USP data for frontend display
   */
  getUSPData(): USPData {
    const activeSources = this.getActiveDataSources();
    const apiSources = activeSources.filter(source => source.type === 'api');
    
    // Calculate coverage
    const allCoverage = activeSources.flatMap(source => source.coverage || []);
    const uniqueCities = new Set(allCoverage.filter(coverage => 
      !['Global', 'Europe', 'North America', 'Asia'].includes(coverage)
    ));
    const uniqueCountries = new Set(allCoverage.filter(coverage => 
      ['Global', 'Europe', 'North America', 'Asia'].includes(coverage)
    ));

    return {
      totalDataSources: this.dataSources.length,
      activeAPIs: apiSources.length,
      totalEvents: activeSources.reduce((sum, source) => sum + (source.eventCount || 0), 0),
      coverage: {
        cities: uniqueCities.size,
        countries: uniqueCountries.size,
      },
      dataSources: activeSources,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get data source by ID
   */
  getDataSourceById(id: string): DataSource | null {
    return this.dataSources.find(source => source.id === id) || null;
  }

  /**
   * Update event count for a data source
   */
  updateEventCount(id: string, eventCount: number): boolean {
    const source = this.getDataSourceById(id);
    if (!source) return false;

    source.eventCount = eventCount;
    source.lastUpdated = new Date();
    return true;
  }

  /**
   * Get statistics for dashboard
   */
  getStatistics() {
    const activeSources = this.getActiveDataSources();
    const apiSources = activeSources.filter(source => source.type === 'api');
    const localSources = activeSources.filter(source => source.type === 'local');

    return {
      totalSources: this.dataSources.length,
      activeSources: activeSources.length,
      apiSources: apiSources.length,
      localSources: localSources.length,
      inactiveSources: this.dataSources.length - activeSources.length,
      totalEvents: activeSources.reduce((sum, source) => sum + (source.eventCount || 0), 0),
    };
  }
}

// Export singleton instance
export const apiRegistry = new APIRegistryService();

