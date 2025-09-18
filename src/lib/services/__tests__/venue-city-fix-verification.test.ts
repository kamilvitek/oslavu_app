// src/lib/services/__tests__/venue-city-fix-verification.test.ts
import { ConflictAnalysisService } from '../conflict-analysis';
import { TicketmasterService } from '../ticketmaster';
import { PredictHQService } from '../predicthq';
import { venueCityMappingService } from '../venue-city-mapping';

// Mock the API keys for testing
const mockApiKey = 'test-api-key';

describe('Venue-City Fix Verification', () => {
  let conflictAnalysisService: ConflictAnalysisService;
  let ticketmasterService: TicketmasterService;
  let predicthqService: PredictHQService;

  beforeEach(() => {
    conflictAnalysisService = new ConflictAnalysisService();
    ticketmasterService = new TicketmasterService(mockApiKey);
    predicthqService = new PredictHQService();
  });

  describe('Real-world scenario: O2 Arena event with city set as "Czech Republic"', () => {
    it('should correctly identify O2 Arena as Prague venue', () => {
      // Test the venue-city mapping directly
      const venueCity = venueCityMappingService.getCityForVenue('O2 Arena');
      expect(venueCity).toBe('Prague');
      
      // Test that the venue is correctly identified as being in Prague
      const isInPrague = venueCityMappingService.isVenueInCity('O2 Arena', 'Prague');
      expect(isInPrague).toBe(true);
    });

    it('should handle PredictHQ event with O2 Arena venue and Czech Republic city', () => {
      // Mock PredictHQ event data - this is the real scenario from the issue
      const mockEvent = {
        id: 'phq-test-1',
        title: 'Concert at O2 Arena',
        description: 'A concert event',
        start: '2024-06-15T19:00:00Z',
        end: '2024-06-15T22:00:00Z',
        location: {
          name: 'O2 Arena',
          city: 'Czech Republic', // This is the problem - city set as country
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

      // Test the PredictHQ transformEvent method
      const transformEvent = (predicthqService as any).transformEvent.bind(predicthqService);
      const result = transformEvent(mockEvent, 'Prague', 'Music');
      
      // The event should now be correctly identified as Prague
      expect(result.city).toBe('Prague');
      expect(result.venue).toBe('O2 Arena');
    });

    it('should handle Ticketmaster event with O2 Arena venue and Czech Republic city', () => {
      // Mock Ticketmaster event data
      const mockEvent = {
        id: 'tm-test-1',
        name: 'Concert at O2 Arena',
        description: 'A concert event',
        dates: {
          start: { localDate: '2024-06-15' },
          end: { localDate: '2024-06-15' }
        },
        _embedded: {
          venues: [{
            name: 'O2 Arena',
            city: { name: 'Czech Republic' }, // Problem: city set as country
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

      // Test the Ticketmaster transformEvent method
      const transformEvent = (ticketmasterService as any).transformEvent.bind(ticketmasterService);
      const result = transformEvent(mockEvent, 'Prague');
      
      // The event should now be correctly identified as Prague
      expect(result.city).toBe('Prague');
      expect(result.venue).toBe('O2 Arena');
    });

    it('should pass location filtering in conflict analysis', () => {
      // Test the conflict analysis location filtering
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Concert at O2 Arena',
          city: 'Czech Republic', // Problem: city set as country
          venue: 'O2 Arena',
          category: 'Music',
          date: '2024-06-15',
          source: 'ticketmaster'
        },
        {
          id: 'event-2', 
          title: 'Event at Forum Karlín',
          city: 'Czech Republic', // Problem: city set as country
          venue: 'Forum Karlín',
          category: 'Music',
          date: '2024-06-15',
          source: 'predicthq'
        },
        {
          id: 'event-3',
          title: 'Foreign Event',
          city: 'London', // This should be filtered out
          venue: 'O2 Arena London',
          category: 'Music',
          date: '2024-06-15',
          source: 'ticketmaster'
        }
      ];

      // Test the location filtering method
      const filterEventsByLocation = (conflictAnalysisService as any).filterEventsByLocation.bind(conflictAnalysisService);
      const filteredEvents = filterEventsByLocation(mockEvents, 'Prague');
      
      // Should include the Czech events (O2 Arena and Forum Karlín) but not the London event
      expect(filteredEvents).toHaveLength(2);
      expect(filteredEvents.find(e => e.id === 'event-1')).toBeDefined(); // O2 Arena
      expect(filteredEvents.find(e => e.id === 'event-2')).toBeDefined(); // Forum Karlín
      expect(filteredEvents.find(e => e.id === 'event-3')).toBeUndefined(); // London event should be filtered out
    });
  });

  describe('Edge cases and other venues', () => {
    it('should handle various Czech venues correctly', () => {
      const czechVenues = [
        { venue: 'O2 Arena', expectedCity: 'Prague' },
        { venue: 'Forum Karlín', expectedCity: 'Prague' },
        { venue: 'Rudolfinum', expectedCity: 'Prague' },
        { venue: 'National Theatre', expectedCity: 'Prague' },
        { venue: 'Brno Exhibition Centre', expectedCity: 'Brno' },
        { venue: 'Ostrava Arena', expectedCity: 'Ostrava' },
        { venue: 'ČEZ Arena', expectedCity: 'Ostrava' }
      ];

      czechVenues.forEach(({ venue, expectedCity }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(expectedCity);
        
        // Test that the venue is correctly identified as being in the right city
        const isInCorrectCity = venueCityMappingService.isVenueInCity(venue, expectedCity);
        expect(isInCorrectCity).toBe(true);
      });
    });

    it('should handle international venues correctly', () => {
      const internationalVenues = [
        { venue: 'O2 Arena London', expectedCity: 'London' },
        { venue: 'Excel London', expectedCity: 'London' },
        { venue: 'Messe Berlin', expectedCity: 'Berlin' },
        { venue: 'RAI Amsterdam', expectedCity: 'Amsterdam' }
      ];

      internationalVenues.forEach(({ venue, expectedCity }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(expectedCity);
      });
    });

    it('should filter out foreign events when searching Czech cities', () => {
      const mockEvents = [
        {
          id: 'czech-event',
          title: 'Czech Event',
          city: 'Czech Republic',
          venue: 'O2 Arena',
          category: 'Music',
          date: '2024-06-15',
          source: 'ticketmaster'
        },
        {
          id: 'foreign-event',
          title: 'Foreign Event',
          city: 'London',
          venue: 'O2 Arena London',
          category: 'Music',
          date: '2024-06-15',
          source: 'ticketmaster'
        }
      ];

      const filterEventsByLocation = (conflictAnalysisService as any).filterEventsByLocation.bind(conflictAnalysisService);
      const filteredEvents = filterEventsByLocation(mockEvents, 'Prague');
      
      // Should only include the Czech event
      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].id).toBe('czech-event');
    });
  });

  describe('PredictHQ specific fixes', () => {
    it('should use requested city for Czech events when no city info is available', () => {
      const mockEvent = {
        id: 'phq-test-2',
        title: 'Czech Event Without City Info',
        description: 'A Czech event',
        start: '2024-06-15T19:00:00Z',
        end: '2024-06-15T22:00:00Z',
        location: {
          name: 'Unknown Venue',
          city: undefined, // No city info
          address: 'Some address in Czech Republic'
        },
        place: {
          name: 'Unknown Venue',
          city: undefined
        },
        country: 'CZ',
        category: 'concerts',
        subcategory: 'rock',
        phq_attendance: 1000,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      };

      const transformEvent = (predicthqService as any).transformEvent.bind(predicthqService);
      const result = transformEvent(mockEvent, 'Prague', 'Music');
      
      // Should use the requested city (Prague) for Czech events without city info
      expect(result.city).toBe('Prague');
    });
  });
});
