export const API_ENDPOINTS = {
  ANALYZE: '/api/analyze',
  EVENTS: '/api/events',
  USER: '/api/user',
} as const;

export const EXTERNAL_APIS = {
  TICKETMASTER: 'https://app.ticketmaster.com/discovery/v2/',
  EVENTBRITE: 'https://www.eventbriteapi.com/v3/',
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
  LOW: { min: 0, max: 30, color: 'green' },
  MEDIUM: { min: 31, max: 70, color: 'yellow' },
  HIGH: { min: 71, max: 100, color: 'red' },
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