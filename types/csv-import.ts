// Types for S-11 Admin CSV Import feature
// Content management system for destination data import

// Core CSV data types
export type BudgetBand = '<500' | '500-1000' | '1000-2000' | '2000+';
export type TransportAccess = 'bts_mrt' | 'taxi' | 'walk' | 'mixed';
export type MoodTag = 'chill' | 'adventure' | 'foodie' | 'cultural' | 'social' | 'romantic';

// CSV row interface matching the schema
export interface DestinationCSV {
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  category: string;
  budget_band: BudgetBand;
  district: string;
  lat: number;
  lng: number;
  mood_tags: string; // comma-separated tags
  image_url: string;
  instagram_score: number; // 1-10
  opening_hours: string; // JSON string
  transport_access: TransportAccess;
  is_active: boolean;
}

// Processed destination data
export interface ProcessedDestination extends DestinationCSV {
  id: string;
  mood_tags_array: MoodTag[]; // parsed mood tags
  opening_hours_parsed: OpeningHours; // parsed opening hours
  image_info?: ImageInfo;
  created_at: Date;
  updated_at: Date;
}

// Opening hours structure
export interface OpeningHours {
  [key: string]: string; // e.g., "mon": "09:00-17:00"
}

// Image validation info
export interface ImageInfo {
  url: string;
  isValid: boolean;
  width?: number;
  height?: number;
  sizeBytes?: number;
  contentType?: string;
  isAccessible: boolean;
}

// Import request/response interfaces
export interface CSVImportRequest {
  file: File;
  validateOnly?: boolean;
  overwrite?: boolean;
}

export interface CSVImportResponse {
  success: boolean;
  processed: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  preview?: DestinationPreview[];
  importId?: string;
  duplicates?: DuplicateDestination[];
}

// Error and validation types
export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: any;
  severity: 'error' | 'warning';
}

export interface ImportWarning {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface DuplicateDestination {
  row: number;
  existingId: string;
  name_en: string;
  name_th: string;
  action: 'skip' | 'overwrite' | 'create_new';
}

// Preview interface for UI
export interface DestinationPreview {
  row: number;
  data: DestinationCSV;
  status: 'valid' | 'warning' | 'error';
  errors: ImportError[];
  warnings: ImportWarning[];
  isDuplicate: boolean;
  existingDestination?: {
    id: string;
    name_en: string;
    name_th: string;
  };
}

// Import options
export interface ImportOptions {
  validateOnly: boolean;
  overwrite: boolean;
  skipDuplicates: boolean;
  batchSize: number;
}

// Import result summary
export interface ImportResult {
  summary: ImportSummary;
  errors: ImportError[];
  warnings: ImportWarning[];
  duplicates: DuplicateDestination[];
  preview?: DestinationPreview[];
  importId?: string;
}

export interface ImportSummary {
  totalRows: number;
  successfulRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
  skippedRows: number;
  processingTimeMs: number;
}

// Validation context
export interface ValidationContext {
  row: number;
  existingDestinations: Set<string>; // for duplicate checking
  validMoodTags: Set<MoodTag>;
  validCategories: Set<string>;
  validDistricts: Set<string>;
}

// CSV processing state
export interface CSVProcessingState {
  status: 'idle' | 'parsing' | 'validating' | 'processing' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  errors: ImportError[];
  warnings: ImportWarning[];
}

// File upload props
export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileError: (error: string) => void;
  acceptedTypes: string[];
  maxSizeBytes: number;
  disabled?: boolean;
}

// Import preview props
export interface ImportPreviewProps {
  result: ImportResult;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onRetry: () => void;
  isProcessing: boolean;
}

// Admin page state
export interface AdminImportState {
  file: File | null;
  importResult: ImportResult | null;
  processingState: CSVProcessingState;
  previewMode: boolean;
  showAdvancedOptions: boolean;
  importOptions: ImportOptions;
}

// Export interfaces
export interface ExportOptions {
  format: 'csv' | 'json';
  includeInactive: boolean;
  selectedFields?: string[];
  filters?: DestinationFilters;
}

export interface DestinationFilters {
  category?: string;
  district?: string;
  budget_band?: BudgetBand;
  mood_tags?: MoodTag[];
  is_active?: boolean;
}

export interface ExportResult {
  filename: string;
  url: string;
  count: number;
  generatedAt: Date;
}

// Analytics events for import tracking
export interface ImportAnalyticsEvent {
  event: 'csv_upload_initiated' | 'csv_validation_completed' | 'destinations_imported' | 'import_errors_reported' | 'export_completed';
  sessionId: string;
  importId?: string;
  filename?: string;
  totalRows?: number;
  successfulRows?: number;
  errorCount?: number;
  processingTimeMs?: number;
  timestamp: Date;
}

// Constants for validation
export const VALID_MOOD_TAGS: MoodTag[] = ['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic'];

export const VALID_BUDGET_BANDS: BudgetBand[] = ['<500', '500-1000', '1000-2000', '2000+'];

export const VALID_TRANSPORT_ACCESS: TransportAccess[] = ['bts_mrt', 'taxi', 'walk', 'mixed'];

export const BANGKOK_COORDINATES = {
  LAT_MIN: 13.0,
  LAT_MAX: 14.0,
  LNG_MIN: 100.0,
  LNG_MAX: 101.0,
} as const;

export const CSV_CONSTRAINTS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_ROWS: 1000,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_NAME_LENGTH: 100,
  MAX_CATEGORY_LENGTH: 50,
  MAX_DISTRICT_LENGTH: 50,
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  BATCH_SIZE: 100,
} as const;

// Utility type for CSV header mapping
export type CSVHeaderMap = {
  [K in keyof DestinationCSV]: string;
};

// Default CSV headers (for export)
export const DEFAULT_CSV_HEADERS: CSVHeaderMap = {
  name_th: 'name_th',
  name_en: 'name_en',
  description_th: 'description_th',
  description_en: 'description_en',
  category: 'category',
  budget_band: 'budget_band',
  district: 'district',
  lat: 'lat',
  lng: 'lng',
  mood_tags: 'mood_tags',
  image_url: 'image_url',
  instagram_score: 'instagram_score',
  opening_hours: 'opening_hours',
  transport_access: 'transport_access',
  is_active: 'is_active',
};

// Error codes for consistent error handling
export const IMPORT_ERROR_CODES = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_CSV_FORMAT: 'INVALID_CSV_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',
  DUPLICATE_DESTINATION: 'DUPLICATE_DESTINATION',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_IMAGE_URL: 'INVALID_IMAGE_URL',
  INVALID_MOOD_TAGS: 'INVALID_MOOD_TAGS',
  INVALID_OPENING_HOURS: 'INVALID_OPENING_HOURS',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ImportErrorCode = typeof IMPORT_ERROR_CODES[keyof typeof IMPORT_ERROR_CODES];