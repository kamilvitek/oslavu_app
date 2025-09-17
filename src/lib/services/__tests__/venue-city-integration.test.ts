// src/lib/services/__tests__/venue-city-integration.test.ts
import { TicketmasterService } from '../ticketmaster';
import { PredictHQService } from '../predicthq';
import { venueCityMappingService } from '../venue-city-mapping';

// Mock the API keys for testing
const mockApiKey = 'test-api-key';

describe('Venue-City Integration Tests', () => {
  let ticketmasterService: TicketmasterService;
  let predicthqService: PredictHQService;

  beforeEach(() => {
    ticketmasterService = new TicketmasterService(mockApiKey);
    predicthqService = new PredictHQService();
  });

  describe('Ticketmaster Service Integration', () => {
    it('should correctly extract city from venue when city is set as country name', () => {
      // Mock event data where city is incorrectly set as "Czech Republic"
      const mockEvent = {
        id: 'test-event-1',
        name: 'Test Concert at O2 Arena',
        description: 'A test concert',
        dates: {
          start: { localDate: '2024-06-15' },
          end: { localDate: '2024-06-15' }
        },
        _embedded: {
          venues: [{
            name: 'O2 Arena',
            city: { name: 'Czech Republic' }, // Incorrectly set as country
            country: { name: 'Czech Republic' }
          }]
        },
        classifications: [{
          segment: { name: 'Music' },
          genre: { name: 'Rock' },
          subGenre: { name: 'Alternative Rock' }
        }],
        url: 'https://example.com/event',
        images: [{ url: 'https://example.com/image.jpg' }]
      };

      // Test the private method through reflection (for testing purposes)
      const extractCityFromVenueName = (ticketmasterService as any).extractCityFromVenueName.bind(ticketmasterService);
      const result = extractCityFromVenueName('O2 Arena');
      
      expect(result).toBe('Prague');
    });

    it('should handle venue name variations correctly', () => {
      const extractCityFromVenueName = (ticketmasterService as any).extractCityFromVenueName.bind(ticketmasterService);
      
      const testCases = [
        { venue: 'O2 Arena', expected: 'Prague' },
        { venue: 'Forum Karlín', expected: 'Prague' },
        { venue: 'Rudolfinum', expected: 'Prague' },
        { venue: 'Brno Exhibition Centre', expected: 'Brno' },
        { venue: 'Ostrava Arena', expected: 'Ostrava' },
        { venue: 'ČEZ Arena', expected: 'Ostrava' },
        { venue: 'O2 Arena London', expected: 'London' },
        { venue: 'Excel London', expected: 'London' },
        { venue: 'Messe Berlin', expected: 'Berlin' },
        { venue: 'RAI Amsterdam', expected: 'Amsterdam' }
      ];

      testCases.forEach(({ venue, expected }) => {
        const result = extractCityFromVenueName(venue);
        expect(result).toBe(expected);
      });
    });
  });

  describe('PredictHQ Service Integration', () => {
    it('should correctly extract city from venue name in PredictHQ events', () => {
      // Mock PredictHQ event data
      const mockEvent = {
        id: 'phq-test-1',
        title: 'Test Event at O2 Arena',
        description: 'A test event',
        start: '2024-06-15T19:00:00Z',
        end: '2024-06-15T22:00:00Z',
        location: {
          name: 'O2 Arena',
          city: 'Czech Republic', // Incorrectly set as country
          address: 'O2 Arena, Prague, Czech Republic'
        },
        place: {
          name: 'O2 Arena',
          city: 'Czech Republic'
        },
        country: 'CZ',
        category: 'concerts',
        subcategory: 'rock',
        phq_attendance: 15000,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      };

      // Test the private method through reflection
      const transformEvent = (predicthqService as any).transformEvent.bind(predicthqService);
      const result = transformEvent(mockEvent, 'Prague', 'Music');
      
      expect(result.city).toBe('Prague');
      expect(result.venue).toBe('O2 Arena');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle the specific O2 Arena scenario mentioned in the issue', () => {
      // Scenario: City is set as "Czech Republic" but venue is "O2 Arena"
      // The system should correctly identify this as Prague
      
      const venueName = 'O2 Arena';
      const incorrectCity = 'Czech Republic';
      
      // Test venue-city mapping directly
      const correctCity = venueCityMappingService.getCityForVenue(venueName);
      expect(correctCity).toBe('Prague');
      expect(correctCity).not.toBe(incorrectCity);
      
      // Test that the venue is correctly identified as being in Prague
      const isInPrague = venueCityMappingService.isVenueInCity(venueName, 'Prague');
      expect(isInPrague).toBe(true);
      
      // Test that the venue is not in the incorrect city
      const isInCzechRepublic = venueCityMappingService.isVenueInCity(venueName, 'Czech Republic');
      expect(isInCzechRepublic).toBe(false);
    });

    it('should handle multiple Czech venues correctly', () => {
      const czechVenues = [
        { venue: 'O2 Arena', city: 'Prague' },
        { venue: 'Forum Karlín', city: 'Prague' },
        { venue: 'Rudolfinum', city: 'Prague' },
        { venue: 'National Theatre', city: 'Prague' },
        { venue: 'Brno Exhibition Centre', city: 'Brno' },
        { venue: 'Ostrava Arena', city: 'Ostrava' },
        { venue: 'ČEZ Arena', city: 'Ostrava' }
      ];

      czechVenues.forEach(({ venue, city }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(city);
        
        // Verify the venue is correctly identified as being in the right city
        const isInCorrectCity = venueCityMappingService.isVenueInCity(venue, city);
        expect(isInCorrectCity).toBe(true);
      });
    });

    it('should handle international venues correctly', () => {
      const internationalVenues = [
        { venue: 'O2 Arena London', city: 'London', country: 'United Kingdom' },
        { venue: 'Excel London', city: 'London', country: 'United Kingdom' },
        { venue: 'Messe Berlin', city: 'Berlin', country: 'Germany' },
        { venue: 'RAI Amsterdam', city: 'Amsterdam', country: 'Netherlands' },
        { venue: 'Porte de Versailles', city: 'Paris', country: 'France' }
      ];

      internationalVenues.forEach(({ venue, city, country }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(city);
        
        // Verify the venue is correctly identified as being in the right city
        const isInCorrectCity = venueCityMappingService.isVenueInCity(venue, city);
        expect(isInCorrectCity).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle venues with special characters', () => {
      const specialCharVenues = [
        { venue: 'Forum Karlín', expected: 'Prague' },
        { venue: 'ČEZ Arena', expected: 'Ostrava' },
        { venue: 'Porte de Versailles', expected: 'Paris' }
      ];

      specialCharVenues.forEach(({ venue, expected }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(expected);
      });
    });

    it('should handle case variations', () => {
      const caseVariations = [
        'O2 ARENA',
        'o2 arena',
        'O2 Arena',
        'O2 ARENA PRAGUE',
        'o2 arena prague',
        'O2 Arena Prague'
      ];

      caseVariations.forEach(venue => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe('Prague');
      });
    });

    it('should handle partial venue names', () => {
      const partialNames = [
        'O2 Arena - Main Hall',
        'O2 Arena Prague - VIP Section',
        'Forum Karlín - Conference Room A',
        'ČEZ Arena - Ice Rink'
      ];

      const expectedResults = [
        'Prague',
        'Prague', 
        'Prague',
        'Ostrava'
      ];

      partialNames.forEach((venue, index) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(expectedResults[index]);
      });
    });
  });
});
