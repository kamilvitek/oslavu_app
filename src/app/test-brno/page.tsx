// src/app/test-brno/page.tsx
"use client";
import { useEffect, useState } from 'react';

export default function TestBrnoPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0,10);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString().slice(0,10);
        const res = await fetch(`/api/analyze/events/brno?startDate=${start}&endDate=${end}`);
        const data = await res.json();
        setEvents(data.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Brno Events (ArcGIS)</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-500">{error}</p>}
      <ul className="space-y-3">
        {events.map((e) => (
          <li key={`${e.source}-${e.id}`} className="border rounded p-3">
            <div className="font-semibold">{e.title}</div>
            <div className="text-sm text-gray-600">{new Date(e.date).toLocaleString()} {e.endDate ? `– ${new Date(e.endDate).toLocaleString()}` : ''}</div>
            {e.category && <div className="text-sm">Category: {e.category}</div>}
            {e.url && <a className="text-blue-600 underline" href={e.url} target="_blank" rel="noreferrer">Link</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}


