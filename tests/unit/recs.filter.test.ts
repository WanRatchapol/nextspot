import { describe, it, expect } from 'vitest';
import { filterDestinations, sortByPopularity, getFilterMetrics, PreferencesFilter } from '@/lib/recs/filter';
import { Destination } from '@/data/destinations.seed';

// Mock destinations for testing
const mockDestinations: Destination[] = [
  {
    id: 'test-1',
    nameTh: 'ทดสอบ 1',
    nameEn: 'Test 1',
    descTh: 'คำอธิบายทดสอบ 1',
    imageUrl: 'https://example.com/test1.jpg',
    tags: ['cultural', 'chill'],
    budgetBand: 'low',
    timeWindow: 'halfday',
    popularityScore: 85
  },
  {
    id: 'test-2',
    nameTh: 'ทดสอบ 2',
    nameEn: 'Test 2',
    descTh: 'คำอธิบายทดสอบ 2',
    imageUrl: 'https://example.com/test2.jpg',
    tags: ['foodie', 'social'],
    budgetBand: 'mid',
    timeWindow: 'evening',
    popularityScore: 92
  },
  {
    id: 'test-3',
    nameTh: 'ทดสอบ 3',
    nameEn: 'Test 3',
    descTh: 'คำอธิบายทดสอบ 3',
    imageUrl: 'https://example.com/test3.jpg',
    tags: ['adventure', 'cultural'],
    budgetBand: 'high',
    timeWindow: 'fullday',
    popularityScore: 78
  },
  {
    id: 'test-4',
    nameTh: 'ทดสอบ 4',
    nameEn: 'Test 4',
    descTh: 'คำอธิบายทดสอบ 4',
    imageUrl: 'https://example.com/test4.jpg',
    tags: ['romantic', 'chill'],
    budgetBand: 'low',
    timeWindow: 'evening',
    popularityScore: 88
  },
  {
    id: 'test-5',
    nameTh: 'ทดสอบ 5',
    nameEn: 'Test 5',
    descTh: 'คำอธิบายทดสอบ 5',
    imageUrl: 'https://example.com/test5.jpg',
    tags: ['foodie', 'adventure'],
    budgetBand: 'mid',
    timeWindow: 'halfday',
    popularityScore: 95
  },
  {
    id: 'test-6',
    nameTh: 'ทดสอบ 6',
    nameEn: 'Test 6',
    descTh: 'คำอธิบายทดสอบ 6',
    imageUrl: 'https://example.com/test6.jpg',
    tags: ['social', 'romantic'],
    budgetBand: 'high',
    timeWindow: 'evening',
    popularityScore: 90
  }
];

describe('Recommendations Filter', () => {
  describe('filterDestinations', () => {
    it('should filter by budget band correctly', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'low',
        moodTags: ['cultural', 'chill', 'romantic'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);

      // Should only return destinations with 'low' budget
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.budgetBand === 'low')).toBe(true);
      expect(filtered.map(d => d.id)).toEqual(['test-1', 'test-4']);
    });

    it('should filter by mood tags correctly', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'mid',
        moodTags: ['foodie'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);

      // Should return destinations with 'foodie' tag, 'mid' budget, and compatible time windows
      // halfday preference matches both halfday and evening time windows
      expect(filtered).toHaveLength(2); // test-2 (evening) and test-5 (halfday)
      expect(filtered.some(d => d.id === 'test-2')).toBe(true); // evening compatible with halfday
      expect(filtered.some(d => d.id === 'test-5')).toBe(true); // exact match
      expect(filtered.every(d => d.tags.includes('foodie'))).toBe(true);
    });

    it('should handle multiple mood tags with OR logic', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'high',
        moodTags: ['adventure', 'romantic'],
        timeWindow: 'fullday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);

      // Should return destinations that have either 'adventure' OR 'romantic' tags
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('test-3');
    });

    it('should filter by time window with compatibility mapping', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'mid',
        moodTags: ['foodie', 'social'],
        timeWindow: 'evening'
      };

      const filtered = filterDestinations(mockDestinations, preferences);

      // Evening preference should include both evening and halfday destinations
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.id).sort()).toEqual(['test-2', 'test-5']);
    });

    it('should return empty array when no matches found', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'low',
        moodTags: ['nonexistent'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);
      expect(filtered).toHaveLength(0);
    });

    it('should handle fullday time window correctly', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'high',
        moodTags: ['adventure'],
        timeWindow: 'fullday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);

      // Fullday should include fullday and halfday destinations
      expect(filtered).toHaveLength(1);
      expect(filtered[0].timeWindow).toBe('fullday');
    });
  });

  describe('sortByPopularity', () => {
    it('should sort destinations by popularity score in descending order', () => {
      const subset = mockDestinations.slice(0, 3); // Use first 3 items
      const sorted = sortByPopularity(subset);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].popularityScore).toBe(92); // test-2
      expect(sorted[1].popularityScore).toBe(85); // test-1
      expect(sorted[2].popularityScore).toBe(78); // test-3
      expect(sorted.map(d => d.id)).toEqual(['test-2', 'test-1', 'test-3']);
    });

    it('should not mutate the original array', () => {
      const original = [...mockDestinations];
      const sorted = sortByPopularity(mockDestinations);

      expect(mockDestinations).toEqual(original);
      expect(sorted).not.toBe(mockDestinations);
    });

    it('should handle empty array', () => {
      const sorted = sortByPopularity([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single item', () => {
      const single = [mockDestinations[0]];
      const sorted = sortByPopularity(single);
      expect(sorted).toEqual(single);
    });
  });

  describe('getFilterMetrics', () => {
    it('should return correct filter metrics', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'mid',
        moodTags: ['foodie', 'social'],
        timeWindow: 'evening'
      };

      const filtered = filterDestinations(mockDestinations, preferences);
      const metrics = getFilterMetrics(mockDestinations, filtered, preferences);

      expect(metrics.total).toBe(6);
      expect(metrics.filtered).toBe(2);
      expect(metrics.budgetMatches).toBe(2); // test-2, test-5
      expect(metrics.moodMatches).toBe(3); // test-2 (foodie+social), test-5 (foodie), test-6 (social)
      expect(metrics.preferences).toEqual(preferences);
    });

    it('should count time window matches correctly', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'low',
        moodTags: ['cultural'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);
      const metrics = getFilterMetrics(mockDestinations, filtered, preferences);

      // Halfday should match halfday and evening destinations
      const expectedTimeMatches = mockDestinations.filter(d =>
        d.timeWindow === 'halfday' || d.timeWindow === 'evening'
      ).length;

      expect(metrics.timeMatches).toBe(expectedTimeMatches);
    });

    it('should handle zero matches correctly', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'low',
        moodTags: ['nonexistent'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);
      const metrics = getFilterMetrics(mockDestinations, filtered, preferences);

      expect(metrics.filtered).toBe(0);
      expect(metrics.moodMatches).toBe(0);
      expect(metrics.budgetMatches).toBe(2); // Still 2 low budget items exist
    });
  });

  describe('integration tests', () => {
    it('should work with full filter -> sort pipeline', () => {
      const preferences: PreferencesFilter = {
        budgetBand: 'low',
        moodTags: ['cultural', 'romantic'],
        timeWindow: 'halfday'
      };

      const filtered = filterDestinations(mockDestinations, preferences);
      const sorted = sortByPopularity(filtered);

      expect(sorted).toHaveLength(2);
      // Should be sorted by popularity: test-4 (88) then test-1 (85)
      expect(sorted[0].id).toBe('test-4');
      expect(sorted[1].id).toBe('test-1');
    });

    it('should handle edge case with all filters matching everything', () => {
      // Create preferences that should match all destinations
      const allBudgets = ['low', 'mid', 'high'];
      const allTags = ['cultural', 'foodie', 'social', 'adventure', 'romantic', 'chill'];

      for (const budget of allBudgets) {
        const preferences: PreferencesFilter = {
          budgetBand: budget as any,
          moodTags: allTags,
          timeWindow: 'fullday' // Most permissive - includes fullday and halfday
        };

        const filtered = filterDestinations(mockDestinations, preferences);

        // Count destinations that match budget and have compatible time windows
        const budgetMatches = mockDestinations.filter(d => {
          const matchesBudget = d.budgetBand === budget;
          const compatibleTimeWindows = ['fullday', 'halfday']; // fullday includes halfday
          const matchesTime = compatibleTimeWindows.includes(d.timeWindow);
          return matchesBudget && matchesTime;
        });

        expect(filtered.length).toBe(budgetMatches.length);
      }
    });
  });
});