import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/utils/request-id';
import { processCSVFile } from '@/utils/csv-import';
import type {
  CSVImportResponse,
  ImportOptions,
  ImportAnalyticsEvent
} from '@/types/csv-import';
import { CSV_CONSTRAINTS, IMPORT_ERROR_CODES } from '@/types/csv-import';

export const runtime = 'nodejs';

// Validation schema for import request
const ImportRequestSchema = z.object({
  validateOnly: z.boolean().optional().default(true),
  overwrite: z.boolean().optional().default(false),
  skipDuplicates: z.boolean().optional().default(true),
  batchSize: z.number().int().min(1).max(500).optional().default(100),
});

// In-memory storage for tracking imports (replace with Redis/database in production)
const importTracking = new Map<string, {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  createdAt: Date;
}>();

/**
 * POST /api/admin/destinations/import
 * Process CSV file upload for destination import
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log('[Admin] Processing destination import request', { requestId });

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const optionsJson = formData.get('options') as string;

    // Validate file presence
    if (!file) {
      const errorResponse: CSVImportResponse = {
        success: false,
        processed: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: 'ไม่พบไฟล์ที่อัปโหลด',
          value: null,
          severity: 'error'
        }],
        warnings: []
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const errorResponse: CSVImportResponse = {
        success: false,
        processed: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: 'ไฟล์ต้องเป็นนามสกุล .csv เท่านั้น',
          value: file.name,
          severity: 'error'
        }],
        warnings: []
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file size
    const maxSizeBytes = CSV_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const errorResponse: CSVImportResponse = {
        success: false,
        processed: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: `ไฟล์ใหญ่เกินไป (สูงสุด ${CSV_CONSTRAINTS.MAX_FILE_SIZE_MB}MB)`,
          value: `${Math.round(file.size / 1024 / 1024)}MB`,
          severity: 'error'
        }],
        warnings: []
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Parse and validate options
    let options: ImportOptions;
    try {
      const parsedOptions = optionsJson ? JSON.parse(optionsJson) : {};
      const validationResult = ImportRequestSchema.safeParse(parsedOptions);

      if (!validationResult.success) {
        const errorResponse: CSVImportResponse = {
          success: false,
          processed: 0,
          errors: validationResult.error.issues.map(issue => ({
            row: 0,
            field: issue.path[0] as string,
            message: issue.message,
            value: parsedOptions[issue.path[0]],
            severity: 'error'
          })),
          warnings: []
        };

        return NextResponse.json(errorResponse, { status: 400 });
      }

      options = validationResult.data;
    } catch (error) {
      const errorResponse: CSVImportResponse = {
        success: false,
        processed: 0,
        errors: [{
          row: 0,
          field: 'options',
          message: 'รูปแบบ options ไม่ถูกต้อง',
          value: optionsJson,
          severity: 'error'
        }],
        warnings: []
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Track analytics event
    const analyticsEvent: ImportAnalyticsEvent = {
      event: 'csv_upload_initiated',
      sessionId: requestId,
      filename: file.name,
      timestamp: new Date()
    };
    console.log('[Analytics] csv_upload_initiated:', analyticsEvent);

    // Process CSV file
    const result = await processCSVFile(file, options);

    // Track validation completion
    const validationEvent: ImportAnalyticsEvent = {
      event: 'csv_validation_completed',
      sessionId: requestId,
      filename: file.name,
      totalRows: result.summary.totalRows,
      errorCount: result.errors.length,
      processingTimeMs: result.summary.processingTimeMs,
      timestamp: new Date()
    };
    console.log('[Analytics] csv_validation_completed:', validationEvent);

    // Store import tracking info
    if (result.importId) {
      importTracking.set(result.importId, {
        id: result.importId,
        status: 'completed',
        result,
        createdAt: new Date()
      });

      // Track successful import
      const importEvent: ImportAnalyticsEvent = {
        event: 'destinations_imported',
        sessionId: requestId,
        importId: result.importId,
        filename: file.name,
        totalRows: result.summary.totalRows,
        successfulRows: result.summary.successfulRows,
        processingTimeMs: result.summary.processingTimeMs,
        timestamp: new Date()
      };
      console.log('[Analytics] destinations_imported:', importEvent);
    }

    // Track errors if any
    if (result.errors.length > 0) {
      const errorEvent: ImportAnalyticsEvent = {
        event: 'import_errors_reported',
        sessionId: requestId,
        filename: file.name,
        errorCount: result.errors.length,
        timestamp: new Date()
      };
      console.log('[Analytics] import_errors_reported:', errorEvent);
    }

    // Prepare response
    const response: CSVImportResponse = {
      success: result.errors.length === 0,
      processed: result.summary.successfulRows,
      errors: result.errors,
      warnings: result.warnings,
      preview: result.preview,
      importId: result.importId,
      duplicates: result.duplicates
    };

    const processingTime = Date.now() - startTime;
    console.log('[Admin] Import processing completed', {
      requestId,
      filename: file.name,
      totalRows: result.summary.totalRows,
      successfulRows: result.summary.successfulRows,
      errorCount: result.errors.length,
      processingTimeMs: processingTime,
      success: response.success
    });

    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('[Admin] Failed to process import request', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime
    });

    const errorResponse: CSVImportResponse = {
      success: false,
      processed: 0,
      errors: [{
        row: 0,
        field: 'system',
        message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
        value: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error'
      }],
      warnings: []
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': processingTime.toString()
      }
    });
  }
}

/**
 * GET /api/admin/destinations/import/{importId}
 * Get import status and results
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const url = new URL(request.url);
    const importId = url.searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({
        error: {
          code: 'MISSING_IMPORT_ID',
          message: 'ต้องระบุ importId'
        },
        request_id: requestId
      }, { status: 400 });
    }

    const tracking = importTracking.get(importId);

    if (!tracking) {
      return NextResponse.json({
        error: {
          code: 'IMPORT_NOT_FOUND',
          message: 'ไม่พบข้อมูลการนำเข้านี้'
        },
        request_id: requestId
      }, { status: 404 });
    }

    console.log('[Admin] Retrieved import status', {
      requestId,
      importId,
      status: tracking.status
    });

    return NextResponse.json({
      importId: tracking.id,
      status: tracking.status,
      result: tracking.result,
      createdAt: tracking.createdAt,
      request_id: requestId
    });

  } catch (error) {
    console.error('[Admin] Failed to retrieve import status', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะการนำเข้า'
      },
      request_id: requestId
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/destinations/import/{importId}
 * Cancel or clean up import
 */
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const url = new URL(request.url);
    const importId = url.searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({
        error: {
          code: 'MISSING_IMPORT_ID',
          message: 'ต้องระบุ importId'
        },
        request_id: requestId
      }, { status: 400 });
    }

    const tracking = importTracking.get(importId);

    if (!tracking) {
      return NextResponse.json({
        error: {
          code: 'IMPORT_NOT_FOUND',
          message: 'ไม่พบข้อมูลการนำเข้านี้'
        },
        request_id: requestId
      }, { status: 404 });
    }

    // Remove from tracking
    importTracking.delete(importId);

    console.log('[Admin] Cleaned up import', {
      requestId,
      importId
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการนำเข้าเรียบร้อยแล้ว',
      request_id: requestId
    });

  } catch (error) {
    console.error('[Admin] Failed to delete import', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการลบข้อมูลการนำเข้า'
      },
      request_id: requestId
    }, { status: 500 });
  }
}

// Cleanup old import tracking data (would run as a background job in production)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [importId, tracking] of importTracking.entries()) {
    if (now - tracking.createdAt.getTime() > maxAge) {
      importTracking.delete(importId);
    }
  }
}, 60 * 60 * 1000); // Run every hour