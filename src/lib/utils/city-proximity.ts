// src/lib/utils/city-proximity.ts

/**
 * Get nearby cities for a given city in Czech Republic
 * Used to expand search radius for Perplexity research
 */
export function getNearbyCities(city: string): string[] {
  const normalizedCity = city.toLowerCase().trim();
  
  const cityMap: Record<string, string[]> = {
    'prague': ['Brno', 'Pardubice', 'Hradec Králové', 'České Budějovice', 'Plzeň'],
    'brno': ['Prague', 'Pardubice', 'Olomouc', 'Zlín', 'Ostrava'],
    'hradec králové': ['Prague', 'Pardubice', 'Brno', 'Liberec'],
    'pardubice': ['Prague', 'Hradec Králové', 'Brno', 'Olomouc'],
    'ostrava': ['Brno', 'Prague', 'Olomouc', 'Zlín'],
    'olomouc': ['Brno', 'Ostrava', 'Pardubice', 'Zlín'],
    'plzeň': ['Prague', 'České Budějovice'],
    'české budějovice': ['Prague', 'Plzeň', 'Brno'],
    'liberec': ['Prague', 'Hradec Králové'],
    'zlín': ['Brno', 'Olomouc', 'Ostrava'],
  };
  
  // Try exact match first
  if (cityMap[normalizedCity]) {
    return cityMap[normalizedCity];
  }
  
  // Try partial match
  for (const [key, cities] of Object.entries(cityMap)) {
    if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
      return cities;
    }
  }
  
  // Default: return major Czech cities
  return ['Prague', 'Brno', 'Pardubice', 'Hradec Králové'];
}

/**
 * Format nearby cities for use in prompts
 */
export function formatNearbyCities(city: string): string {
  const nearby = getNearbyCities(city);
  if (nearby.length === 0) {
    return city;
  }
  return `${city}, ${nearby.join(', ')}`;
}

