import { test, expect, Page } from '@playwright/test';

test.describe('Feedback Form E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Navigate to feedback page with sample session data
    const feedbackUrl = '/feedback?' + new URLSearchParams({
      sessionId: 'e2e-session-123',
      validationSessionId: 'e2e-validation-456',
      totalDuration: '180000', // 3 minutes
      preferencesPhase: '30000',
      swipingPhase: '120000',
      reviewPhase: '30000',
    }).toString();

    await page.goto(feedbackUrl);
  });

  test('displays feedback form with correct session data', async () => {
    // Check form header
    await expect(page.getByText('แบ่งปันประสบการณ์ของคุณ')).toBeVisible();
    await expect(page.getByText('ช่วยเราปรับปรุงบริการให้ดีขึ้น')).toBeVisible();

    // Check progress indicator shows 4 steps
    const stepIndicators = page.locator('[class*="rounded-full"]').filter({ hasText: /^[1-4]$/ });
    await expect(stepIndicators).toHaveCount(4);

    // Check initial step content
    await expect(page.getByText('ความพอใจ')).toBeVisible();
    await expect(page.getByText('ให้คะแนนประสบการณ์ของคุณ')).toBeVisible();
  });

  test('completes full feedback flow successfully', async () => {
    // Step 1: Satisfaction Rating
    await expect(page.getByText('คุณพอใจกับประสบการณ์นี้แค่ไหน?')).toBeVisible();

    // Click 4th star
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();

    // Verify rating display
    await expect(page.getByText('ดี')).toBeVisible();
    await expect(page.getByText('4 จาก 5 ดาว')).toBeVisible();

    // Navigate to step 2
    await page.getByText('ถัดไป →').click();

    // Step 2: Duration Perception
    await expect(page.getByText('การตัดสินใจใช้เวลานานแค่ไหน?')).toBeVisible();
    await expect(page.getByText('เวลาที่ใช้จริง: 3 นาที 0 วินาที')).toBeVisible();

    // Select "faster" option
    await page.getByText('เร็วกว่าที่คิด').click();

    // Navigate to step 3
    await page.getByText('ถัดไป →').click();

    // Step 3: Recommendation
    await expect(page.getByText('คุณจะแนะนำให้เพื่อนใช้บริการนี้ไหม?')).toBeVisible();

    // Select recommend
    await page.getByText('แนะนำ').first().click();

    // Verify confirmation message
    await expect(page.getByText('🎉 ขอบคุณ! การแนะนำของคุณมีความหมายกับเรา')).toBeVisible();

    // Navigate to step 4
    await page.getByText('ถัดไป →').click();

    // Step 4: Comments
    await expect(page.getByText('มีความคิดเห็นเพิ่มเติมไหม?')).toBeVisible();

    // Add optional comments
    const commentTextarea = page.getByRole('textbox');
    await commentTextarea.fill('Great experience, very intuitive interface!');

    // Verify character count
    await expect(page.getByText('45/1000 ตัวอักษร')).toBeVisible();

    // Submit feedback
    await page.getByText('ส่งความคิดเห็น').click();

    // Verify success page
    await expect(page.getByText('ขอบคุณสำหรับความคิดเห็น! 🎉')).toBeVisible();
    await expect(page.getByText('ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการให้ดีขึ้น')).toBeVisible();

    // Check validation results
    await expect(page.getByText('ผลการประเมิน')).toBeVisible();
    await expect(page.getByText('✅ บรรลุ')).toBeVisible(); // Target met
    await expect(page.getByText('👍 ดี')).toBeVisible(); // Satisfaction level
  });

  test('validates required fields and shows error messages', async () => {
    // Try to navigate without selecting satisfaction
    await page.getByText('ถัดไป →').click();

    // Should show validation error
    await expect(page.getByText('กรุณาให้คะแนนความพอใจ')).toBeVisible();

    // Should remain on step 1
    await expect(page.getByText('ความพอใจ')).toBeVisible();

    // Select satisfaction and move to step 2
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(2).click();
    await page.getByText('ถัดไป →').click();

    // Try to navigate from step 2 without selecting duration
    await page.getByText('ถัดไป →').click();

    // Should show validation error
    await expect(page.getByText('กรุณาเลือกระยะเวลาที่รู้สึก')).toBeVisible();
  });

  test('allows navigation backwards through steps', async () => {
    // Complete step 1
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();
    await page.getByText('ถัดไป →').click();

    // Complete step 2
    await page.getByText('เร็วกว่าที่คิด').click();
    await page.getByText('ถัดไป →').click();

    // Now on step 3 - go back to step 2
    await page.getByText('← ย้อนกลับ').click();
    await expect(page.getByText('ระยะเวลา')).toBeVisible();

    // Go back to step 1
    await page.getByText('← ย้อนกลับ').click();
    await expect(page.getByText('ความพอใจ')).toBeVisible();

    // Verify the selected value is preserved
    await expect(page.getByText('ดี')).toBeVisible();
  });

  test('handles skip functionality', async () => {
    // Click skip button
    await page.getByText('ข้าม').click();

    // Should redirect (in this case, we'll check for navigation)
    // In a real app, this would redirect to home page
    await page.waitForURL(/^(?!.*feedback).*/);
  });

  test('shows progress indicator correctly', async () => {
    // Step 1 - first indicator should be highlighted
    const step1Indicator = page.locator('[class*="rounded-full"]').filter({ hasText: '1' });
    await expect(step1Indicator).toHaveClass(/bg-blue-500/);

    // Complete step 1 and move to step 2
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();
    await page.getByText('ถัดไป →').click();

    // Step 1 should show as complete (green), step 2 should be active (blue)
    await expect(step1Indicator).toHaveClass(/bg-green-500/);

    const step2Indicator = page.locator('[class*="rounded-full"]').filter({ hasText: '2' });
    await expect(step2Indicator).toHaveClass(/bg-blue-500/);
  });

  test('handles character limit in comments', async () => {
    // Navigate to comments step
    await navigateToCommentsStep(page);

    // Try to enter text exceeding limit
    const commentTextarea = page.getByRole('textbox');
    const longText = 'a'.repeat(1001);
    await commentTextarea.fill(longText);

    // Should be truncated to 1000 characters
    const textareaContent = await commentTextarea.inputValue();
    expect(textareaContent.length).toBe(1000);

    // Character count should show limit
    await expect(page.getByText('1000/1000 ตัวอักษร')).toBeVisible();
  });

  test('displays session duration correctly', async () => {
    // Navigate to duration step
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();
    await page.getByText('ถัดไป →').click();

    // Should show formatted duration
    await expect(page.getByText('เวลาที่ใช้จริง: 3 นาที 0 วินาที')).toBeVisible();
  });

  test('handles loading states correctly', async () => {
    // Navigate to final step
    await navigateToCommentsStep(page);

    // Start submission (this will fail due to API not being available in E2E)
    await page.getByText('ส่งความคิดเห็น').click();

    // Should show loading state
    await expect(page.getByText('กำลังส่ง...')).toBeVisible();

    // All buttons should be disabled during loading
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    for (let i = 0; i < buttonCount; i++) {
      await expect(buttons.nth(i)).toBeDisabled();
    }
  });

  test('shows correct rating text for different satisfaction levels', async () => {
    const ratingTests = [
      { star: 0, text: 'แย่มาก' },
      { star: 1, text: 'แย่' },
      { star: 2, text: 'ปานกลาง' },
      { star: 3, text: 'ดี' },
      { star: 4, text: 'ดีเยี่ยม' },
    ];

    for (const test of ratingTests) {
      // Reset to step 1
      await page.reload();

      // Click the star
      const stars = page.getByRole('button', { name: /Rate \d+ star/ });
      await stars.nth(test.star).click();

      // Verify the text appears
      await expect(page.getByText(test.text)).toBeVisible();
    }
  });

  test('shows all duration options with correct emojis', async () => {
    // Navigate to duration step
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();
    await page.getByText('ถัดไป →').click();

    // Check all duration options are present
    const expectedOptions = [
      { text: 'เร็วมากกว่าที่คิด', emoji: '⚡' },
      { text: 'เร็วกว่าที่คิด', emoji: '🚀' },
      { text: 'ตามที่คิดไว้', emoji: '⏰' },
      { text: 'ช้ากว่าที่คิด', emoji: '🐌' },
      { text: 'ช้ามากกว่าที่คิด', emoji: '⏳' },
    ];

    for (const option of expectedOptions) {
      await expect(page.getByText(option.text)).toBeVisible();
      await expect(page.getByText(option.emoji)).toBeVisible();
    }
  });

  test('handles error states gracefully', async () => {
    // Navigate with invalid session data
    await page.goto('/feedback?sessionId=invalid');

    // Should show error message
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('ไม่พบข้อมูลเซสชั่น กรุณาเริ่มต้นใหม่')).toBeVisible();

    // Should have return home button
    await expect(page.getByText('กลับหน้าหลัก')).toBeVisible();
  });

  // Helper function to navigate to comments step
  async function navigateToCommentsStep(page: Page) {
    // Step 1: Satisfaction
    const stars = page.getByRole('button', { name: /Rate \d+ star/ });
    await stars.nth(3).click();
    await page.getByText('ถัดไป →').click();

    // Step 2: Duration
    await page.getByText('เร็วกว่าที่คิด').click();
    await page.getByText('ถัดไป →').click();

    // Step 3: Recommendation
    await page.getByText('แนะนำ').first().click();
    await page.getByText('ถัดไป →').click();

    // Now on step 4: Comments
    await expect(page.getByText('ความคิดเห็น')).toBeVisible();
  }
});