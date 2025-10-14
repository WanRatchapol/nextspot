# S-11: Admin CSV Import

## Story Overview

**Story ID:** S-11
**Story Name:** Admin CSV Import
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** Medium (Content Management)

## User Story

**As a** content manager,
**I want** to efficiently import and manage Bangkok destination data via CSV,
**so that** I can quickly populate the system with 50-80 curated destinations for the MVP validation.

## Intent & Scope

Create streamlined content management system for rapid destination import with validation, mood tagging, and basic admin interface for MVP content operations.

## Acceptance Criteria

1. CSV upload interface for bulk destination import
2. Data validation and error reporting for uploaded files
3. Support for Thai/English names, descriptions, and metadata
4. Mood tag assignment and budget band categorization
5. Image URL validation and optimization checking
6. Preview imported destinations before confirmation
7. Batch operations for enable/disable destinations
8. Export existing destinations to CSV format

## CSV Schema

```typescript
interface DestinationCSV {
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  category: string;
  budget_band: '<500' | '500-1000' | '1000-2000' | '2000+';
  district: string;
  lat: number;
  lng: number;
  mood_tags: string; // comma-separated: "chill,foodie,cultural"
  image_url: string;
  instagram_score: number; // 1-10
  opening_hours: string; // JSON string
  transport_access: string; // "bts_mrt" | "taxi" | "walk" | "mixed"
  is_active: boolean;
}
```

## Example CSV Format

```csv
name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร วีคเอนด์ มาร์เก็ต","Chatuchak Weekend Market","ตลาดนัดที่ใหญ่ที่สุดในไทย","Largest weekend market in Thailand","market","500-1000","Chatuchak",13.7995,100.5497,"foodie,cultural,social","https://images.unsplash.com/chatuchak",9,"{""sat"":""09:00-18:00"",""sun"":""09:00-18:00""}","bts_mrt",true
"สยามสแควร์","Siam Square","ศูนย์การค้าและแหล่งช้อปปิ้ง","Shopping and entertainment center","shopping","1000-2000","Pathum Wan",13.7456,100.5341,"social,cultural","https://images.unsplash.com/siam",8,"{""daily"":""10:00-22:00""}","bts_mrt",true
```

## API Contract

**POST /api/admin/destinations/import**
```typescript
interface CSVImportRequest {
  file: File; // CSV file
  validateOnly?: boolean; // preview mode
  overwrite?: boolean; // replace existing data
}

interface CSVImportResponse {
  success: boolean;
  processed: number;
  errors: ImportError[];
  preview?: DestinationPreview[];
  importId?: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  value: any;
}
```

**GET /api/admin/destinations/export** - Export current destinations to CSV

## Validation Rules

```typescript
const DestinationCSVSchema = z.object({
  name_th: z.string().min(1, 'ต้องระบุชื่อภาษาไทย'),
  name_en: z.string().min(1, 'ต้องระบุชื่อภาษาอังกฤษ'),
  description_th: z.string().max(200, 'คำอธิบายไทยต้องไม่เกิน 200 ตัวอักษร'),
  description_en: z.string().max(200, 'คำอธิบายอังกฤษต้องไม่เกิน 200 ตัวอักษร'),
  category: z.string().min(1),
  budget_band: z.enum(['<500', '500-1000', '1000-2000', '2000+']),
  district: z.string().min(1),
  lat: z.number().min(13.0).max(14.0, 'ต้องอยู่ในพื้นที่กรุงเทพฯ'),
  lng: z.number().min(100.0).max(101.0, 'ต้องอยู่ในพื้นที่กรุงเทพฯ'),
  mood_tags: z.string().refine(validateMoodTags),
  image_url: z.string().url('URL รูปภาพไม่ถูกต้อง'),
  instagram_score: z.number().min(1).max(10),
  opening_hours: z.string().refine(validateOpeningHours),
  transport_access: z.enum(['bts_mrt', 'taxi', 'walk', 'mixed']),
  is_active: z.boolean()
});

function validateMoodTags(tags: string): boolean {
  const validTags = ['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic'];
  const tagList = tags.split(',').map(t => t.trim());
  return tagList.length > 0 && tagList.every(tag => validTags.includes(tag));
}
```

## Import Processing Pipeline

```typescript
class DestinationImporter {
  async processCSV(file: File, options: ImportOptions): Promise<ImportResult> {
    // 1. Parse CSV file
    const rows = await this.parseCSV(file);

    // 2. Validate each row
    const validatedRows = await this.validateRows(rows);

    // 3. Check for duplicates
    const deduplicatedRows = await this.checkDuplicates(validatedRows);

    // 4. Process images
    const processedRows = await this.processImages(deduplicatedRows);

    // 5. Store in database
    if (!options.validateOnly) {
      await this.storeDestinations(processedRows);
    }

    return this.generateReport(processedRows);
  }

  private async processImages(rows: ValidatedRow[]): Promise<ProcessedRow[]> {
    return Promise.all(rows.map(async row => {
      // Validate image URL accessibility
      const imageValid = await this.validateImageUrl(row.image_url);

      // Get image dimensions and size
      const imageInfo = await this.getImageInfo(row.image_url);

      return {
        ...row,
        imageValid,
        imageInfo,
        warnings: imageInfo.sizeBytes > 120000 ? ['Image size > 120KB'] : []
      };
    }));
  }
}
```

## Admin Interface

```typescript
const AdminImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewMode, setPreviewMode] = useState(true);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);

    // Auto-preview on file selection
    const result = await importDestinations(uploadedFile, { validateOnly: true });
    setImportResult(result);
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    const result = await importDestinations(file, { validateOnly: false });
    setImportResult(result);
  };

  return (
    <div className="admin-import">
      <FileDropzone onFileSelect={handleFileUpload} />
      {importResult && (
        <ImportPreview
          result={importResult}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportResult(null)}
        />
      )}
    </div>
  );
};
```

## Error Handling & Reporting

```typescript
interface ImportReport {
  summary: {
    totalRows: number;
    successfulRows: number;
    errorRows: number;
    warningRows: number;
  };
  errors: ImportError[];
  warnings: ImportWarning[];
  duplicates: DuplicateDestination[];
}

// Generate detailed error report
const generateErrorReport = (errors: ImportError[]): string => {
  const errorsByType = groupBy(errors, 'field');

  return Object.entries(errorsByType)
    .map(([field, fieldErrors]) =>
      `${field}: ${fieldErrors.length} errors\n` +
      fieldErrors.map(e => `  Row ${e.row}: ${e.message}`).join('\n')
    ).join('\n\n');
};
```

## Performance Optimizations

```typescript
// Batch processing for large CSV files
const processBatch = async (rows: CSVRow[], batchSize = 100): Promise<ProcessedRow[]> => {
  const batches = chunk(rows, batchSize);
  const results: ProcessedRow[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(row => processRow(row))
    );
    results.push(...batchResults);

    // Progress reporting
    await new Promise(resolve => setTimeout(resolve, 10)); // Prevent blocking
  }

  return results;
};

// Database bulk insert
const bulkInsertDestinations = async (destinations: ProcessedDestination[]): Promise<void> => {
  await db.destination.createMany({
    data: destinations,
    skipDuplicates: true
  });

  // Create image records
  const imageData = destinations.flatMap(dest =>
    dest.images.map(img => ({ ...img, destinationId: dest.id }))
  );

  await db.destinationImage.createMany({
    data: imageData
  });
};
```

## Analytics Events

- `csv_upload_initiated` - User started CSV upload
- `csv_validation_completed` - Validation finished
- `destinations_imported` - Successful import completed
- `import_errors_reported` - Validation errors found

## Performance Targets

- CSV Parsing: < 2s for 100 rows
- Validation: < 5s for 100 destinations
- Database Insert: < 3s for 100 destinations
- Image Validation: < 10s for 100 URLs

## Links & References

- **PRD Reference:** [docs/prd.md#story-15-enhanced-content-management](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#enhanced-content-management](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13