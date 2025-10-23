// Tests for audience overlap calculation
import { audienceOverlapService } from '../audience-overlap';
import { calculateSubcategoryOverlap } from '../../constants/subcategory-taxonomy';

describe('AudienceOverlapService', () => {
  const mockEvent1 = {
    id: '1',
    title: 'Rock Concert',
    date: '2024-03-15',
    city: 'Prague',
    category: 'Entertainment',
    subcategory: 'Rock',
    source: 'manual' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockEvent2 = {
    id: '2',
    title: 'Metal Concert',
    date: '2024-03-15',
    city: 'Prague',
    category: 'Entertainment',
    subcategory: 'Metal',
    source: 'manual' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockEvent3 = {
    id: '3',
    title: 'Jazz Concert',
    date: '2024-03-15',
    city: 'Prague',
    category: 'Entertainment',
    subcategory: 'Jazz',
    source: 'manual' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockEvent4 = {
    id: '4',
    title: 'AI Conference',
    date: '2024-03-15',
    city: 'Prague',
    category: 'Technology',
    subcategory: 'AI/ML',
    source: 'manual' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  describe('Subcategory overlap calculation', () => {
    it('should calculate high overlap for same subcategory', () => {
      const overlap = calculateSubcategoryOverlap(
        'Entertainment', 'Rock',
        'Entertainment', 'Rock'
      );
      expect(overlap).toBe(0.92);
    });

    it('should calculate moderate overlap for related subcategories', () => {
      const overlap = calculateSubcategoryOverlap(
        'Entertainment', 'Rock',
        'Entertainment', 'Metal'
      );
      expect(overlap).toBeGreaterThan(0.6);
      expect(overlap).toBeLessThan(0.8);
    });

    it('should calculate low overlap for different subcategories in same category', () => {
      const overlap = calculateSubcategoryOverlap(
        'Entertainment', 'Rock',
        'Entertainment', 'Jazz'
      );
      expect(overlap).toBeGreaterThan(0.1);
      expect(overlap).toBeLessThan(0.5);
    });

    it('should calculate very low overlap for different categories', () => {
      const overlap = calculateSubcategoryOverlap(
        'Entertainment', 'Rock',
        'Technology', 'AI/ML'
      );
      expect(overlap).toBe(0.1);
    });
  });

  describe('Audience overlap prediction', () => {
    it('should predict high overlap for same subcategory events', async () => {
      const result = await audienceOverlapService.predictAudienceOverlap(
        mockEvent1,
        { ...mockEvent1, id: '1b', title: 'Another Rock Concert' }
      );

      expect(result.overlapScore).toBeGreaterThan(0.7);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning).toContain('Both events are Rock');
    });

    it('should predict moderate overlap for related subcategories', async () => {
      const result = await audienceOverlapService.predictAudienceOverlap(
        mockEvent1,
        mockEvent2
      );

      expect(result.overlapScore).toBeGreaterThan(0.4);
      expect(result.overlapScore).toBeLessThan(0.8);
      expect(result.reasoning).toContain('Rock and Metal');
    });

    it('should predict low overlap for different subcategories', async () => {
      const result = await audienceOverlapService.predictAudienceOverlap(
        mockEvent1,
        mockEvent3
      );

      expect(result.overlapScore).toBeGreaterThan(0.1);
      expect(result.overlapScore).toBeLessThan(0.5);
      expect(result.reasoning).toContain('Rock and Jazz');
    });

    it('should predict very low overlap for different categories', async () => {
      const result = await audienceOverlapService.predictAudienceOverlap(
        mockEvent1,
        mockEvent4
      );

      expect(result.overlapScore).toBeLessThan(0.3);
      expect(result.reasoning).toContain('very different target audiences');
    });
  });

  describe('Reasoning generation', () => {
    it('should generate subcategory-aware reasoning', async () => {
      const result = await audienceOverlapService.predictAudienceOverlap(
        mockEvent1,
        mockEvent2
      );

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some(r => r.includes('Rock') || r.includes('Metal'))).toBe(true);
    });
  });

  describe('Confidence calculation', () => {
    it('should have higher confidence with subcategory information', async () => {
      const eventWithSubcategory = { ...mockEvent1, subcategory: 'Rock' };
      const eventWithoutSubcategory = { ...mockEvent1, subcategory: undefined };

      const resultWith = await audienceOverlapService.predictAudienceOverlap(
        eventWithSubcategory,
        mockEvent2
      );

      const resultWithout = await audienceOverlapService.predictAudienceOverlap(
        eventWithoutSubcategory,
        mockEvent2
      );

      expect(resultWith.confidence).toBeGreaterThan(resultWithout.confidence);
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      const invalidEvent = {
        id: 'invalid',
        title: '',
        date: 'invalid-date',
        city: '',
        category: '',
        source: 'manual' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await audienceOverlapService.predictAudienceOverlap(
        invalidEvent,
        mockEvent1
      );

      expect(result.overlapScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });
  });
});
