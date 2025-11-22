import { test, expect, Page } from '@playwright/test';

test.describe('Admin CSV Import E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/admin/destinations/import');
  });

  test('displays import page with all required elements', async () => {
    // Check page header
    await expect(page.getByText('นำเข้าข้อมูลสถานที่ท่องเที่ยว')).toBeVisible();
    await expect(page.getByText('อัปโหลดไฟล์ CSV เพื่อนำเข้าข้อมูลสถานที่ท่องเที่ยวใหม่')).toBeVisible();

    // Check quick actions
    await expect(page.getByText('ดาวน์โหลดเทมเพลต')).toBeVisible();
    await expect(page.getByText('ตัวเลือกขั้นสูง')).toBeVisible();

    // Check file dropzone
    await expect(page.getByText('อัปโหลดไฟล์ CSV')).toBeVisible();
    await expect(page.getByText('ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์')).toBeVisible();

    // Check help section
    await expect(page.getByText('คำแนะนำการใช้งาน')).toBeVisible();
  });

  test('downloads CSV template when clicked', async () => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Click download template button
    await page.getByText('ดาวน์โหลดเทมเพลต').click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download properties
    expect(download.suggestedFilename()).toBe('destinations_template.csv');
  });

  test('shows and hides advanced options', async () => {
    // Initially advanced options should be hidden
    await expect(page.getByText('ตัวเลือกการนำเข้า')).not.toBeVisible();

    // Click to show advanced options
    await page.getByText('ตัวเลือกขั้นสูง').click();

    // Advanced options should now be visible
    await expect(page.getByText('ตัวเลือกการนำเข้า')).toBeVisible();
    await expect(page.getByText('เขียนทับข้อมูลที่มีอยู่')).toBeVisible();
    await expect(page.getByText('ข้ามข้อมูลซ้ำ')).toBeVisible();
    await expect(page.getByText('ขนาด Batch')).toBeVisible();

    // Click again to hide
    await page.getByText('ตัวเลือกขั้นสูง').click();

    // Should be hidden again
    await expect(page.getByText('ตัวเลือกการนำเข้า')).not.toBeVisible();
  });

  test('handles valid CSV file upload', async () => {
    // Create a valid CSV content
    const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร วีคเอนด์ มาร์เก็ต","Chatuchak Weekend Market","ตลาดนัดที่ใหญ่ที่สุดในไทย","Largest weekend market in Thailand","market","500-1000","Chatuchak",13.7995,100.5497,"foodie,cultural,social","https://images.unsplash.com/chatuchak",9,"{\\"sat\\":\\"09:00-18:00\\",\\"sun\\":\\"09:00-18:00\\"}","bts_mrt",true
"สยามสแควร์","Siam Square","ศูนย์การค้าและแหล่งช้อปปิ้ง","Shopping and entertainment center","shopping","1000-2000","Pathum Wan",13.7456,100.5341,"social,cultural","https://images.unsplash.com/siam",8,"{\\"daily\\":\\"10:00-22:00\\"}","bts_mrt",true`;

    // Create a file handle for the CSV
    await page.setInputFiles('input[type="file"]', {
      name: 'destinations.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    // Wait for processing to complete
    await expect(page.getByText('กำลังประมวลผล')).toBeVisible();
    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Check that import preview is shown
    await expect(page.getByText('ตรวจสอบข้อมูลก่อนนำเข้า')).toBeVisible();

    // Check summary cards
    await expect(page.getByText('ทั้งหมด')).toBeVisible();
    await expect(page.getByText('ถูกต้อง')).toBeVisible();
    await expect(page.getByText('ข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('คำเตือน')).toBeVisible();

    // Check that data appears in preview table
    await expect(page.getByText('จตุจักร วีคเอนด์ มาร์เก็ต')).toBeVisible();
    await expect(page.getByText('Chatuchak Weekend Market')).toBeVisible();
    await expect(page.getByText('สยามสแควร์')).toBeVisible();
    await expect(page.getByText('Siam Square')).toBeVisible();

    // Check confirm button is enabled
    const confirmButton = page.getByText('ยืนยันนำเข้า');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeEnabled();
  });

  test('handles invalid CSV file upload', async () => {
    // Create invalid CSV content (missing required fields)
    const invalidCsvContent = `name_th,name_en
"จตุจักร",
"สยาม","Siam"`;

    await page.setInputFiles('input[type="file"]', {
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsvContent, 'utf-8')
    });

    // Wait for processing
    await expect(page.getByText('กำลังประมวลผล')).toBeVisible();
    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Should show import preview with errors
    await expect(page.getByText('ตรวจสอบข้อมูลก่อนนำเข้า')).toBeVisible();

    // Click on errors tab
    await page.getByText('ข้อผิดพลาด').click();

    // Should show error details
    await expect(page.getByText('ต้องระบุชื่อภาษาอังกฤษ')).toBeVisible();

    // Confirm button should be disabled
    const confirmButton = page.getByText('ยืนยันนำเข้า');
    await expect(confirmButton).toBeDisabled();
  });

  test('handles file type validation', async () => {
    // Try to upload a non-CSV file
    const textContent = 'This is not a CSV file';

    await page.setInputFiles('input[type="file"]', {
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(textContent, 'utf-8')
    });

    // Should show error message
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('ไฟล์ต้องเป็นนามสกุล .csv เท่านั้น')).toBeVisible();
  });

  test('handles large file validation', async () => {
    // Create a large CSV content (simulate oversized file)
    const largeContent = 'name_th,name_en\n' +
      Array.from({ length: 1000 }, (_, i) => `"สถานที่ ${i}","Place ${i}"`).join('\n');

    await page.setInputFiles('input[type="file"]', {
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeContent, 'utf-8')
    });

    // Wait for processing (might show size warning depending on implementation)
    await page.waitForTimeout(2000);

    // Check if processing completes or shows size warning
    const hasError = await page.getByText('เกิดข้อผิดพลาด').isVisible();
    const hasProcessing = await page.getByText('กำลังประมวลผล').isVisible();

    expect(hasError || hasProcessing).toBe(true);
  });

  test('navigates through import preview tabs', async () => {
    // First upload a valid file with some warnings
    const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร","Chatuchak","ตลาดนัด","Market","market","500-1000","Chatuchak",13.7995,100.5497,"foodie","https://images.unsplash.com/test",2,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true`;

    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Test tab navigation
    const tabs = ['ตัวอย่างข้อมูล', 'ข้อผิดพลาด', 'คำเตือน', 'ข้อมูลซ้ำ'];

    for (const tab of tabs) {
      await page.getByText(tab).click();

      // Verify tab is active (would have different styling)
      const tabElement = page.getByText(tab);
      await expect(tabElement).toBeVisible();
    }

    // Go back to preview tab
    await page.getByText('ตัวอย่างข้อมูล').click();
    await expect(page.getByText('จตุจักร')).toBeVisible();
  });

  test('shows row details when expanded', async () => {
    const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร","Chatuchak","ตลาดนัด","Market","market","500-1000","Chatuchak",13.7995,100.5497,"foodie,cultural","https://images.unsplash.com/test",9,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true`;

    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Click details button for first row
    await page.getByText('รายละเอียด').first().click();

    // Should show additional details
    await expect(page.getByText('ละติจูด:')).toBeVisible();
    await expect(page.getByText('ลองจิจูด:')).toBeVisible();
    await expect(page.getByText('คะแนน IG:')).toBeVisible();

    // Click to hide details
    await page.getByText('ซ่อน').first().click();

    // Details should be hidden
    await expect(page.getByText('ละติจูด:')).not.toBeVisible();
  });

  test('completes full import workflow', async () => {
    const csvContent = `name_th,name_en,description_th,description_en,category,budget_band,district,lat,lng,mood_tags,image_url,instagram_score,opening_hours,transport_access,is_active
"จตุจักร","Chatuchak","ตลาดนัด","Market","market","500-1000","Chatuchak",13.7995,100.5497,"foodie","https://images.unsplash.com/test",9,"{\\"daily\\":\\"09:00-18:00\\"}","bts_mrt",true`;

    // Step 1: Upload file
    await page.setInputFiles('input[type="file"]', {
      name: 'destinations.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    // Step 2: Wait for validation
    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Step 3: Review and confirm
    await expect(page.getByText('พร้อมนำเข้า 1 รายการ')).toBeVisible();

    const confirmButton = page.getByText('ยืนยันนำเข้า');
    await expect(confirmButton).toBeEnabled();

    // Step 4: Confirm import
    await confirmButton.click();

    // Step 5: Wait for import completion
    await expect(page.getByText('กำลังนำเข้า...')).toBeVisible();
    await expect(page.getByText('นำเข้าเสร็จสิ้น 1 รายการ')).toBeVisible({ timeout: 10000 });
  });

  test('handles cancel and retry operations', async () => {
    const csvContent = `name_th,name_en,category
"จตุจักร","Chatuchak","market"`;

    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Test cancel
    await page.getByText('ยกเลิก').click();

    // Should return to upload state
    await expect(page.getByText('อัปโหลดไฟล์ CSV')).toBeVisible();
    await expect(page.getByText('ตรวจสอบข้อมูลก่อนนำเข้า')).not.toBeVisible();

    // Upload again for retry test
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent, 'utf-8')
    });

    await expect(page.getByText('เสร็จสิ้น')).toBeVisible({ timeout: 10000 });

    // Test retry
    await page.getByText('ลองใหม่').click();

    // Should re-process the same file
    await expect(page.getByText('กำลังประมวลผล')).toBeVisible();
  });

  test('shows appropriate error states', async () => {
    // Test empty file
    await page.setInputFiles('input[type="file"]', {
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('', 'utf-8')
    });

    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('ไฟล์ว่างเปล่า')).toBeVisible();

    // Test malformed CSV
    const malformedCsv = 'name_th,name_en\n"unclosed quote,"value"';

    await page.setInputFiles('input[type="file"]', {
      name: 'malformed.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(malformedCsv, 'utf-8')
    });

    // Should handle parsing error gracefully
    await page.waitForTimeout(2000);
    const hasError = await page.getByText('เกิดข้อผิดพลาด').isVisible();
    expect(hasError).toBe(true);
  });

  test('validates advanced options functionality', async () => {
    // Show advanced options
    await page.getByText('ตัวเลือกขั้นสูง').click();

    // Test checkbox interactions
    const overwriteCheckbox = page.getByText('เขียนทับข้อมูลที่มีอยู่').locator('input');
    const skipDuplicatesCheckbox = page.getByText('ข้ามข้อมูลซ้ำ').locator('input');

    await expect(overwriteCheckbox).not.toBeChecked();
    await expect(skipDuplicatesCheckbox).toBeChecked();

    // Toggle options
    await overwriteCheckbox.check();
    await skipDuplicatesCheckbox.uncheck();

    await expect(overwriteCheckbox).toBeChecked();
    await expect(skipDuplicatesCheckbox).not.toBeChecked();

    // Test batch size selection
    const batchSizeSelect = page.getByText('ขนาด Batch').locator('..').getByRole('combobox');
    await batchSizeSelect.selectOption('200');

    await expect(batchSizeSelect).toHaveValue('200');
  });
});