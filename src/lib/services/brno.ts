// src/lib/services/brno.ts
import { Event } from '@/types';

interface BrnoArcGisFeature {
  attributes: {
    ID?: number;
    name?: string;
    text?: string;
    tickets?: string;
    url?: string;
    categories?: string;
    parent_festivals?: string;
    organizer_email?: string;
    tickets_url?: string;
    name_en?: string;
    text_en?: string;
    url_en?: string;
    latitude?: number;
    longitude?: number;
    date_from?: number | string;
    date_to?: number | string;
    tickets_info?: string;
    tickets_url_en?: string;
  };
}

interface BrnoArcGisResponse {
  features: BrnoArcGisFeature[];
}

export class BrnoEventsService {
  private readonly baseQueryUrl: string;

  constructor() {
    // Base query URL provided, we will add dynamic parameters when needed
    this.baseQueryUrl = 'https://services6.arcgis.com/fUWVlHWZNxUvTUh8/arcgis/rest/services/Events/FeatureServer/0/query';
  }

  async getEvents(params: {
    city?: string; // not used by API, for consistency
    startDate?: string; // yyyy-mm-dd
    endDate?: string;   // yyyy-mm-dd
    page?: number;
    pageSize?: number;
  } = {}): Promise<Event[]> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 200;

    const whereParts: string[] = [];

    // Date filtering: date_from/date_to are epoch millis in ArcGIS sometimes; we will filter client-side after fetch
    // Keep server-side where broad to avoid missing items; use 1=1
    const where = whereParts.length ? whereParts.join(' AND ') : '1=1';

    const outFields = [
      'ID','name','text','tickets','url','categories','parent_festivals','organizer_email','tickets_url',
      'name_en','text_en','url_en','latitude','longitude','date_from','date_to','tickets_info','tickets_url_en'
    ].join(',');

    const searchParams = new URLSearchParams({
      where,
      outFields,
      outSR: '4326',
      f: 'json',
      resultOffset: String((page - 1) * pageSize),
      resultRecordCount: String(pageSize)
    });

    const url = `${this.baseQueryUrl}?${searchParams.toString()}`;

    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Brno ArcGIS error ${response.status}: ${text}`);
    }

    const data: BrnoArcGisResponse = await response.json();
    const all = (data.features || []).map(f => this.transformFeatureToEvent(f));

    // Client-side date filter if provided
    const filtered = all.filter(evt => {
      const evtDate = new Date(evt.date);
      if (params.startDate && evtDate < new Date(params.startDate)) return false;
      if (params.endDate && evtDate > new Date(params.endDate)) return false;
      return true;
    });

    return filtered;
  }

  private transformFeatureToEvent(feature: BrnoArcGisFeature): Event {
    const a = feature.attributes || {};

    const startIso = this.parseArcGisDate(a.date_from);
    const endIso = this.parseArcGisDate(a.date_to);

    const title = a.name?.trim() || a.name_en?.trim() || 'Untitled';
    const description = (a.text_en || a.text || '').toString();

    const event: Event = {
      id: String(a.ID ?? `${title}-${startIso}`),
      title,
      description: description || undefined,
      date: startIso,
      endDate: endIso,
      city: 'Brno',
      venue: undefined,
      category: (a.categories || 'Other').toString(),
      subcategory: undefined,
      expectedAttendees: undefined,
      source: 'brno',
      sourceId: a.ID ? String(a.ID) : undefined,
      url: (a.url_en || a.url || a.tickets_url || a.tickets_url_en) || undefined,
      imageUrl: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return event;
  }

  private parseArcGisDate(value?: number | string): string {
    if (value === undefined || value === null) return new Date().toISOString();
    // ArcGIS often returns epoch millis; sometimes ISO string
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && asNum > 10000000000) {
      return new Date(asNum).toISOString();
    }
    // Fallback: try Date parse
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return new Date().toISOString();
  }
}

export const brnoEventsService = new BrnoEventsService();


