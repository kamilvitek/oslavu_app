#!/usr/bin/env ts-node
// Migration script to backfill subcategories for existing events

import { createClient } from '../src/lib/supabase';
import { subcategoryExtractionService } from '../src/lib/services/subcategory-extraction';

interface DatabaseEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  subcategory_confidence: number | null;
  subcategory_method: string | null;
}

class SubcategoryMigrationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  private batchSize = 50;
  private processedCount = 0;
  private successCount = 0;
  private errorCount = 0;

  async runMigration(): Promise<void> {
    console.log('🚀 Starting subcategory migration...');
    
    try {
      // Get total count of events without subcategories
      const { count } = await this.getEventsWithoutSubcategoriesCount();
      console.log(`📊 Found ${count} events without subcategories`);

      if (count === 0) {
        console.log('✅ All events already have subcategories. Migration complete.');
        return;
      }

      // Process events in batches
      let offset = 0;
      while (offset < count) {
        console.log(`\n📦 Processing batch ${Math.floor(offset / this.batchSize) + 1} (${offset + 1}-${Math.min(offset + this.batchSize, count)})`);
        
        const events = await this.getEventsBatch(offset, this.batchSize);
        if (events.length === 0) break;

        await this.processBatch(events);
        
        offset += this.batchSize;
        
        // Add delay between batches to avoid overwhelming the system
        if (offset < count) {
          console.log('⏳ Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      this.printSummary();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async getEventsWithoutSubcategoriesCount(): Promise<{ count: number }> {
    const { count, error } = await this.supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .is('subcategory', null);

    if (error) {
      throw new Error(`Failed to get events count: ${error.message}`);
    }

    return { count: count || 0 };
  }

  private async getEventsBatch(offset: number, limit: number): Promise<DatabaseEvent[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('id, title, description, category, subcategory, subcategory_confidence, subcategory_method')
      .is('subcategory', null)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch events batch: ${error.message}`);
    }

    return data as DatabaseEvent[];
  }

  private async processBatch(events: DatabaseEvent[]): Promise<void> {
    console.log(`🔄 Processing ${events.length} events...`);

    // Extract subcategories for all events in the batch
    const extractionResults = await subcategoryExtractionService.batchExtractSubcategories(
      events.map(event => ({
        title: event.title,
        description: event.description,
        category: event.category
      }))
    );

    // Update events with subcategory information
    const updatePromises = events.map(async (event, index) => {
      const result = extractionResults[index];
      
      try {
        const { error } = await this.supabase
          .from('events')
          .update({
            subcategory: result.subcategory,
            subcategory_confidence: result.confidence,
            subcategory_method: result.method,
            genre_tags: result.genreTags
          })
          .eq('id', event.id);

        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }

        this.successCount++;
        console.log(`  ✅ ${event.title}: ${result.subcategory || 'None'} (${(result.confidence * 100).toFixed(1)}% confidence, ${result.method})`);
      } catch (error) {
        this.errorCount++;
        console.error(`  ❌ ${event.title}: ${error}`);
      }
    });

    await Promise.all(updatePromises);
    this.processedCount += events.length;
  }

  private printSummary(): void {
    console.log('\n📈 Migration Summary:');
    console.log(`  Total processed: ${this.processedCount}`);
    console.log(`  Successful: ${this.successCount}`);
    console.log(`  Errors: ${this.errorCount}`);
    console.log(`  Success rate: ${((this.successCount / this.processedCount) * 100).toFixed(1)}%`);

    // Print extraction method statistics
    const stats = subcategoryExtractionService.getExtractionStats();
    console.log('\n🔍 Extraction Method Statistics:');
    console.log(`  Cache size: ${stats.cacheSize}`);
    console.log('  Methods used:');
    Object.entries(stats.methodsUsed).forEach(([method, count]) => {
      console.log(`    ${method}: ${count} events`);
    });
  }

  async validateMigration(): Promise<void> {
    console.log('\n🔍 Validating migration results...');
    
    const { data: validationData, error } = await this.supabase
      .from('events')
      .select('category, subcategory, subcategory_method, subcategory_confidence')
      .not('subcategory', 'is', null);

    if (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Group by category and subcategory
    const categoryStats: Record<string, Record<string, number>> = {};
    const methodStats: Record<string, number> = {};
    const confidenceStats = { high: 0, medium: 0, low: 0 };

    validationData.forEach((event: any) => {
      // Category stats
      if (!categoryStats[event.category]) {
        categoryStats[event.category] = {};
      }
      categoryStats[event.category][event.subcategory] = (categoryStats[event.category][event.subcategory] || 0) + 1;

      // Method stats
      methodStats[event.subcategory_method] = (methodStats[event.subcategory_method] || 0) + 1;

      // Confidence stats
      if (event.subcategory_confidence >= 0.8) {
        confidenceStats.high++;
      } else if (event.subcategory_confidence >= 0.5) {
        confidenceStats.medium++;
      } else {
        confidenceStats.low++;
      }
    });

    console.log('\n📊 Category Distribution:');
    Object.entries(categoryStats).forEach(([category, subcategories]) => {
      console.log(`  ${category}:`);
      Object.entries(subcategories).forEach(([subcategory, count]) => {
        console.log(`    ${subcategory}: ${count} events`);
      });
    });

    console.log('\n🔧 Method Distribution:');
    Object.entries(methodStats).forEach(([method, count]) => {
      console.log(`  ${method}: ${count} events`);
    });

    console.log('\n🎯 Confidence Distribution:');
    console.log(`  High (≥80%): ${confidenceStats.high} events`);
    console.log(`  Medium (50-79%): ${confidenceStats.medium} events`);
    console.log(`  Low (<50%): ${confidenceStats.low} events`);
  }
}

// Main execution
async function main() {
  const migrationService = new SubcategoryMigrationService();
  
  try {
    await migrationService.runMigration();
    await migrationService.validateMigration();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SubcategoryMigrationService };
