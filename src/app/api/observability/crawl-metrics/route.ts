import { NextResponse } from 'next/server';
import { serverDatabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    const db = serverDatabaseService;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db.executeWithRetry(async () => {
      return await db.getClient()
        .from('sync_logs')
        .select('source, status, events_processed, events_created, events_skipped, pages_crawled, pages_processed, crawl_duration_ms, started_at, completed_at')
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(500);
    });

    if (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }

    const rows = (data as any[]) ?? [];
    const totals = rows.reduce(
      (acc, r) => {
        acc.pages_discovered += r.pages_crawled ?? 0;
        acc.pages_processed += r.pages_processed ?? 0;
        acc.events_processed += r.events_processed ?? 0;
        acc.events_created += r.events_created ?? 0;
        acc.events_skipped += r.events_skipped ?? 0;
        acc.crawls += 1;
        acc.failures += r.status === 'error' ? 1 : 0;
        acc.duration_ms += r.crawl_duration_ms ?? 0;
        return acc;
      },
      { pages_discovered: 0, pages_processed: 0, events_processed: 0, events_created: 0, events_skipped: 0, crawls: 0, failures: 0, duration_ms: 0 }
    );

    const avg_duration_ms = totals.crawls > 0 ? Math.round(totals.duration_ms / totals.crawls) : 0;
    const success_rate = totals.crawls > 0 ? (1 - totals.failures / totals.crawls) : 1;

    return NextResponse.json({
      success: true,
      totals: { ...totals, avg_duration_ms, success_rate },
      recent: rows.slice(0, 50),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}


