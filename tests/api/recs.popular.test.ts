import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET } from '@/app/api/recommendations/popular/route';
import { NextRequest } from 'next/server';

// Mock the destinations data
vi.mock('@/data/destinations.seed', () => ({
  destinations: [
    {
      id: 'test-1',
      nameTh: 'ทดสอบ 1',
      nameEn: 'Test 1',
      descTh: 'คำอธิบายทดสอบ 1',
      imageUrl: 'https://example.com/1.jpg',
      tags: ['foodie', 'cultural'],
      popularityScore: 95
    },
    {
      id: 'test-2',
      nameTh: 'ทดสอบ 2',
      nameEn: 'Test 2',
      descTh: 'คำอธิบายทดสอบ 2',
      imageUrl: 'https://example.com/2.jpg',
      tags: ['romantic', 'social'],
      popularityScore: 88
    },
    {
      id: 'test-3',
      nameTh: 'ทดสอบ 3',
      nameEn: 'Test 3',
      descTh: 'คำอธิบายทดสอบ 3',
      imageUrl: 'https://example.com/3.jpg',
      tags: ['foodie', 'adventure'],
      popularityScore: 92
    },
    {
      id: 'test-4',
      nameTh: 'ทดสอบ 4',
      nameEn: 'Test 4',
      descTh: 'คำอธิบายทดสอบ 4',
      imageUrl: 'https://example.com/4.jpg',
      tags: ['chill', 'romantic'],
      popularityScore: 85
    },
    {
      id: 'test-5',
      nameTh: 'ทดสอบ 5',
      nameEn: 'Test 5',
      descTh: 'คำอธิบายทดสอบ 5',
      imageUrl: 'https://example.com/5.jpg',
      tags: ['adventure', 'social'],
      popularityScore: 90
    }
  ]
}));

describe('/api/recommendations/popular', () => {
  describe('GET', () => {
    it('should return 10 items by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(5); // Our mock has 5 items
      expect(data.request_id).toBeDefined();
      expect(typeof data.request_id).toBe('string');
    });

    it('should respect limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?limit=3');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(3);
      expect(data.request_id).toBeDefined();
    });

    it('should cap limit at 12', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(5); // Our mock has 5 items, so max is 5
      expect(data.request_id).toBeDefined();
    });

    it('should return 400 for invalid limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?limit=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('limit parameter must be a non-negative number');
      expect(data.request_id).toBeDefined();
    });

    it('should return 400 for negative limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?limit=-5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('limit parameter must be a non-negative number');
      expect(data.request_id).toBeDefined();
    });

    it('should filter by tags correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?tags=foodie');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2); // test-1 and test-3 have 'foodie' tag
      expect(data.items.every((item: any) => item.tags.includes('foodie'))).toBe(true);
      expect(data.request_id).toBeDefined();
    });

    it('should handle multiple tags filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?tags=romantic,social');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return items that have at least one of the tags (intersection)
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items.every((item: any) =>
        item.tags.includes('romantic') || item.tags.includes('social')
      )).toBe(true);
      expect(data.request_id).toBeDefined();
    });

    it('should return items sorted by popularityScore descending', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(5);

      // Check that items are sorted by popularity (test-1: 95, test-3: 92, test-5: 90, test-2: 88, test-4: 85)
      expect(data.items[0].id).toBe('test-1'); // highest score (95)
      expect(data.items[1].id).toBe('test-3'); // second highest (92)
      expect(data.items[2].id).toBe('test-5'); // third highest (90)
      expect(data.items[3].id).toBe('test-2'); // fourth highest (88)
      expect(data.items[4].id).toBe('test-4'); // lowest (85)
    });

    it('should include all required fields in response items', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(5);

      data.items.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('nameTh');
        expect(item).toHaveProperty('nameEn');
        expect(item).toHaveProperty('descTh');
        expect(item).toHaveProperty('imageUrl');
        expect(item).toHaveProperty('tags');
        expect(Array.isArray(item.tags)).toBe(true);
      });
    });

    it('should set correct cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=60');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle empty tags filter gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?tags=');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(5); // Should return all items since no tags specified
      expect(data.request_id).toBeDefined();
    });

    it('should handle tags with spaces correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?tags=foodie, cultural');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.request_id).toBeDefined();
    });

    it('should return empty array for non-matching tags', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations/popular?tags=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
      expect(data.request_id).toBeDefined();
    });
  });
});