import type { ImageInfo } from '@/types/csv-import';

// Image validation configuration
const IMAGE_CONFIG = {
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  RECOMMENDED_SIZE_BYTES: 1 * 1024 * 1024, // 1MB
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  RECOMMENDED_WIDTH: 800,
  RECOMMENDED_HEIGHT: 600,
  MAX_WIDTH: 2048,
  MAX_HEIGHT: 2048,
  TIMEOUT_MS: 10000, // 10 seconds
} as const;

// Image validation result interface
export interface ImageValidationResult extends ImageInfo {
  recommendations: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Comprehensive image validation utility
 */
export class ImageValidator {
  /**
   * Validate image URL accessibility and metadata
   */
  async validateImageUrl(url: string): Promise<ImageValidationResult> {
    const result: ImageValidationResult = {
      url,
      isValid: false,
      isAccessible: false,
      recommendations: [],
      warnings: [],
      errors: []
    };

    try {
      // Basic URL validation
      if (!this.isValidUrl(url)) {
        result.errors.push('URL ไม่ถูกต้อง');
        return result;
      }

      // Check URL accessibility with timeout
      const response = await this.fetchWithTimeout(url, { method: 'HEAD' }, IMAGE_CONFIG.TIMEOUT_MS);

      if (!response.ok) {
        result.errors.push(`ไม่สามารถเข้าถึงรูปภาพได้ (HTTP ${response.status})`);
        return result;
      }

      result.isAccessible = true;

      // Get content type
      const contentType = response.headers.get('content-type');
      if (contentType) {
        result.contentType = contentType;

        if (!IMAGE_CONFIG.SUPPORTED_FORMATS.includes(contentType as any)) {
          result.errors.push(`รูปแบบไฟล์ไม่รองรับ: ${contentType}`);
          return result;
        }
      } else {
        result.warnings.push('ไม่สามารถตรวจสอบรูปแบบไฟล์ได้');
      }

      // Get file size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        result.sizeBytes = parseInt(contentLength, 10);

        if (result.sizeBytes > IMAGE_CONFIG.MAX_SIZE_BYTES) {
          result.errors.push(`ขนาดไฟล์ใหญ่เกินไป (${this.formatFileSize(result.sizeBytes)})`);
          return result;
        }

        if (result.sizeBytes > IMAGE_CONFIG.RECOMMENDED_SIZE_BYTES) {
          result.warnings.push(`ขนาดไฟล์ใหญ่ (${this.formatFileSize(result.sizeBytes)}) แนะนำให้เล็กกว่า ${this.formatFileSize(IMAGE_CONFIG.RECOMMENDED_SIZE_BYTES)}`);
        }
      }

      // Get image dimensions (requires full download in browser environment)
      const dimensions = await this.getImageDimensions(url);
      if (dimensions) {
        result.width = dimensions.width;
        result.height = dimensions.height;

        // Validate dimensions
        if (dimensions.width < IMAGE_CONFIG.MIN_WIDTH || dimensions.height < IMAGE_CONFIG.MIN_HEIGHT) {
          result.errors.push(`ขนาดรูปภาพเล็กเกินไป (${dimensions.width}x${dimensions.height}) ขั้นต่ำ ${IMAGE_CONFIG.MIN_WIDTH}x${IMAGE_CONFIG.MIN_HEIGHT}`);
          return result;
        }

        if (dimensions.width > IMAGE_CONFIG.MAX_WIDTH || dimensions.height > IMAGE_CONFIG.MAX_HEIGHT) {
          result.warnings.push(`ขนาดรูปภาพใหญ่เกินไป (${dimensions.width}x${dimensions.height}) แนะนำไม่เกิน ${IMAGE_CONFIG.MAX_WIDTH}x${IMAGE_CONFIG.MAX_HEIGHT}`);
        }

        // Recommendations for optimal size
        if (dimensions.width !== IMAGE_CONFIG.RECOMMENDED_WIDTH || dimensions.height !== IMAGE_CONFIG.RECOMMENDED_HEIGHT) {
          result.recommendations.push(`ขนาดที่แนะนำ: ${IMAGE_CONFIG.RECOMMENDED_WIDTH}x${IMAGE_CONFIG.RECOMMENDED_HEIGHT} pixels`);
        }

        // Check aspect ratio
        const aspectRatio = dimensions.width / dimensions.height;
        if (aspectRatio < 1.2 || aspectRatio > 1.8) {
          result.recommendations.push('แนะนำให้ใช้อัตราส่วน 4:3 หรือ 16:9 สำหรับการแสดงผลที่ดีที่สุด');
        }
      }

      // If we got this far, the image is valid
      result.isValid = true;

      // Add general recommendations
      if (result.recommendations.length === 0 && result.warnings.length === 0) {
        result.recommendations.push('รูปภาพผ่านการตรวจสอบทั้งหมด');
      }

      return result;

    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? `เกิดข้อผิดพลาด: ${error.message}`
          : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
      );
      return result;
    }
  }

  /**
   * Batch validate multiple image URLs
   */
  async validateImageUrls(urls: string[]): Promise<ImageValidationResult[]> {
    const batchSize = 5; // Process 5 images at a time to avoid overwhelming the server
    const results: ImageValidationResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.validateImageUrl(url))
      );
      results.push(...batchResults);

      // Small delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Validate if string is a valid URL
   */
  private isValidUrl(string: string): boolean {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Get image dimensions by loading the image
   */
  private async getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        resolve(null);
      };

      // Set timeout
      setTimeout(() => {
        resolve(null);
      }, IMAGE_CONFIG.TIMEOUT_MS);

      img.src = url;
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(result: ImageValidationResult): string[] {
    const suggestions: string[] = [];

    if (!result.isValid || !result.isAccessible) {
      return ['รูปภาพไม่สามารถใช้งานได้ กรุณาตรวจสอบ URL'];
    }

    // Size optimization
    if (result.sizeBytes && result.sizeBytes > IMAGE_CONFIG.RECOMMENDED_SIZE_BYTES) {
      suggestions.push('ลดขนาดไฟล์โดยการบีบอัดรูปภาพ');
    }

    // Dimension optimization
    if (result.width && result.height) {
      if (result.width > IMAGE_CONFIG.RECOMMENDED_WIDTH || result.height > IMAGE_CONFIG.RECOMMENDED_HEIGHT) {
        suggestions.push(`ปรับขนาดรูปภาพเป็น ${IMAGE_CONFIG.RECOMMENDED_WIDTH}x${IMAGE_CONFIG.RECOMMENDED_HEIGHT} pixels`);
      }

      const aspectRatio = result.width / result.height;
      if (aspectRatio < 1.2 || aspectRatio > 1.8) {
        suggestions.push('ปรับอัตราส่วนรูปภาพเป็น 4:3 หรือ 16:9');
      }
    }

    // Format optimization
    if (result.contentType && !result.contentType.includes('webp')) {
      suggestions.push('พิจารณาใช้ WebP format เพื่อลดขนาดไฟล์');
    }

    // CDN suggestion
    if (!result.url.includes('cdn') && !result.url.includes('cloudinary') && !result.url.includes('unsplash')) {
      suggestions.push('พิจารณาใช้ CDN หรือ image hosting service เพื่อประสิทธิภาพที่ดีขึ้น');
    }

    return suggestions.length > 0 ? suggestions : ['รูปภาพมีคุณภาพเหมาะสมแล้ว'];
  }
}

// Export singleton instance
export const imageValidator = new ImageValidator();

// Export utility functions
export async function validateSingleImage(url: string): Promise<ImageValidationResult> {
  return imageValidator.validateImageUrl(url);
}

export async function validateMultipleImages(urls: string[]): Promise<ImageValidationResult[]> {
  return imageValidator.validateImageUrls(urls);
}

export function getImageValidationSummary(results: ImageValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  totalErrors: number;
  totalWarnings: number;
} {
  return {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    warnings: results.filter(r => r.warnings.length > 0).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
  };
}

// Image URL helper functions
export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg)$/.test(pathname);
  } catch {
    return false;
  }
}

export function getImageFormat(contentType: string): string {
  const formatMap: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG'
  };

  return formatMap[contentType] || 'Unknown';
}

export function generateImagePreviewUrl(url: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  // For services that support dynamic resizing
  if (url.includes('unsplash.com')) {
    const sizeMap = {
      small: 'w=200&h=150',
      medium: 'w=400&h=300',
      large: 'w=800&h=600'
    };
    return `${url}?${sizeMap[size]}&fit=crop`;
  }

  if (url.includes('cloudinary.com')) {
    const sizeMap = {
      small: 'w_200,h_150,c_fill',
      medium: 'w_400,h_300,c_fill',
      large: 'w_800,h_600,c_fill'
    };
    // Insert transformation parameters into Cloudinary URL
    return url.replace('/upload/', `/upload/${sizeMap[size]}/`);
  }

  // Return original URL for other services
  return url;
}

// Export configuration for external use
export const IMAGE_VALIDATION_CONFIG = IMAGE_CONFIG;