import { ImageValidator, validateSingleImage, validateMultipleImages, getImageValidationSummary, isImageUrl, getImageFormat, generateImagePreviewUrl, IMAGE_VALIDATION_CONFIG } from '@/utils/image-validation';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock Image constructor for testing
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;

  set src(url: string) {
    setTimeout(() => {
      if (url.includes('invalid')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 10);
  }
} as any;

describe('ImageValidator', () => {
  let validator: ImageValidator;

  beforeEach(() => {
    validator = new ImageValidator();
    mockFetch.mockClear();
  });

  describe('validateImageUrl', () => {
    it('should reject invalid URLs', async () => {
      const result = await validator.validateImageUrl('not-a-url');

      expect(result.isValid).toBe(false);
      expect(result.isAccessible).toBe(false);
      expect(result.errors).toContain('URL ไม่ถูกต้อง');
    });

    it('should handle inaccessible URLs', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 404 }));

      const result = await validator.validateImageUrl('https://example.com/image.jpg');

      expect(result.isValid).toBe(false);
      expect(result.isAccessible).toBe(false);
      expect(result.errors).toContain('ไม่สามารถเข้าถึงรูปภาพได้ (HTTP 404)');
    });

    it('should validate accessible images with proper metadata', async () => {
      const mockResponse = new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '512000' // 500KB
        })
      });
      mockFetch.mockResolvedValue(mockResponse);

      const result = await validator.validateImageUrl('https://example.com/image.jpg');

      expect(result.isValid).toBe(true);
      expect(result.isAccessible).toBe(true);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.sizeBytes).toBe(512000);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file formats', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/bmp'
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/image.bmp');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('รูปแบบไฟล์ไม่รองรับ: image/bmp');
    });

    it('should warn about large file sizes', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': (2 * 1024 * 1024).toString() // 2MB
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/large.jpg');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('ขนาดไฟล์ใหญ่'))).toBe(true);
    });

    it('should reject files that are too large', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': (10 * 1024 * 1024).toString() // 10MB
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/huge.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ขนาดไฟล์ใหญ่เกินไป'))).toBe(true);
    });

    it('should validate image dimensions', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg',
          'content-length': '512000'
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/image.jpg');

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.isValid).toBe(true);
    });

    it('should reject images that are too small', async () => {
      // Mock small image dimensions
      (global.Image as any).prototype.naturalWidth = 200;
      (global.Image as any).prototype.naturalHeight = 150;

      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/small.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ขนาดรูปภาพเล็กเกินไป'))).toBe(true);

      // Reset dimensions
      (global.Image as any).prototype.naturalWidth = 800;
      (global.Image as any).prototype.naturalHeight = 600;
    });

    it('should provide aspect ratio recommendations', async () => {
      // Mock square image (poor aspect ratio)
      (global.Image as any).prototype.naturalWidth = 600;
      (global.Image as any).prototype.naturalHeight = 600;

      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      }));

      const result = await validator.validateImageUrl('https://example.com/square.jpg');

      expect(result.recommendations.some(r => r.includes('อัตราส่วน'))).toBe(true);

      // Reset dimensions
      (global.Image as any).prototype.naturalWidth = 800;
      (global.Image as any).prototype.naturalHeight = 600;
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await validator.validateImageUrl('https://example.com/image.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Network error'))).toBe(true);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((resolve) => {
          // Never resolve to simulate timeout
        })
      );

      const result = await validator.validateImageUrl('https://example.com/timeout.jpg');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateImageUrls (batch)', () => {
    it('should validate multiple URLs in batches', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      }));

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];

      const results = await validator.validateImageUrls(urls);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.isValid)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed results in batch validation', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('', { status: 200, headers: new Headers({ 'content-type': 'image/jpeg' }) }))
        .mockResolvedValueOnce(new Response('', { status: 404 }))
        .mockResolvedValueOnce(new Response('', { status: 200, headers: new Headers({ 'content-type': 'image/png' }) }));

      const urls = [
        'https://example.com/valid.jpg',
        'https://example.com/invalid.jpg',
        'https://example.com/valid.png'
      ];

      const results = await validator.validateImageUrls(urls);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should suggest optimization for large files', () => {
      const result = {
        url: 'https://example.com/large.jpg',
        isValid: true,
        isAccessible: true,
        sizeBytes: 2 * 1024 * 1024, // 2MB
        contentType: 'image/jpeg',
        width: 1200,
        height: 800,
        recommendations: [],
        warnings: [],
        errors: []
      };

      const suggestions = validator.generateOptimizationSuggestions(result);

      expect(suggestions).toContain('ลดขนาดไฟล์โดยการบีบอัดรูปภาพ');
      expect(suggestions).toContain('ปรับขนาดรูปภาพเป็น 800x600 pixels');
    });

    it('should suggest WebP format', () => {
      const result = {
        url: 'https://example.com/image.jpg',
        isValid: true,
        isAccessible: true,
        contentType: 'image/jpeg',
        recommendations: [],
        warnings: [],
        errors: []
      };

      const suggestions = validator.generateOptimizationSuggestions(result);

      expect(suggestions).toContain('พิจารณาใช้ WebP format เพื่อลดขนาดไฟล์');
    });

    it('should suggest CDN usage', () => {
      const result = {
        url: 'https://myserver.com/image.jpg',
        isValid: true,
        isAccessible: true,
        recommendations: [],
        warnings: [],
        errors: []
      };

      const suggestions = validator.generateOptimizationSuggestions(result);

      expect(suggestions).toContain('พิจารณาใช้ CDN หรือ image hosting service เพื่อประสิทธิภาพที่ดีขึ้น');
    });

    it('should indicate good quality images', () => {
      const result = {
        url: 'https://images.unsplash.com/image.webp',
        isValid: true,
        isAccessible: true,
        sizeBytes: 500 * 1024, // 500KB
        contentType: 'image/webp',
        width: 800,
        height: 600,
        recommendations: [],
        warnings: [],
        errors: []
      };

      const suggestions = validator.generateOptimizationSuggestions(result);

      expect(suggestions).toContain('รูปภาพมีคุณภาพเหมาะสมแล้ว');
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('validateSingleImage', () => {
    it('should validate a single image URL', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      }));

      const result = await validateSingleImage('https://example.com/image.jpg');

      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://example.com/image.jpg');
    });
  });

  describe('validateMultipleImages', () => {
    it('should validate multiple image URLs', async () => {
      mockFetch.mockResolvedValue(new Response('', {
        status: 200,
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      }));

      const urls = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];
      const results = await validateMultipleImages(urls);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.isValid)).toBe(true);
    });
  });

  describe('getImageValidationSummary', () => {
    it('should generate validation summary', () => {
      const results = [
        { isValid: true, warnings: [], errors: [], url: '', isAccessible: true, recommendations: [] },
        { isValid: false, warnings: ['warning'], errors: ['error'], url: '', isAccessible: false, recommendations: [] },
        { isValid: true, warnings: ['warning'], errors: [], url: '', isAccessible: true, recommendations: [] }
      ];

      const summary = getImageValidationSummary(results);

      expect(summary.total).toBe(3);
      expect(summary.valid).toBe(2);
      expect(summary.invalid).toBe(1);
      expect(summary.warnings).toBe(2);
      expect(summary.totalErrors).toBe(1);
      expect(summary.totalWarnings).toBe(2);
    });
  });

  describe('isImageUrl', () => {
    it('should detect image URLs', () => {
      expect(isImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isImageUrl('https://example.com/image.jpeg')).toBe(true);
      expect(isImageUrl('https://example.com/image.png')).toBe(true);
      expect(isImageUrl('https://example.com/image.webp')).toBe(true);
      expect(isImageUrl('https://example.com/document.pdf')).toBe(false);
      expect(isImageUrl('not-a-url')).toBe(false);
    });
  });

  describe('getImageFormat', () => {
    it('should return correct format names', () => {
      expect(getImageFormat('image/jpeg')).toBe('JPEG');
      expect(getImageFormat('image/png')).toBe('PNG');
      expect(getImageFormat('image/webp')).toBe('WebP');
      expect(getImageFormat('image/unknown')).toBe('Unknown');
    });
  });

  describe('generateImagePreviewUrl', () => {
    it('should generate Unsplash preview URLs', () => {
      const url = 'https://images.unsplash.com/photo-123456';

      expect(generateImagePreviewUrl(url, 'small')).toContain('w=200&h=150');
      expect(generateImagePreviewUrl(url, 'medium')).toContain('w=400&h=300');
      expect(generateImagePreviewUrl(url, 'large')).toContain('w=800&h=600');
    });

    it('should generate Cloudinary preview URLs', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

      expect(generateImagePreviewUrl(url, 'small')).toContain('w_200,h_150,c_fill');
      expect(generateImagePreviewUrl(url, 'medium')).toContain('w_400,h_300,c_fill');
      expect(generateImagePreviewUrl(url, 'large')).toContain('w_800,h_600,c_fill');
    });

    it('should return original URL for other services', () => {
      const url = 'https://example.com/image.jpg';

      expect(generateImagePreviewUrl(url)).toBe(url);
    });
  });
});

describe('Configuration', () => {
  it('should export configuration constants', () => {
    expect(IMAGE_VALIDATION_CONFIG).toBeDefined();
    expect(IMAGE_VALIDATION_CONFIG.SUPPORTED_FORMATS).toContain('image/jpeg');
    expect(IMAGE_VALIDATION_CONFIG.MAX_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(IMAGE_VALIDATION_CONFIG.MIN_WIDTH).toBe(400);
    expect(IMAGE_VALIDATION_CONFIG.MIN_HEIGHT).toBe(300);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should handle AbortController timeouts', async () => {
    const validator = new ImageValidator();

    mockFetch.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, 50);
      });
    });

    const result = await validator.validateImageUrl('https://example.com/slow.jpg');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle image loading failures', async () => {
    mockFetch.mockResolvedValue(new Response('', {
      status: 200,
      headers: new Headers({
        'content-type': 'image/jpeg'
      })
    }));

    const result = await validator.validateImageUrl('https://example.com/invalid-image.jpg');

    // Should still be valid since HEAD request succeeded
    expect(result.isAccessible).toBe(true);
    // Width/height will be null since image loading failed
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
  });
});