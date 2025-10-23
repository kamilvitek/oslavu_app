// Tests for subcategory extraction service
import { subcategoryExtractionService } from '../subcategory-extraction';

describe('SubcategoryExtractionService', () => {
  beforeEach(() => {
    // Clear cache before each test
    subcategoryExtractionService.clearCache();
  });

  describe('Rule-based extraction', () => {
    it('should extract Rock subcategory for rock music events', async () => {
      const result = await subcategoryExtractionService.extractSubcategory(
        'Rock Concert 2024',
        'Amazing rock concert with heavy metal bands',
        'Entertainment'
      );

      expect(result.subcategory).toBe('Rock');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('rule_based');
      expect(result.genreTags).toContain('rock');
    });

    it('should extract AI/ML subcategory for AI events', async () => {
      const result = await subcategoryExtractionService.extractSubcategory(
        'AI Conference 2024',
        'Machine learning and artificial intelligence conference',
        'Technology'
      );

      expect(result.subcategory).toBe('AI/ML');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('rule_based');
    });

    it('should extract Marketing subcategory for marketing events', async () => {
      const result = await subcategoryExtractionService.extractSubcategory(
        'Digital Marketing Summit',
        'Learn about social media marketing and SEO',
        'Business'
      );

      expect(result.subcategory).toBe('Marketing');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.method).toBe('rule_based');
    });

    it('should handle events with no clear subcategory', async () => {
      const result = await subcategoryExtractionService.extractSubcategory(
        'General Event',
        'A general event with no specific theme',
        'Entertainment'
      );

      expect(result.subcategory).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('Batch extraction', () => {
    it('should process multiple events efficiently', async () => {
      const events = [
        { title: 'Rock Concert', description: 'Heavy metal rock concert', category: 'Entertainment' },
        { title: 'AI Workshop', description: 'Machine learning workshop', category: 'Technology' },
        { title: 'Marketing Seminar', description: 'Digital marketing seminar', category: 'Business' }
      ];

      const results = await subcategoryExtractionService.batchExtractSubcategories(events);

      expect(results).toHaveLength(3);
      expect(results[0].subcategory).toBe('Rock');
      expect(results[1].subcategory).toBe('AI/ML');
      expect(results[2].subcategory).toBe('Marketing');
    });
  });

  describe('Caching', () => {
    it('should cache results and return cached version', async () => {
      const event = {
        title: 'Test Event',
        description: 'Test description',
        category: 'Entertainment'
      };

      // First call
      const result1 = await subcategoryExtractionService.extractSubcategory(
        event.title,
        event.description,
        event.category
      );

      // Second call should return cached result
      const result2 = await subcategoryExtractionService.extractSubcategory(
        event.title,
        event.description,
        event.category
      );

      expect(result1).toEqual(result2);
    });
  });

  describe('Statistics', () => {
    it('should track extraction statistics', async () => {
      await subcategoryExtractionService.extractSubcategory(
        'Rock Concert',
        'Heavy metal concert',
        'Entertainment'
      );

      const stats = subcategoryExtractionService.getExtractionStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.methodsUsed).toBeDefined();
    });
  });
});
