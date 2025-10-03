'use client';

import { useState } from 'react';
import { eventScraperService } from '@/lib/services/event-scraper';

export default function TestScraperPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing scraper connection...');
    
    try {
      const testResult = await eventScraperService.testConnection();
      setResult(`Connection test: ${testResult.success ? '✅ Success' : '❌ Failed'}\n${testResult.message}`);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testScrapeAll = async () => {
    setLoading(true);
    setResult('Starting scrape of all sources...');
    
    try {
      const scrapeResult = await eventScraperService.scrapeAllSources();
      setResult(`Scraping completed:\n- Created: ${scrapeResult.created}\n- Skipped: ${scrapeResult.skipped}\n- Errors: ${scrapeResult.errors.length}\n\nErrors: ${scrapeResult.errors.join('\n')}`);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Web Scraper Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Connection
        </button>
        
        <button
          onClick={testScrapeAll}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Test Scrape All Sources
        </button>
      </div>
      
      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-bold mb-4">Result:</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
