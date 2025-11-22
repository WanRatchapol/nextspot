import { z } from 'zod';
import type {
  DestinationCSV,
  ImportError,
  ImportWarning,
  ValidationContext,
  ImportResult,
  DestinationPreview,
  ImportOptions,
  ImportSummary,
  DuplicateDestination,
  MoodTag,
  ImageInfo,
  ProcessedDestination,
  OpeningHours,
  BudgetBand,
  TransportAccess
} from '@/types/csv-import';
import {
  VALID_MOOD_TAGS,
  VALID_BUDGET_BANDS,
  VALID_TRANSPORT_ACCESS,
  BANGKOK_COORDINATES,
  CSV_CONSTRAINTS,
  IMPORT_ERROR_CODES
} from '@/types/csv-import';

// Zod validation schema for CSV rows
const DestinationCSVSchema = z.object({
  name_th: z.string()
    .min(1, 'ต้องระบุชื่อภาษาไทย')
    .max(CSV_CONSTRAINTS.MAX_NAME_LENGTH, `ชื่อไทยต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_NAME_LENGTH} ตัวอักษร`),

  name_en: z.string()
    .min(1, 'ต้องระบุชื่อภาษาอังกฤษ')
    .max(CSV_CONSTRAINTS.MAX_NAME_LENGTH, `ชื่ออังกฤษต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_NAME_LENGTH} ตัวอักษร`),

  description_th: z.string()
    .max(CSV_CONSTRAINTS.MAX_DESCRIPTION_LENGTH, `คำอธิบายไทยต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} ตัวอักษร`),

  description_en: z.string()
    .max(CSV_CONSTRAINTS.MAX_DESCRIPTION_LENGTH, `คำอธิบายอังกฤษต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} ตัวอักษร`),

  category: z.string()
    .min(1, 'ต้องระบุหมวดหมู่')
    .max(CSV_CONSTRAINTS.MAX_CATEGORY_LENGTH, `หมวดหมู่ต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_CATEGORY_LENGTH} ตัวอักษร`),

  budget_band: z.enum(['low', 'mid', 'high'] as const)
    .refine(() => true, { message: `ช่วงงบประมาณต้องเป็น: low, mid, high` }),

  district: z.string()
    .min(1, 'ต้องระบุเขต')
    .max(CSV_CONSTRAINTS.MAX_DISTRICT_LENGTH, `เขตต้องไม่เกิน ${CSV_CONSTRAINTS.MAX_DISTRICT_LENGTH} ตัวอักษร`),

  lat: z.number()
    .min(BANGKOK_COORDINATES.LAT_MIN, 'ละติจูดต้องอยู่ในพื้นที่กรุงเทพฯ')
    .max(BANGKOK_COORDINATES.LAT_MAX, 'ละติจูดต้องอยู่ในพื้นที่กรุงเทพฯ'),

  lng: z.number()
    .min(BANGKOK_COORDINATES.LNG_MIN, 'ลองจิจูดต้องอยู่ในพื้นที่กรุงเทพฯ')
    .max(BANGKOK_COORDINATES.LNG_MAX, 'ลองจิจูดต้องอยู่ในพื้นที่กรุงเทพฯ'),

  mood_tags: z.string()
    .min(1, 'ต้องระบุ mood tags อย่างน้อย 1 tag')
    .refine(validateMoodTags, 'Mood tags ไม่ถูกต้อง: ต้องเป็น ' + VALID_MOOD_TAGS.join(', ')),

  image_url: z.string()
    .url('URL รูปภาพไม่ถูกต้อง')
    .min(1, 'ต้องระบุ URL รูปภาพ'),

  instagram_score: z.number()
    .min(1, 'คะแนน Instagram ต้องอยู่ระหว่าง 1-10')
    .max(10, 'คะแนน Instagram ต้องอยู่ระหว่าง 1-10')
    .int('คะแนน Instagram ต้องเป็นจำนวนเต็ม'),

  opening_hours: z.string()
    .min(1, 'ต้องระบุเวลาเปิด-ปิด')
    .refine(validateOpeningHours, 'รูปแบบเวลาเปิด-ปิดไม่ถูกต้อง (ต้องเป็น JSON)'),

  transport_access: z.enum(['bts_mrt', 'taxi', 'walk', 'mixed'] as const)
    .refine(() => true, { message: `การเดินทางต้องเป็น: bts_mrt, taxi, walk, mixed` }),

  is_active: z.boolean()
});

// Validation helper functions
function validateMoodTags(tags: string): boolean {
  try {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    return tagList.length > 0 &&
           tagList.length <= 5 &&
           tagList.every(tag => VALID_MOOD_TAGS.includes(tag as MoodTag));
  } catch {
    return false;
  }
}

function validateOpeningHours(hoursString: string): boolean {
  try {
    const hours = JSON.parse(hoursString);
    if (typeof hours !== 'object' || hours === null) return false;

    // Check that all values are strings with time format
    const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    return Object.values(hours).every(value =>
      typeof value === 'string' && timeRegex.test(value)
    );
  } catch {
    return false;
  }
}

// Main CSV import processor class
export class CSVImportProcessor {
  private existingDestinations: Set<string> = new Set();

  /**
   * Parse CSV file and return structured data
   */
  async parseCSV(file: File): Promise<any[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('ไฟล์ CSV ว่างเปล่า');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        throw new Error(`แถว ${i + 1}: จำนวนคอลัมน์ไม่ตรงกับส่วนหัว`);
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header.trim()] = this.parseValue(values[index], header);
      });

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line respecting quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  }

  /**
   * Parse individual values with type conversion
   */
  private parseValue(value: string, header: string): any {
    // Remove surrounding quotes if present
    value = value.replace(/^"(.*)"$/, '$1').trim();

    // Type conversions based on field
    switch (header) {
      case 'lat':
      case 'lng':
      case 'instagram_score':
        return parseFloat(value);

      case 'is_active':
        return value.toLowerCase() === 'true';

      default:
        return value;
    }
  }

  /**
   * Validate all rows and return results
   */
  async validateRows(
    rows: any[],
    options: ImportOptions
  ): Promise<DestinationPreview[]> {
    const previews: DestinationPreview[] = [];
    const context: ValidationContext = {
      row: 0,
      existingDestinations: this.existingDestinations,
      validMoodTags: new Set(VALID_MOOD_TAGS),
      validCategories: new Set(), // Would be loaded from database
      validDistricts: new Set(), // Would be loaded from database
    };

    for (let i = 0; i < rows.length; i++) {
      context.row = i + 1;
      const preview = await this.validateSingleRow(rows[i], context);
      previews.push(preview);
    }

    return previews;
  }

  /**
   * Validate a single row
   */
  private async validateSingleRow(
    row: any,
    context: ValidationContext
  ): Promise<DestinationPreview> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Schema validation
    const validationResult = DestinationCSVSchema.safeParse(row);

    if (!validationResult.success) {
      validationResult.error.issues.forEach(issue => {
        errors.push({
          row: context.row,
          field: issue.path[0] as string,
          message: issue.message,
          value: row[issue.path[0]],
          severity: 'error'
        });
      });
    }

    // Additional business logic validation
    await this.performBusinessValidation(row, context, errors, warnings);

    // Check for duplicates
    const isDuplicate = await this.checkDuplicate(row, context);
    let existingDestination = undefined;
    if (isDuplicate) {
      existingDestination = {
        id: 'existing-id', // Would come from database lookup
        name_en: row.name_en,
        name_th: row.name_th
      };

      warnings.push({
        row: context.row,
        field: 'name_en',
        message: 'สถานที่นี้มีอยู่แล้วในระบบ',
        value: row.name_en
      });
    }

    const status = errors.length > 0 ? 'error' :
                  warnings.length > 0 ? 'warning' : 'valid';

    return {
      row: context.row,
      data: validationResult.success ? validationResult.data : row,
      status,
      errors,
      warnings,
      isDuplicate,
      existingDestination
    };
  }

  /**
   * Perform additional business logic validation
   */
  private async performBusinessValidation(
    row: any,
    context: ValidationContext,
    errors: ImportError[],
    warnings: ImportWarning[]
  ): Promise<void> {
    // Validate image URL accessibility (would make HTTP request in real implementation)
    if (row.image_url) {
      const imageInfo = await this.validateImageUrl(row.image_url);
      if (!imageInfo.isAccessible) {
        errors.push({
          row: context.row,
          field: 'image_url',
          message: 'ไม่สามารถเข้าถึง URL รูปภาพได้',
          value: row.image_url,
          severity: 'error'
        });
      } else if (imageInfo.sizeBytes && imageInfo.sizeBytes > CSV_CONSTRAINTS.IMAGE_MAX_SIZE_BYTES) {
        warnings.push({
          row: context.row,
          field: 'image_url',
          message: 'ขนาดรูปภาพใหญ่เกินไป (แนะนำ < 5MB)',
          value: `${Math.round(imageInfo.sizeBytes / 1024 / 1024)}MB`
        });
      }
    }

    // Validate mood tags count
    if (row.mood_tags) {
      const tagCount = row.mood_tags.split(',').length;
      if (tagCount > 5) {
        warnings.push({
          row: context.row,
          field: 'mood_tags',
          message: 'มี mood tags มากเกินไป (แนะนำไม่เกิน 5 tags)',
          value: tagCount
        });
      }
    }

    // Validate Instagram score reasonableness
    if (row.instagram_score && row.instagram_score < 3) {
      warnings.push({
        row: context.row,
        field: 'instagram_score',
        message: 'คะแนน Instagram ต่ำ อาจไม่น่าสนใจสำหรับผู้ใช้',
        value: row.instagram_score
      });
    }
  }

  /**
   * Check if destination already exists
   */
  private async checkDuplicate(row: any, context: ValidationContext): Promise<boolean> {
    // In real implementation, this would query the database
    // For now, just check against our in-memory set
    const key = `${row.name_en.toLowerCase()}-${row.lat}-${row.lng}`;
    return context.existingDestinations.has(key);
  }

  /**
   * Validate image URL accessibility and get metadata
   */
  private async validateImageUrl(url: string): Promise<ImageInfo> {
    try {
      // In real implementation, this would make HTTP HEAD request
      // For now, return mock validation
      const isValid = url.startsWith('http') && (url.includes('unsplash') || url.includes('cloudinary'));

      return {
        url,
        isValid,
        isAccessible: isValid,
        width: isValid ? 800 : undefined,
        height: isValid ? 600 : undefined,
        sizeBytes: isValid ? 150000 : undefined,
        contentType: isValid ? 'image/jpeg' : undefined
      };
    } catch (error) {
      return {
        url,
        isValid: false,
        isAccessible: false
      };
    }
  }

  /**
   * Process complete CSV import
   */
  async processCSVImport(
    file: File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();

    try {
      // Step 1: Parse CSV
      const rows = await this.parseCSV(file);

      if (rows.length > CSV_CONSTRAINTS.MAX_ROWS) {
        throw new Error(`ไฟล์มีข้อมูลมากเกินไป (สูงสุด ${CSV_CONSTRAINTS.MAX_ROWS} แถว)`);
      }

      // Step 2: Validate rows
      const previews = await this.validateRows(rows, options);

      // Step 3: Generate summary
      const summary = this.generateSummary(previews, startTime);

      // Step 4: Extract errors and warnings
      const allErrors = previews.flatMap(p => p.errors);
      const allWarnings = previews.flatMap(p => p.warnings);
      const duplicates = this.extractDuplicates(previews);

      // Step 5: Process data if not validation-only
      let importId: string | undefined;
      if (!options.validateOnly && allErrors.length === 0) {
        importId = await this.storeDestinations(previews, options);
      }

      return {
        summary,
        errors: allErrors,
        warnings: allWarnings,
        duplicates,
        preview: options.validateOnly ? previews : undefined,
        importId
      };

    } catch (error) {
      const endTime = Date.now();

      return {
        summary: {
          totalRows: 0,
          successfulRows: 0,
          errorRows: 1,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: endTime - startTime
        },
        errors: [{
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการประมวลผลไฟล์',
          value: file.name,
          severity: 'error'
        }],
        warnings: [],
        duplicates: []
      };
    }
  }

  /**
   * Generate import summary
   */
  private generateSummary(previews: DestinationPreview[], startTime: number): ImportSummary {
    const endTime = Date.now();

    return {
      totalRows: previews.length,
      successfulRows: previews.filter(p => p.status === 'valid').length,
      errorRows: previews.filter(p => p.status === 'error').length,
      warningRows: previews.filter(p => p.status === 'warning').length,
      duplicateRows: previews.filter(p => p.isDuplicate).length,
      skippedRows: 0, // Would be calculated based on user choices
      processingTimeMs: endTime - startTime
    };
  }

  /**
   * Extract duplicate information
   */
  private extractDuplicates(previews: DestinationPreview[]): DuplicateDestination[] {
    return previews
      .filter(p => p.isDuplicate && p.existingDestination)
      .map(p => ({
        row: p.row,
        existingId: p.existingDestination!.id,
        name_en: p.data.name_en,
        name_th: p.data.name_th,
        action: 'skip' // Default action
      }));
  }

  /**
   * Store destinations in database (mock implementation)
   */
  private async storeDestinations(
    previews: DestinationPreview[],
    options: ImportOptions
  ): Promise<string> {
    // In real implementation, this would:
    // 1. Convert previews to database format
    // 2. Batch insert into database
    // 3. Handle duplicates according to options
    // 4. Return import ID for tracking

    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`[CSV Import] Stored ${previews.length} destinations with import ID: ${importId}`);

    return importId;
  }

  /**
   * Load existing destinations for duplicate checking
   */
  async loadExistingDestinations(): Promise<void> {
    // In real implementation, this would query the database
    // For now, just initialize empty set
    this.existingDestinations.clear();

    // Mock some existing destinations
    this.existingDestinations.add('chatuchak weekend market-13.7995-100.5497');
    this.existingDestinations.add('siam square-13.7456-100.5341');
  }
}

// Export utility functions
export const csvImportProcessor = new CSVImportProcessor();

export async function processCSVFile(file: File, options: ImportOptions): Promise<ImportResult> {
  await csvImportProcessor.loadExistingDestinations();
  return csvImportProcessor.processCSVImport(file, options);
}

export function generateCSVTemplate(): string {
  const headers = [
    'name_th', 'name_en', 'description_th', 'description_en', 'category',
    'budget_band', 'district', 'lat', 'lng', 'mood_tags', 'image_url',
    'instagram_score', 'opening_hours', 'transport_access', 'is_active'
  ];

  const sampleRow = [
    'จตุจักร วีคเอนด์ มาร์เก็ต',
    'Chatuchak Weekend Market',
    'ตลาดนัดที่ใหญ่ที่สุดในไทย',
    'Largest weekend market in Thailand',
    'market',
    '500-1000',
    'Chatuchak',
    '13.7995',
    '100.5497',
    'foodie,cultural,social',
    'https://images.unsplash.com/chatuchak',
    '9',
    '{"sat":"09:00-18:00","sun":"09:00-18:00"}',
    'bts_mrt',
    'true'
  ];

  return [
    headers.join(','),
    sampleRow.map(value => `"${value}"`).join(',')
  ].join('\n');
}