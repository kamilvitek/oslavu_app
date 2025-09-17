// src/lib/services/__tests__/venue-city-mapping.test.ts
import { venueCityMappingService } from '../venue-city-mapping';

describe('VenueCityMappingService', () => {
  describe('getCityForVenue', () => {
    it('should map O2 Arena to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('O2 Arena');
      expect(result).toBe('Prague');
    });

    it('should map O2 Arena Prague to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('O2 Arena Prague');
      expect(result).toBe('Prague');
    });

    it('should map Prague O2 Arena to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('Prague O2 Arena');
      expect(result).toBe('Prague');
    });

    it('should map Forum Karlín to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('Forum Karlín');
      expect(result).toBe('Prague');
    });

    it('should map Rudolfinum to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('Rudolfinum');
      expect(result).toBe('Prague');
    });

    it('should map National Theatre to Prague', () => {
      const result = venueCityMappingService.getCityForVenue('National Theatre');
      expect(result).toBe('Prague');
    });

    it('should map Brno Exhibition Centre to Brno', () => {
      const result = venueCityMappingService.getCityForVenue('Brno Exhibition Centre');
      expect(result).toBe('Brno');
    });

    it('should map Ostrava Arena to Ostrava', () => {
      const result = venueCityMappingService.getCityForVenue('Ostrava Arena');
      expect(result).toBe('Ostrava');
    });

    it('should map ČEZ Arena to Ostrava', () => {
      const result = venueCityMappingService.getCityForVenue('ČEZ Arena');
      expect(result).toBe('Ostrava');
    });

    it('should map O2 Arena London to London', () => {
      const result = venueCityMappingService.getCityForVenue('O2 Arena London');
      expect(result).toBe('London');
    });

    it('should map Excel London to London', () => {
      const result = venueCityMappingService.getCityForVenue('Excel London');
      expect(result).toBe('London');
    });

    it('should map Messe Berlin to Berlin', () => {
      const result = venueCityMappingService.getCityForVenue('Messe Berlin');
      expect(result).toBe('Berlin');
    });

    it('should map RAI Amsterdam to Amsterdam', () => {
      const result = venueCityMappingService.getCityForVenue('RAI Amsterdam');
      expect(result).toBe('Amsterdam');
    });

    it('should handle case insensitive matching', () => {
      const result = venueCityMappingService.getCityForVenue('o2 arena');
      expect(result).toBe('Prague');
    });

    it('should handle partial matches', () => {
      const result = venueCityMappingService.getCityForVenue('O2 Arena Prague - Main Hall');
      expect(result).toBe('Prague');
    });

    it('should return null for unknown venues', () => {
      const result = venueCityMappingService.getCityForVenue('Unknown Venue Name');
      expect(result).toBeNull();
    });

    it('should return null for empty venue name', () => {
      const result = venueCityMappingService.getCityForVenue('');
      expect(result).toBeNull();
    });

    it('should return null for null venue name', () => {
      const result = venueCityMappingService.getCityForVenue(null as any);
      expect(result).toBeNull();
    });
  });

  describe('isVenueInCity', () => {
    it('should return true for O2 Arena in Prague', () => {
      const result = venueCityMappingService.isVenueInCity('O2 Arena', 'Prague');
      expect(result).toBe(true);
    });

    it('should return true for O2 Arena in prague (case insensitive)', () => {
      const result = venueCityMappingService.isVenueInCity('O2 Arena', 'prague');
      expect(result).toBe(true);
    });

    it('should return false for O2 Arena in London', () => {
      const result = venueCityMappingService.isVenueInCity('O2 Arena', 'London');
      expect(result).toBe(false);
    });

    it('should return false for unknown venue', () => {
      const result = venueCityMappingService.isVenueInCity('Unknown Venue', 'Prague');
      expect(result).toBe(false);
    });
  });

  describe('getVenuesForCity', () => {
    it('should return all Prague venues', () => {
      const result = venueCityMappingService.getVenuesForCity('Prague');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(venue => venue.city === 'Prague')).toBe(true);
    });

    it('should return all Brno venues', () => {
      const result = venueCityMappingService.getVenuesForCity('Brno');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(venue => venue.city === 'Brno')).toBe(true);
    });

    it('should return empty array for unknown city', () => {
      const result = venueCityMappingService.getVenuesForCity('Unknown City');
      expect(result).toEqual([]);
    });
  });

  describe('addVenueMapping', () => {
    it('should add a new venue mapping', () => {
      venueCityMappingService.addVenueMapping('Test Venue', 'Test City', 'Test Country', 'high');
      
      const result = venueCityMappingService.getCityForVenue('Test Venue');
      expect(result).toBe('Test City');
    });

    it('should handle case insensitive venue names', () => {
      venueCityMappingService.addVenueMapping('Test Venue', 'Test City', 'Test Country', 'high');
      
      const result = venueCityMappingService.getCityForVenue('test venue');
      expect(result).toBe('Test City');
    });
  });

  describe('getStats', () => {
    it('should return venue statistics', () => {
      const stats = venueCityMappingService.getStats();
      
      expect(stats.totalVenues).toBeGreaterThan(0);
      expect(stats.byCity).toBeDefined();
      expect(stats.byCountry).toBeDefined();
      expect(stats.byCity['Prague']).toBeGreaterThan(0);
      expect(stats.byCountry['Czech Republic']).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Czech Republic city correction scenario', () => {
      // Scenario: Event has city set as "Czech Republic" but venue is "O2 Arena"
      // The venue-city mapping should correctly identify this as Prague
      const venueName = 'O2 Arena';
      const incorrectCity = 'Czech Republic';
      
      const correctCity = venueCityMappingService.getCityForVenue(venueName);
      expect(correctCity).toBe('Prague');
      expect(correctCity).not.toBe(incorrectCity);
    });

    it('should handle multiple venue variations', () => {
      const variations = [
        'O2 Arena',
        'O2 Arena Prague',
        'Prague O2 Arena',
        'o2 arena',
        'O2 ARENA'
      ];

      variations.forEach(variation => {
        const result = venueCityMappingService.getCityForVenue(variation);
        expect(result).toBe('Prague');
      });
    });

    it('should handle international venues correctly', () => {
      const internationalVenues = [
        { venue: 'O2 Arena London', expectedCity: 'London' },
        { venue: 'Excel London', expectedCity: 'London' },
        { venue: 'Messe Berlin', expectedCity: 'Berlin' },
        { venue: 'RAI Amsterdam', expectedCity: 'Amsterdam' },
        { venue: 'Porte de Versailles', expectedCity: 'Paris' }
      ];

      internationalVenues.forEach(({ venue, expectedCity }) => {
        const result = venueCityMappingService.getCityForVenue(venue);
        expect(result).toBe(expectedCity);
      });
    });
  });
});
