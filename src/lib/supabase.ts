import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to allow environment variables to be loaded first
let _supabase: SupabaseClient | null = null;

export const createClient = createSupabaseClient;

export const supabase = (() => {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not found. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
    }
    
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
})();

// For server-side operations
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not found. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Enhanced database service with connection validation and error handling
export class DatabaseService {
  private client: SupabaseClient;
  private isConnected: boolean = false;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(useServiceKey: boolean = false) {
    this.client = useServiceKey ? createServerClient() : supabase;
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Validate database connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('events')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Database connection validation failed:', error);
        this.isConnected = false;
        return false;
      }
      
      this.isConnected = true;
      this.lastHealthCheck = Date.now();
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if database is healthy (with caching)
   */
  async isHealthy(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent
    if (this.isConnected && (now - this.lastHealthCheck) < this.HEALTH_CHECK_INTERVAL) {
      return true;
    }
    
    return await this.validateConnection();
  }

  /**
   * Execute a database operation with error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate connection before operation
        if (!(await this.isHealthy())) {
          throw new Error('Database connection is not healthy');
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Database operation attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    throw new Error(`Database operation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalEvents: number;
    eventsBySource: Record<string, number>;
    eventsByCategory: Record<string, number>;
    lastUpdated: string | null;
  }> {
    try {
      const [eventsResult, sourcesResult, categoriesResult, lastUpdatedResult] = await Promise.all([
        this.client.from('events').select('count', { count: 'exact' }),
        this.client.from('events').select('source').then(result => {
          if (result.error) throw result.error;
          const sources: Record<string, number> = {};
          result.data?.forEach(event => {
            sources[event.source] = (sources[event.source] || 0) + 1;
          });
          return sources;
        }),
        this.client.from('events').select('category').then(result => {
          if (result.error) throw result.error;
          const categories: Record<string, number> = {};
          result.data?.forEach(event => {
            categories[event.category] = (categories[event.category] || 0) + 1;
          });
          return categories;
        }),
        this.client.from('events').select('updated_at').order('updated_at', { ascending: false }).limit(1)
      ]);

      return {
        totalEvents: eventsResult.count || 0,
        eventsBySource: sourcesResult,
        eventsByCategory: categoriesResult,
        lastUpdated: lastUpdatedResult.data?.[0]?.updated_at || null
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Export singleton instances
export const databaseService = new DatabaseService();

// Lazy initialization for server database service
let _serverDatabaseService: DatabaseService | null = null;
export const serverDatabaseService = (() => {
  if (!_serverDatabaseService) {
    _serverDatabaseService = new DatabaseService(true);
  }
  return _serverDatabaseService;
})();