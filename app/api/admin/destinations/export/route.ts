import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/utils/request-id';
import { generateCSVTemplate } from '@/utils/csv-import';
import type {
  ExportOptions,
  ExportResult,
  DestinationFilters,
  ImportAnalyticsEvent,
  BudgetBand,
  TransportAccess,
  MoodTag
} from '@/types/csv-import';
import { VALID_BUDGET_BANDS, VALID_TRANSPORT_ACCESS, VALID_MOOD_TAGS } from '@/types/csv-import';

export const runtime = 'nodejs';

// Validation schema for export request
const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  includeInactive: z.boolean().optional().default(false),
  selectedFields: z.array(z.string()).optional(),
  filters: z.object({
    category: z.string().optional(),
    district: z.string().optional(),
    budget_band: z.enum(VALID_BUDGET_BANDS).optional(),
    mood_tags: z.array(z.enum(VALID_MOOD_TAGS)).optional(),
    is_active: z.boolean().optional(),
  }).optional()
});

// Mock destination data (would come from database in production)
const mockDestinations = [
  {
    id: 'dest-1',
    name_th: 'จตุจักร วีคเอนด์ มาร์เก็ต',
    name_en: 'Chatuchak Weekend Market',
    description_th: 'ตลาดนัดที่ใหญ่ที่สุดในไทย มีสินค้าหลากหลาย',
    description_en: 'Largest weekend market in Thailand with diverse products',
    category: 'market',
    budget_band: '500-1000' as BudgetBand,
    district: 'Chatuchak',
    lat: 13.7995,
    lng: 100.5497,
    mood_tags: 'foodie,cultural,social',
    image_url: 'https://images.unsplash.com/chatuchak-market',
    instagram_score: 9,
    opening_hours: '{"sat":"09:00-18:00","sun":"09:00-18:00"}',
    transport_access: 'bts_mrt' as TransportAccess,
    is_active: true,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-15T00:00:00Z')
  },
  {
    id: 'dest-2',
    name_th: 'สยามสแควร์',
    name_en: 'Siam Square',
    description_th: 'ศูนย์การค้าและแหล่งช้อปปิ้งยอดนิยม',
    description_en: 'Popular shopping and entertainment center',
    category: 'shopping',
    budget_band: '1000-2000' as BudgetBand,
    district: 'Pathum Wan',
    lat: 13.7456,
    lng: 100.5341,
    mood_tags: 'social,cultural',
    image_url: 'https://images.unsplash.com/siam-square',
    instagram_score: 8,
    opening_hours: '{"daily":"10:00-22:00"}',
    transport_access: 'bts_mrt' as TransportAccess,
    is_active: true,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-10T00:00:00Z')
  },
  {
    id: 'dest-3',
    name_th: 'วัดพระแก้ว',
    name_en: 'Temple of the Emerald Buddha',
    description_th: 'วัดที่สำคัญที่สุดในประเทศไทย',
    description_en: 'Most important temple in Thailand',
    category: 'temple',
    budget_band: '<500' as BudgetBand,
    district: 'Phra Nakhon',
    lat: 13.7515,
    lng: 100.4925,
    mood_tags: 'cultural,romantic',
    image_url: 'https://images.unsplash.com/wat-phra-kaew',
    instagram_score: 10,
    opening_hours: '{"daily":"08:30-15:30"}',
    transport_access: 'taxi' as TransportAccess,
    is_active: false, // Inactive destination
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-05T00:00:00Z')
  }
];

/**
 * GET /api/admin/destinations/export
 * Export destinations data in various formats
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log('[Admin] Processing destinations export request', { requestId });

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Handle special case for template download
    if (queryParams.template === 'true') {
      const template = generateCSVTemplate();
      const filename = `destinations_template_${new Date().toISOString().split('T')[0]}.csv`;

      console.log('[Admin] Generated CSV template', { requestId, filename });

      return new NextResponse(template, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Request-ID': requestId
        }
      });
    }

    // Parse and validate export options
    const parsedOptions = {
      format: queryParams.format || 'csv',
      includeInactive: queryParams.includeInactive === 'true',
      selectedFields: queryParams.selectedFields ? queryParams.selectedFields.split(',') : undefined,
      filters: queryParams.filters ? JSON.parse(queryParams.filters) : undefined
    };

    const validationResult = ExportRequestSchema.safeParse(parsedOptions);

    if (!validationResult.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid export parameters',
          details: validationResult.error.issues.reduce((acc, issue) => {
            acc[issue.path[0] as string] = issue.message;
            return acc;
          }, {} as Record<string, string>)
        },
        request_id: requestId
      }, { status: 400 });
    }

    const options = validationResult.data;

    // Filter destinations based on options
    const filteredDestinations = filterDestinations(mockDestinations, options);

    console.log('[Admin] Filtered destinations', {
      requestId,
      totalDestinations: mockDestinations.length,
      filteredCount: filteredDestinations.length,
      options
    });

    // Generate export based on format
    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (options.format === 'json') {
      content = JSON.stringify(filteredDestinations, null, 2);
      contentType = 'application/json';
      fileExtension = 'json';
    } else {
      content = generateCSV(filteredDestinations, options.selectedFields);
      contentType = 'text/csv';
      fileExtension = 'csv';
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `destinations_export_${timestamp}.${fileExtension}`;

    // Track analytics event
    const analyticsEvent: ImportAnalyticsEvent = {
      event: 'export_completed',
      sessionId: requestId,
      filename,
      totalRows: filteredDestinations.length,
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date()
    };
    console.log('[Analytics] export_completed:', analyticsEvent);

    console.log('[Admin] Export completed', {
      requestId,
      filename,
      format: options.format,
      destinationCount: filteredDestinations.length,
      processingTimeMs: Date.now() - startTime
    });

    // Return file as download
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId,
        'X-Export-Count': filteredDestinations.length.toString(),
        'X-Processing-Time': (Date.now() - startTime).toString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('[Admin] Failed to process export request', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime
    });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to export destinations data'
      },
      request_id: requestId
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString()
      }
    });
  }
}

/**
 * POST /api/admin/destinations/export
 * Create export job for large datasets (async processing)
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    console.log('[Admin] Creating export job', { requestId });

    const body = await request.json();
    const validationResult = ExportRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid export parameters',
          details: validationResult.error.issues.reduce((acc, issue) => {
            acc[issue.path[0] as string] = issue.message;
            return acc;
          }, {} as Record<string, string>)
        },
        request_id: requestId
      }, { status: 400 });
    }

    const options = validationResult.data;

    // Create export job (mock implementation)
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filteredDestinations = filterDestinations(mockDestinations, options);

    // Mock processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    const result: ExportResult = {
      filename: `destinations_export_${new Date().toISOString().split('T')[0]}.${options.format}`,
      url: `/api/admin/destinations/export/${exportId}/download`,
      count: filteredDestinations.length,
      generatedAt: new Date()
    };

    console.log('[Admin] Export job created', {
      requestId,
      exportId,
      count: result.count,
      format: options.format
    });

    return NextResponse.json({
      exportId,
      status: 'completed',
      result,
      request_id: requestId
    }, { status: 201 });

  } catch (error) {
    console.error('[Admin] Failed to create export job', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create export job'
      },
      request_id: requestId
    }, { status: 500 });
  }
}

/**
 * Filter destinations based on provided options
 */
function filterDestinations(destinations: any[], options: ExportOptions): any[] {
  let filtered = [...destinations];

  // Filter by active status
  if (!options.includeInactive) {
    filtered = filtered.filter(dest => dest.is_active);
  }

  // Apply filters if provided
  if (options.filters) {
    const filters = options.filters;

    if (filters.category) {
      filtered = filtered.filter(dest => dest.category === filters.category);
    }

    if (filters.district) {
      filtered = filtered.filter(dest => dest.district === filters.district);
    }

    if (filters.budget_band) {
      filtered = filtered.filter(dest => dest.budget_band === filters.budget_band);
    }

    if (filters.mood_tags && filters.mood_tags.length > 0) {
      filtered = filtered.filter(dest => {
        const destTags = dest.mood_tags.split(',').map((tag: string) => tag.trim());
        return filters.mood_tags!.some(filterTag => destTags.includes(filterTag));
      });
    }

    if (filters.is_active !== undefined) {
      filtered = filtered.filter(dest => dest.is_active === filters.is_active);
    }
  }

  return filtered;
}

/**
 * Generate CSV content from destinations data
 */
function generateCSV(destinations: any[], selectedFields?: string[]): string {
  if (destinations.length === 0) {
    return 'No destinations found matching the criteria';
  }

  // Default fields to include
  const defaultFields = [
    'name_th', 'name_en', 'description_th', 'description_en', 'category',
    'budget_band', 'district', 'lat', 'lng', 'mood_tags', 'image_url',
    'instagram_score', 'opening_hours', 'transport_access', 'is_active'
  ];

  const fields = selectedFields && selectedFields.length > 0 ? selectedFields : defaultFields;

  // Generate header row
  const headers = fields.join(',');

  // Generate data rows
  const rows = destinations.map(dest => {
    return fields.map(field => {
      let value = dest[field];

      // Handle special formatting
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        // Escape CSV special characters
        value = `"${value.replace(/"/g, '""')}"`;
      } else if (typeof value === 'boolean') {
        value = value.toString();
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      return value;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Get available filter options for UI
 */
export async function OPTIONS(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Extract unique values for filters (would come from database in production)
    const categories = [...new Set(mockDestinations.map(d => d.category))];
    const districts = [...new Set(mockDestinations.map(d => d.district))];

    const filterOptions = {
      categories: categories.sort(),
      districts: districts.sort(),
      budget_bands: VALID_BUDGET_BANDS,
      transport_access: VALID_TRANSPORT_ACCESS,
      mood_tags: VALID_MOOD_TAGS,
      fields: [
        'id', 'name_th', 'name_en', 'description_th', 'description_en',
        'category', 'budget_band', 'district', 'lat', 'lng', 'mood_tags',
        'image_url', 'instagram_score', 'opening_hours', 'transport_access',
        'is_active', 'created_at', 'updated_at'
      ]
    };

    console.log('[Admin] Retrieved filter options', {
      requestId,
      categories: categories.length,
      districts: districts.length
    });

    return NextResponse.json({
      options: filterOptions,
      request_id: requestId
    });

  } catch (error) {
    console.error('[Admin] Failed to get filter options', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve filter options'
      },
      request_id: requestId
    }, { status: 500 });
  }
}