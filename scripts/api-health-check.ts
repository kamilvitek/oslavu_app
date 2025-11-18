#!/usr/bin/env tsx

/**
 * API Health Check Script
 *
 * Runs lightweight requests against every external API the app depends on.
 * Usage: npx tsx scripts/api-health-check.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

type ApiCheckStatus = 'passed' | 'failed' | 'skipped';

interface ApiCheckResult {
  name: string;
  status: ApiCheckStatus;
  message: string;
  latencyMs: number;
  sample?: string;
  error?: string;
}

interface ApiCheckDefinition {
  name: string;
  description: string;
  requires: string[];
  run: () => Promise<{ message: string; sample?: string }>;
}

const loadEnvFiles = () => {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
  dotenv.config({ override: false });
};

const fetchJson = async (input: string | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  if (!response.ok || (typeof data === 'object' && data?.success === false)) {
    const message =
      typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2).slice(0, 400);
    throw new Error(`${response.status} ${response.statusText} - ${message}`);
  }

  return { data, response };
};

const checks: ApiCheckDefinition[] = [
  {
    name: 'Supabase REST',
    description: 'Validates database connectivity via anon key',
    requires: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    run: async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey);

      const { data, error } = await client
        .from('events')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(error.message);
      }

      return {
        message: 'Events table reachable via REST',
        sample: data?.[0]?.id ? `Sample event id: ${data[0].id}` : 'No events stored yet',
      };
    },
  },
  {
    name: 'OpenAI',
    description: 'Checks model list endpoint',
    requires: ['OPENAI_API_KEY'],
    run: async () => {
      const apiKey = process.env.OPENAI_API_KEY!;
      const { data } = await fetchJson('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const total = Array.isArray(data?.data) ? data.data.length : 0;
      const sample = Array.isArray(data?.data) ? data.data[0]?.id : undefined;

      return {
        message: `Model catalog reachable (${total} models)`,
        sample: sample ? `First model: ${sample}` : undefined,
      };
    },
  },
  {
    name: 'Firecrawl',
    description: 'Checks queue status endpoint',
    requires: ['FIRECRAWL_API_KEY'],
    run: async () => {
      const apiKey = process.env.FIRECRAWL_API_KEY!;
      const { data } = await fetchJson('https://api.firecrawl.dev/v1/team/queue-status', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const queueInfo = data?.queue || data;
      const scraping = queueInfo?.scraping ?? queueInfo?.in_progress;
      const queued = queueInfo?.queued ?? queueInfo?.pending;

      return {
        message: 'Queue status reachable',
        sample:
          scraping !== undefined || queued !== undefined
            ? `Scraping: ${scraping ?? 0}, queued: ${queued ?? 0}`
            : undefined,
      };
    },
  },
  {
    name: 'PredictHQ',
    description: 'Fetches a single event for CZ',
    requires: ['PREDICTHQ_API_KEY'],
    run: async () => {
      const apiKey = process.env.PREDICTHQ_API_KEY!;
      const params = new URLSearchParams({
        limit: '1',
        country: 'CZ',
        sort: 'start',
      });

      const { data } = await fetchJson(`https://api.predicthq.com/v1/events/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      const title = data?.results?.[0]?.title ?? 'No events returned';
      return {
        message: `Events endpoint responded (${data?.count ?? 0} total)`,
        sample: `Sample: ${title}`,
      };
    },
  },
  {
    name: 'Ticketmaster',
    description: 'Fetches a single Czech event',
    requires: ['TICKETMASTER_API_KEY'],
    run: async () => {
      const apiKey = process.env.TICKETMASTER_API_KEY!;
      const params = new URLSearchParams({
        apikey: apiKey,
        size: '1',
        countryCode: 'CZ',
        sort: 'date,asc',
      });

      const { data } = await fetchJson(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
      const total = data?.page?.totalElements ?? 0;
      const sample = data?._embedded?.events?.[0]?.name;

      return {
        message: `Discovery API reachable (${total} total events)`,
        sample: sample ? `Sample: ${sample}` : undefined,
      };
    },
  },
  {
    name: 'Perplexity',
    description: 'Runs a minimal completion on sonar-pro',
    requires: ['PERPLEXITY_API_KEY'],
    run: async () => {
      const apiKey = process.env.PERPLEXITY_API_KEY!;
      const payload = {
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a concise assistant. Respond with a single word.' },
          { role: 'user', content: 'Reply with the word "pong".' },
        ],
        temperature: 0,
        max_tokens: 10,
      };

      const { data } = await fetchJson('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const content = data?.choices?.[0]?.message?.content?.trim();
      return {
        message: 'Chat endpoint responded',
        sample: content ? `Response: ${content}` : undefined,
      };
    },
  },
];

const runChecks = async () => {
  loadEnvFiles();
  const results: ApiCheckResult[] = [];

  for (const check of checks) {
    const missing = check.requires.filter(key => !process.env[key]);
    if (missing.length > 0) {
      results.push({
        name: check.name,
        status: 'skipped',
        message: `Skipped: missing ${missing.join(', ')}`,
        latencyMs: 0,
      });
      continue;
    }

    const start = Date.now();

    try {
      const outcome = await check.run();
      results.push({
        name: check.name,
        status: 'passed',
        message: outcome.message,
        sample: outcome.sample,
        latencyMs: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: check.name,
        status: 'failed',
        message: 'Request failed',
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - start,
      });
    }
  }

  return results;
};

const printSummary = (results: ApiCheckResult[]) => {
  console.log('\nAPI Health Check');
  console.log('─────────────────');

  for (const result of results) {
    const icon =
      result.status === 'passed'
        ? '✅'
        : result.status === 'skipped'
          ? '⚠️'
          : '❌';

    const latency = result.latencyMs ? `${result.latencyMs}ms` : '-';
    console.log(`${icon} ${result.name.padEnd(18)} ${latency.padStart(6)}  ${result.message}`);

    if (result.sample) {
      console.log(`   ↳ ${result.sample}`);
    }

    if (result.error) {
      console.log(`   ↳ ${result.error}`);
    }
  }

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log('\nSummary:');
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log(`  Skipped: ${skipped}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runChecks()
  .then(printSummary)
  .catch(error => {
    console.error('Unexpected error while running API health checks:', error);
    process.exitCode = 1;
  });

