import { describe, it, expect } from 'vitest';
import { applyDiversityRule, getCategoryDistribution, validateDiversityRule } from '@/lib/recs/diversify';
import { Destination } from '@/data/destinations.seed';

// Mock destinations with specific tags for testing diversity
const mockDestinations: Destination[] = [
  {
    id: 'cultural-1',
    nameTh: 'วัดทดสอบ 1',
    nameEn: 'Test Temple 1',
    descTh: 'วัดสำหรับทดสอบ',
    imageUrl: 'https://example.com/cultural1.jpg',
    tags: ['cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 95
  },
  {
    id: 'cultural-2',
    nameTh: 'วัดทดสอบ 2',
    nameEn: 'Test Temple 2',
    descTh: 'วัดสำหรับทดสอบ',
    imageUrl: 'https://example.com/cultural2.jpg',
    tags: ['cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 90
  },
  {
    id: 'cultural-3',
    nameTh: 'วัดทดสอบ 3',
    nameEn: 'Test Temple 3',
    descTh: 'วัดสำหรับทดสอบ',
    imageUrl: 'https://example.com/cultural3.jpg',
    tags: ['cultural'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 85
  },
  {
    id: 'food-1',
    nameTh: 'ร้านอาหารทดสอบ 1',
    nameEn: 'Test Restaurant 1',
    descTh: 'ร้านอาหารสำหรับทดสอบ',
    imageUrl: 'https://example.com/food1.jpg',
    tags: ['foodie'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 88
  },
  {
    id: 'food-2',
    nameTh: 'ร้านอาหารทดสอบ 2',
    nameEn: 'Test Restaurant 2',
    descTh: 'ร้านอาหารสำหรับทดสอบ',
    imageUrl: 'https://example.com/food2.jpg',
    tags: ['foodie'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 82
  },
  {
    id: 'adventure-1',
    nameTh: 'ผจญภัยทดสอบ 1',
    nameEn: 'Test Adventure 1',
    descTh: 'กิจกรรมผจญภัยสำหรับทดสอบ',
    imageUrl: 'https://example.com/adventure1.jpg',
    tags: ['adventure'],
    budgetBand: 'high',
    timeWindow: 'fullday',
    popularityScore: 80
  },
  {
    id: 'romantic-1',
    nameTh: 'โรแมนติกทดสอบ 1',
    nameEn: 'Test Romantic 1',
    descTh: 'สถานที่โรแมนติกสำหรับทดสอบ',
    imageUrl: 'https://example.com/romantic1.jpg',
    tags: ['romantic'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 78
  },
  {
    id: 'chill-1',
    nameTh: 'ชิลทดสอบ 1',
    nameEn: 'Test Chill 1',
    descTh: 'สถานที่ชิลสำหรับทดสอบ',
    imageUrl: 'https://example.com/chill1.jpg',
    tags: ['chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 75
  }
];

describe('Recommendations Diversity', () => {
  describe('applyDiversityRule', () => {
    it('should prevent more than 2 consecutive items from same category', () => {
      // Input: 3 cultural items in a row (should be diversified)
      const input = [
        mockDestinations[0], // cultural-1 (95)
        mockDestinations[1], // cultural-2 (90)
        mockDestinations[2], // cultural-3 (85)
        mockDestinations[3], // food-1 (88)
        mockDestinations[4]  // food-2 (82)
      ];

      const diversified = applyDiversityRule(input);

      // Should not have 3 consecutive cultural items
      const violations = validateDiversityRule(diversified);
      expect(violations).toHaveLength(0);
    });

    it('should maintain order preference while applying diversity', () => {
      const input = mockDestinations.slice(0, 6); // First 6 items
      const diversified = applyDiversityRule(input);

      // First item should remain the highest ranked
      expect(diversified[0].id).toBe('cultural-1');

      // Should not have violations
      const violations = validateDiversityRule(diversified);
      expect(violations).toHaveLength(0);
    });

    it('should handle small arrays correctly', () => {
      const singleItem = [mockDestinations[0]];
      const twoItems = mockDestinations.slice(0, 2);

      expect(applyDiversityRule(singleItem)).toEqual(singleItem);
      expect(applyDiversityRule(twoItems)).toEqual(twoItems);
    });

    it('should handle empty array', () => {
      expect(applyDiversityRule([])).toEqual([]);
    });

    it('should work with mixed categories', () => {
      // Create input with different categories
      const mixed = [
        mockDestinations[0], // cultural (95)
        mockDestinations[3], // food (88)
        mockDestinations[1], // cultural (90)
        mockDestinations[5], // adventure (80)
        mockDestinations[6], // romantic (78)
        mockDestinations[7]  // chill (75)
      ];

      const diversified = applyDiversityRule(mixed);

      expect(diversified).toHaveLength(6);
      const violations = validateDiversityRule(diversified);
      expect(violations).toHaveLength(0);
    });

    it('should handle all same category gracefully', () => {
      const allCultural = mockDestinations.slice(0, 3); // All cultural
      const diversified = applyDiversityRule(allCultural);

      // Should still return all items (no other choice)
      expect(diversified).toHaveLength(3);

      // But should try to minimize violations where possible
      expect(diversified[0].id).toBe('cultural-1'); // Highest rated first
    });

    it('should respect the 20 item cap', () => {
      // Create a large array with repeated items
      const largeArray = [];
      for (let i = 0; i < 30; i++) {
        largeArray.push(mockDestinations[i % mockDestinations.length]);
      }

      const diversified = applyDiversityRule(largeArray);
      expect(diversified.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getCategoryDistribution', () => {
    it('should count categories correctly', () => {
      const subset = [
        mockDestinations[0], // cultural
        mockDestinations[1], // cultural
        mockDestinations[3], // foodie -> food
        mockDestinations[5], // adventure
        mockDestinations[6]  // romantic
      ];

      const distribution = getCategoryDistribution(subset);

      expect(distribution).toEqual({
        cultural: 2,
        food: 1,
        adventure: 1,
        romantic: 1
      });
    });

    it('should handle empty array', () => {
      const distribution = getCategoryDistribution([]);
      expect(distribution).toEqual({});
    });

    it('should handle destinations with unknown tags', () => {
      const unknownTag: Destination = {
        ...mockDestinations[0],
        id: 'unknown',
        tags: ['unknown-tag']
      };

      const distribution = getCategoryDistribution([unknownTag]);
      expect(distribution).toEqual({
        other: 1
      });
    });

    it('should use first matching tag for category', () => {
      const multiTag: Destination = {
        ...mockDestinations[0],
        id: 'multi',
        tags: ['cultural', 'foodie'] // Should categorize as 'cultural' (first match)
      };

      const distribution = getCategoryDistribution([multiTag]);
      expect(distribution).toEqual({
        cultural: 1
      });
    });
  });

  describe('validateDiversityRule', () => {
    it('should detect violations correctly', () => {
      const violating = [
        mockDestinations[0], // cultural
        mockDestinations[1], // cultural
        mockDestinations[2], // cultural - violation at index 2
        mockDestinations[3], // food
        mockDestinations[4]  // food
      ];

      const violations = validateDiversityRule(violating);
      expect(violations).toEqual([2]);
    });

    it('should detect multiple violations', () => {
      const multipleViolations = [
        mockDestinations[0], // cultural
        mockDestinations[1], // cultural
        mockDestinations[2], // cultural - violation at index 2
        mockDestinations[3], // food
        mockDestinations[4], // food
        mockDestinations[0], // cultural
        mockDestinations[1], // cultural
        mockDestinations[2]  // cultural - violation at index 7
      ];

      const violations = validateDiversityRule(multipleViolations);
      expect(violations).toContain(2);
      expect(violations).toContain(7);
    });

    it('should return empty array for valid sequences', () => {
      const valid = [
        mockDestinations[0], // cultural
        mockDestinations[3], // food
        mockDestinations[1], // cultural
        mockDestinations[5], // adventure
        mockDestinations[2]  // cultural
      ];

      const violations = validateDiversityRule(valid);
      expect(violations).toEqual([]);
    });

    it('should handle short arrays', () => {
      expect(validateDiversityRule([])).toEqual([]);
      expect(validateDiversityRule([mockDestinations[0]])).toEqual([]);
      expect(validateDiversityRule(mockDestinations.slice(0, 2))).toEqual([]);
    });
  });

  describe('integration tests', () => {
    it('should improve diversity from problematic input', () => {
      // Create worst case: all same category in order
      const worstCase = mockDestinations.slice(0, 3); // All cultural

      const improved = applyDiversityRule(worstCase);
      const originalViolations = validateDiversityRule(worstCase);
      const improvedViolations = validateDiversityRule(improved);

      // Should have same number of items
      expect(improved).toHaveLength(worstCase.length);

      // Should have fewer or equal violations (can't eliminate all if only one category)
      expect(improvedViolations.length).toBeLessThanOrEqual(originalViolations.length);
    });

    it('should maintain quality while improving diversity', () => {
      const input = mockDestinations.slice(); // All destinations
      const diversified = applyDiversityRule(input);

      // First item should still be highest rated
      expect(diversified[0].popularityScore).toBe(95);

      // Should have no violations
      const violations = validateDiversityRule(diversified);
      expect(violations).toHaveLength(0);

      // Should include variety of categories
      const distribution = getCategoryDistribution(diversified);
      const categoryCount = Object.keys(distribution).length;
      expect(categoryCount).toBeGreaterThan(1);
    });

    it('should work with realistic recommendation counts', () => {
      // Test with typical recommendation sizes
      const testSizes = [6, 8, 10, 12];

      for (const size of testSizes) {
        const input = mockDestinations.slice(0, size);
        const diversified = applyDiversityRule(input);

        expect(diversified.length).toBeLessThanOrEqual(size);

        const violations = validateDiversityRule(diversified);
        expect(violations).toHaveLength(0);
      }
    });
  });
});