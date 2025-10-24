#!/usr/bin/env tsx
// scripts/backfill-attendees.ts
import { attendeeBackfillService } from '../src/lib/services/attendee-backfill';

interface ScriptOptions {
  dryRun: boolean;
  limit: number;
  batchSize: number;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    dryRun: false,
    limit: 1000,
    batchSize: 100,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--limit':
      case '-l':
        const limit = parseInt(args[i + 1]);
        if (isNaN(limit) || limit <= 0) {
          console.error('❌ Invalid limit value. Must be a positive number.');
          process.exit(1);
        }
        options.limit = limit;
        i++; // Skip next argument as it's the limit value
        break;
      case '--batch-size':
      case '-b':
        const batchSize = parseInt(args[i + 1]);
        if (isNaN(batchSize) || batchSize <= 0) {
          console.error('❌ Invalid batch size. Must be a positive number.');
          process.exit(1);
        }
        options.batchSize = batchSize;
        i++; // Skip next argument as it's the batch size value
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Unknown option: ${arg}`);
          console.error('Use --help for usage information.');
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🔄 Attendee Data Backfill Script

This script backfills missing attendee data for existing events using venue capacity estimation.

USAGE:
  npm run backfill-attendees [OPTIONS]
  tsx scripts/backfill-attendees.ts [OPTIONS]

OPTIONS:
  --dry-run, -d          Run in dry-run mode (no database changes)
  --limit, -l <number>   Maximum number of events to process (default: 1000)
  --batch-size, -b <number>  Number of events to process per batch (default: 100)
  --verbose, -v          Show detailed progress information
  --help, -h             Show this help message

EXAMPLES:
  # Dry run with default settings
  npm run backfill-attendees --dry-run

  # Process 500 events in batches of 50 with verbose output
  npm run backfill-attendees --limit 500 --batch-size 50 --verbose

  # Full production run
  npm run backfill-attendees --limit 5000

ENVIRONMENT VARIABLES:
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key

The script will:
1. Query events without attendee data
2. Estimate attendees using venue capacity patterns
3. Update events in batches
4. Provide detailed statistics
`);
}

async function showStats(): Promise<void> {
  try {
    console.log('📊 Getting current statistics...');
    const stats = await attendeeBackfillService.getBackfillStats();
    
    console.log(`
📈 Current Database Statistics:
  Total Events: ${stats.totalEvents.toLocaleString()}
  Events with Attendees: ${stats.eventsWithAttendees.toLocaleString()}
  Events without Attendees: ${stats.eventsWithoutAttendees.toLocaleString()}
  Completion: ${stats.percentageComplete}%
`);
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
  }
}

async function runBackfill(options: ScriptOptions): Promise<void> {
  console.log(`
🔄 Starting Attendee Data Backfill
================================
Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (database will be updated)'}
Limit: ${options.limit.toLocaleString()} events
Batch Size: ${options.batchSize} events per batch
Verbose: ${options.verbose ? 'Yes' : 'No'}
`);

  try {
    const result = await attendeeBackfillService.backfillMissingAttendees({
      dryRun: options.dryRun,
      limit: options.limit,
      batchSize: options.batchSize,
      verbose: options.verbose
    });

    console.log(`
🏁 Backfill Completed
===================
Duration: ${(result.duration / 1000).toFixed(2)} seconds
Total Events Found: ${result.totalEvents.toLocaleString()}
Events Processed: ${result.processedEvents.toLocaleString()}
Events Updated: ${result.updatedEvents.toLocaleString()}
Events Skipped: ${result.skippedEvents.toLocaleString()}
Events Failed: ${result.failedEvents.toLocaleString()}
`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    if (options.dryRun) {
      console.log('\n🔍 This was a dry run. No changes were made to the database.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Database has been updated with attendee estimates.');
    }

  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Show current statistics
  await showStats();

  // Confirm before running (unless dry run)
  if (!options.dryRun) {
    console.log('\n⚠️  WARNING: This will modify the database!');
    console.log('Consider running with --dry-run first to see what would be changed.');
    
    // In a real implementation, you might want to add a confirmation prompt here
    // For now, we'll proceed with the assumption that the user wants to continue
  }

  await runBackfill(options);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
