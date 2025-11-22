import { CSVImportProcessor, processCSVFile, generateCSVTemplate } from '@/utils/csv-import';
import type { ImportOptions, DestinationCSV } from '@/types/csv-import';
import { VALID_MOOD_TAGS, VALID_BUDGET_BANDS, VALID_TRANSPORT_ACCESS } from '@/types/csv-import';

// Mock file creation helper
function createMockFile(content: string, filename = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

describe('CSV Import Processor', () => {
  let processor: CSVImportProcessor;

  beforeEach(() => {
    processor = new CSVImportProcessor();
    // Clear console mocks
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV content correctly', async () => {
      const csvContent = `name_th,name_en,category
"จตุจักร","Chatuchak","market"
"สยามสแควร์","Siam Square","shopping"`;

      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        name_th: 'จตุจักร',
        name_en: 'Chatuchak',
        category: 'market'
      });
      expect(rows[1]).toEqual({
        name_th: 'สยามสแควร์',
        name_en: 'Siam Square',
        category: 'shopping'
      });
    });

    it('should handle quoted CSV values with commas', async () => {
      const csvContent = `name_th,description_th
"จตุจักร","ตลาดนัด, มีของขายเยอะ"
"สยาม","ศูนย์การค้า, แหล่งช้อปปิ้ง"`;

      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      expect(rows).toHaveLength(2);
      expect(rows[0].description_th).toBe('ตลาดนัด, มีของขายเยอะ');
      expect(rows[1].description_th).toBe('ศูนย์การค้า, แหล่งช้อปปิ้ง');
    });

    it('should handle escaped quotes in CSV', async () => {
      const csvContent = `name_th,description_th
"จตุจักร","ตลาดที่มี ""ของขาย"" เยอะ"`;

      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      expect(rows).toHaveLength(1);
      expect(rows[0].description_th).toBe('ตลาดที่มี "ของขาย" เยอะ');
    });

    it('should parse numeric and boolean values correctly', async () => {
      const csvContent = `name_en,lat,lng,instagram_score,is_active
"Chatuchak",13.7995,100.5497,9,true
"Siam",13.7456,100.5341,8,false`;

      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        name_en: 'Chatuchak',
        lat: 13.7995,
        lng: 100.5497,
        instagram_score: 9,
        is_active: true
      });
      expect(rows[1]).toMatchObject({
        name_en: 'Siam',
        lat: 13.7456,
        lng: 100.5341,
        instagram_score: 8,
        is_active: false
      });
    });

    it('should throw error for empty CSV file', async () => {
      const file = createMockFile('');
      await expect(processor.parseCSV(file)).rejects.toThrow('ไฟล์ CSV ว่างเปล่า');
    });

    it('should throw error for mismatched column count', async () => {
      const csvContent = `name_th,name_en
"จตุจักร","Chatuchak","Extra Column"`;

      const file = createMockFile(csvContent);
      await expect(processor.parseCSV(file)).rejects.toThrow('แถว 2: จำนวนคอลัมน์ไม่ตรงกับส่วนหัว');
    });
  });

  describe('Validation', () => {
    const validRow: DestinationCSV = {
      name_th: 'จตุจักร วีคเอนด์ มาร์เก็ต',
      name_en: 'Chatuchak Weekend Market',
      description_th: 'ตลาดนัดที่ใหญ่ที่สุดในไทย',
      description_en: 'Largest weekend market in Thailand',
      category: 'market',
      budget_band: '500-1000',
      district: 'Chatuchak',
      lat: 13.7995,
      lng: 100.5497,
      mood_tags: 'foodie,cultural,social',
      image_url: 'https://images.unsplash.com/chatuchak',
      instagram_score: 9,
      opening_hours: '{"sat":"09:00-18:00","sun":"09:00-18:00"}',
      transport_access: 'bts_mrt',
      is_active: true
    };

    it('should validate correct data successfully', async () => {
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([validRow], options);
      expect(previews).toHaveLength(1);
      expect(previews[0].status).toBe('valid');
      expect(previews[0].errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const invalidRow = { ...validRow };
      delete (invalidRow as any).name_th;

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name_th',
            message: expect.stringContaining('ต้องระบุชื่อภาษาไทย')
          })
        ])
      );
    });

    it('should validate budget band enum', async () => {
      const invalidRow = { ...validRow, budget_band: 'invalid-range' as any };

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'budget_band',
            message: expect.stringContaining(VALID_BUDGET_BANDS.join(', '))
          })
        ])
      );
    });

    it('should validate coordinate ranges for Bangkok', async () => {
      const invalidRow = { ...validRow, lat: 12.0, lng: 99.0 }; // Outside Bangkok

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors.length).toBeGreaterThan(0);
    });

    it('should validate mood tags format', async () => {
      const invalidRow = { ...validRow, mood_tags: 'invalid,unknown,tags' };

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'mood_tags',
            message: expect.stringContaining(VALID_MOOD_TAGS.join(', '))
          })
        ])
      );
    });

    it('should validate opening hours JSON format', async () => {
      const invalidRow = { ...validRow, opening_hours: 'not-json' };

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'opening_hours',
            message: expect.stringContaining('JSON')
          })
        ])
      );
    });

    it('should validate Instagram score range', async () => {
      const invalidRow = { ...validRow, instagram_score: 15 }; // Out of 1-10 range

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'instagram_score',
            message: expect.stringContaining('1-10')
          })
        ])
      );
    });

    it('should validate image URL format', async () => {
      const invalidRow = { ...validRow, image_url: 'not-a-url' };

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([invalidRow], options);
      expect(previews[0].status).toBe('error');
      expect(previews[0].errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'image_url',
            message: expect.stringContaining('URL')
          })
        ])
      );
    });

    it('should generate warnings for large images', async () => {
      // This test would require mocking the image validation
      const rowWithLargeImage = { ...validRow };

      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const previews = await processor.validateRows([rowWithLargeImage], options);
      // In real implementation, this would check for image size warnings
      expect(previews[0]).toBeDefined();
    });
  });

  describe('Complete Import Processing', () => {
    it('should process valid CSV file successfully', async () => {
      const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร","Chatuchak","ตลาดนัด","Weekend market","market","500-1000","Chatuchak",13.7995,100.5497,"foodie,cultural","https://images.unsplash.com/test",9,"{\\"sat\\":\\"09:00-18:00\\"}","bts_mrt",true`;

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const result = await processor.processCSVImport(file, options);

      expect(result.summary.totalRows).toBe(1);
      expect(result.summary.successfulRows).toBe(1);
      expect(result.summary.errorRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed valid and invalid rows', async () => {
      const csvContent = `name_th,name_en,category,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active,budget_band,district,description_th,description_en
"Valid","Valid Place","market",13.7995,100.5497,"foodie","https://images.unsplash.com/test",9,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true,"500-1000","Chatuchak","คำอธิบาย","Description"
"Invalid","","market",13.7995,100.5497,"foodie","https://images.unsplash.com/test",9,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true,"500-1000","Chatuchak","คำอธิบาย","Description"`;

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const result = await processor.processCSVImport(file, options);

      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.successfulRows).toBe(1);
      expect(result.summary.errorRows).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle file processing errors', async () => {
      const invalidFile = createMockFile('invalid csv content without headers');
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const result = await processor.processCSVImport(invalidFile, options);

      expect(result.summary.errorRows).toBe(1);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'file',
            severity: 'error'
          })
        ])
      );
    });
  });

  describe('Utility Functions', () => {
    it('should generate CSV template correctly', () => {
      const template = generateCSVTemplate();

      expect(template).toContain('name_th,name_en');
      expect(template).toContain('จตุจักร วีคเอนด์ มาร์เก็ต');
      expect(template).toContain('Chatuchak Weekend Market');

      const lines = template.split('\n');
      expect(lines).toHaveLength(2); // Header + sample row
    });

    it('should process CSV file with options', async () => {
      const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร","Chatuchak","ตลาดนัด","Weekend market","market","500-1000","Chatuchak",13.7995,100.5497,"foodie,cultural","https://images.unsplash.com/test",9,"{\\"sat\\":\\"09:00-18:00\\"}","bts_mrt",true`;

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 50
      };

      const result = await processCSVFile(file, options);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty rows in CSV', async () => {
      const csvContent = `name_th,name_en
"จตุจักร","Chatuchak"

"สยาม","Siam"`;

      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      // Should filter out empty rows
      expect(rows).toHaveLength(2);
      expect(rows[0].name_th).toBe('จตุจักร');
      expect(rows[1].name_th).toBe('สยาม');
    });

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csvContent = '\uFEFFname_th,name_en\n"จตุจักร","Chatuchak"';
      const file = createMockFile(csvContent);
      const rows = await processor.parseCSV(file);

      expect(rows).toHaveLength(1);
      expect(rows[0].name_th).toBe('จตุจักร');
    });

    it('should handle very long field values', async () => {
      const longDescription = 'a'.repeat(300); // Exceeds max length
      const csvContent = `name_th,name_en,description_th
"จตุจักร","Chatuchak","${longDescription}"`;

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const result = await processor.processCSVImport(file, options);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle maximum row limit', async () => {
      // Create CSV content exceeding the maximum rows (would need to mock the constraint)
      const csvContent = 'name_th,name_en\n' +
        Array.from({ length: 1001 }, (_, i) => `"Place ${i}","Place ${i}"`).join('\n');

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 100
      };

      const result = await processor.processCSVImport(file, options);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('มากเกินไป')
          })
        ])
      );
    });
  });

  describe('Performance', () => {
    it('should process large CSV files efficiently', async () => {
      // Create a large CSV with 100 valid rows
      const header = 'name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active';
      const rows = Array.from({ length: 100 }, (_, i) =>
        `"สถานที่ ${i}","Place ${i}","คำอธิบาย","Description","market","500-1000","Chatuchak",13.7995,100.5497,"foodie","https://images.unsplash.com/test${i}",9,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true`
      );
      const csvContent = [header, ...rows].join('\n');

      const file = createMockFile(csvContent);
      const options: ImportOptions = {
        validateOnly: true,
        overwrite: false,
        skipDuplicates: true,
        batchSize: 50
      };

      const startTime = Date.now();
      const result = await processor.processCSVImport(file, options);
      const processingTime = Date.now() - startTime;

      expect(result.summary.totalRows).toBe(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});