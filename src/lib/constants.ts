export const API_ENDPOINTS = {
  ANALYZE: '/api/analyze',
  EVENTS: '/api/events',
  USER: '/api/user',
} as const;

export const EXTERNAL_APIS = {
  TICKETMASTER: 'https://app.ticketmaster.com/discovery/v2/',
  MEETUP: 'https://api.meetup.com/',
  PREDICTHQ: 'https://api.predicthq.com/v1/',
} as const;

export const CITIES = [
  'Prague',
  'Brno',
  'Ostrava',
  'Olomouc',
  'London',
  'Berlin',
  'Paris',
  'Amsterdam',
  'Vienna',
  'Warsaw',
  'Budapest',
  'Zurich',
  'Munich',
  'Stockholm',
  'Copenhagen',
  'Helsinki',
  'Oslo',
] as const;

export const CONFLICT_SCORE_RANGES = {
  LOW: { min: 0, max: 5, color: 'green' },
  MEDIUM: { min: 6, max: 15, color: 'yellow' },
  HIGH: { min: 16, max: 20, color: 'red' },
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    currency: 'EUR',
    analyses: 3,
    features: ['3 analyses per year', 'Basic conflict detection', 'Email support'],
  },
  PRO: {
    name: 'Pro',
    price: 79,
    currency: 'EUR',
    analyses: 25,
    features: ['25 analyses per month', 'Advanced conflict scoring', 'Priority support', 'API access'],
  },
  AGENCY: {
    name: 'Agency',
    price: 299,
    currency: 'EUR',
    analyses: -1, // unlimited
    features: ['Unlimited analyses', 'White-label API', 'Custom integrations', 'Dedicated support'],
  },
} as const;

export const SEARCH_STRATEGIES = {
  TICKETMASTER: {
    enabled: true,
    strategies: {
      directCity: { enabled: true, timeout: 8000 }, // Reduced from 10000
      radiusSearch: { enabled: true, timeout: 10000, radius: '50' }, // Reduced from 15000
      marketBased: { enabled: true, timeout: 8000 }, // Reduced from 12000
      keywordSearch: { enabled: true, timeout: 8000 }, // Reduced from 10000
      extendedRadius: { enabled: true, timeout: 12000, radius: '100' }, // Reduced from 20000
    },
    maxConcurrentStrategies: 3,
    deduplicationEnabled: true,
  },
  PREDICTHQ: {
    enabled: true,
    strategies: {
      cityBased: { enabled: true, timeout: 8000 }, // Reduced from 10000
      keywordSearch: { enabled: true, timeout: 8000 }, // Reduced from 10000
      highAttendance: { enabled: true, timeout: 10000, minAttendance: 1000 }, // Reduced from 12000
      highRank: { enabled: true, timeout: 10000, minRank: 50 }, // Reduced from 12000
      radiusSearch: { enabled: true, timeout: 10000, radius: '50km' }, // Reduced from 15000
      extendedRadius: { enabled: true, timeout: 12000, radius: '100km' }, // Reduced from 20000
    },
    maxConcurrentStrategies: 4,
    deduplicationEnabled: true,
  },
} as const;

export const SEARCH_CONFIG = {
  defaultTimeout: 10000, // Reduced from 15000 for faster responses
  maxRetries: 2,
  enableStrategyLogging: true,
  enablePerformanceMonitoring: true,
  deduplicationThreshold: 0.8, // String similarity threshold for deduplication
  maxEventsPerStrategy: 500, // Reduced from 1000 for faster processing
  enableEarlyReturn: true, // Return early if enough events found
  earlyReturnThreshold: 25, // Reduced from 50 for faster responses
} as const;