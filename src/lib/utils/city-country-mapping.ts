export const cityToCountryMap: Record<string, string> = {
  // Czech Republic
  'Prague': 'CZ',
  'Brno': 'CZ', 
  'Ostrava': 'CZ',
  'Olomouc': 'CZ',
  'Plzen': 'CZ',
  
  // Germany  
  'Berlin': 'DE',
  'Munich': 'DE',
  'Hamburg': 'DE',
  'Cologne': 'DE',
  'Frankfurt': 'DE',
  'Stuttgart': 'DE',
  'Düsseldorf': 'DE',
  'Dortmund': 'DE',
  'Leipzig': 'DE',
  'Dresden': 'DE',
  
  // United Kingdom
  'London': 'GB',
  'Edinburgh': 'GB', 
  'Glasgow': 'GB',
  'Manchester': 'GB',
  'Birmingham': 'GB',
  'Liverpool': 'GB',
  'Bristol': 'GB',
  'Leeds': 'GB',
  
  // Other European cities
  'Paris': 'FR',
  'Amsterdam': 'NL',
  'Vienna': 'AT', 
  'Warsaw': 'PL',
  'Budapest': 'HU',
  'Zurich': 'CH',
  'Rome': 'IT',
  'Madrid': 'ES',
  'Stockholm': 'SE',
  'Copenhagen': 'DK',
  'Oslo': 'NO',
  'Helsinki': 'FI'
};

export function getCityCountryCode(city: string): string {
  const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  return cityToCountryMap[normalizedCity] || cityToCountryMap[city] || 'CZ';
}

export function validateCityCountryPair(city: string, countryCode: string): boolean {
  const expectedCountry = getCityCountryCode(city);
  return expectedCountry === countryCode;
}
