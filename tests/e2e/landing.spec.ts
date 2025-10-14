import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main elements correctly', async ({ page }) => {
    // Check title and meta
    await expect(page).toHaveTitle(/NextSpot/);

    // Check header
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();
    await expect(page.getByText('ค้นหาสถานที่ที่ใช่สำหรับคุณ')).toBeVisible();

    // Check main value proposition
    await expect(page.getByRole('heading', { name: /ค้นหาสถานที่ที่สมบูรณ์แบบ/ })).toBeVisible();
    await expect(page.getByText('Find your perfect spot in under 5 minutes by swiping')).toBeVisible();

    // Check gesture preview section
    await expect(page.getByText('สไลด์ขวา = ชอบ • สไลด์ซ้าย = ไม่สนใจ')).toBeVisible();

    // Check how it works section
    await expect(page.getByRole('heading', { name: 'วิธีใช้งาน 3 ขั้นตอนง่าย ๆ' })).toBeVisible();
    await expect(page.getByText('ตั้งค่าความต้องการ')).toBeVisible();
    await expect(page.getByText('สไลด์เลือกสถานที่')).toBeVisible();
    await expect(page.getByText('รับรายการสถานที่')).toBeVisible();

    // Check CTA button
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toBeEnabled();

    // Check footer
    await expect(page.getByText('Made for Thai university students ❤️')).toBeVisible();
  });

  test('should have proper mobile viewport and responsive design', async ({ page }) => {
    // Verify viewport size matches mobile baseline (390x844)
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(390);
    expect(viewportSize?.height).toBe(844);

    // Check that text is readable and elements are properly sized
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    const buttonBox = await ctaButton.boundingBox();

    // Ensure button meets minimum touch target size (44px)
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
  });

  test('should navigate to preferences page on CTA click', async ({ page }) => {
    // Setup console monitoring to verify analytics event
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Click CTA button
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    await ctaButton.click();

    // Verify navigation to preferences page
    await expect(page).toHaveURL('/prefs');
    await expect(page.getByRole('heading', { name: 'ตั้งค่าความต้องการ' })).toBeVisible();

    // Wait for any potential navigation or analytics events
    await page.waitForTimeout(100);

    // Verify analytics event was fired (in development mode)
    const ctaClickLog = consoleLogs.find(log =>
      log.includes('cta_click') &&
      log.includes('เริ่มต้นเลือกสถานที่') &&
      log.includes('/prefs')
    );
    expect(ctaClickLog).toBeTruthy();
  });

  test('should fire landing page view analytics on load', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor console logs before page load
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Navigate to page (this will trigger the analytics event)
    await page.goto('/');

    // Wait for page to fully load and analytics to fire
    await page.waitForLoadState('networkidle');

    // Verify landing page view event was fired
    const landingViewLog = consoleLogs.find(log =>
      log.includes('landing_page_view') &&
      log.includes('deviceType') &&
      log.includes('timestamp')
    );
    expect(landingViewLog).toBeTruthy();
  });

  test('should have fast load time and good performance', async ({ page }) => {
    const startTime = Date.now();

    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that main content is visible (indicating page is interactive)
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();
    await expect(page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ })).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Performance target: < 3 seconds Time to Interactive
    // This is a rough approximation - in real monitoring we'd use Performance API
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle back navigation from preferences page', async ({ page }) => {
    // Go to preferences page first
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    await ctaButton.click();

    await expect(page).toHaveURL('/prefs');

    // Click back button on preferences page (arrow button in header)
    const backButton = page.locator('button').first(); // First button should be the back arrow
    await backButton.click();

    // Should be back to landing page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();
  });

  test('should complete full user journey: Landing → CTA → Prefs → Submit → Recs', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor all analytics events
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // 1. Start on landing page (landing_page_view fired automatically)
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();

    // 2. Click CTA button (fires cta_click)
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    await ctaButton.click();

    // 3. Navigate to prefs page (fires prefs_view)
    await expect(page).toHaveURL('/prefs');
    await expect(page.getByRole('heading', { name: 'ตั้งค่าความต้องการ' })).toBeVisible();

    // 4. Fill out preferences form
    await page.getByText('ปานกลาง').locator('..').locator('..').click(); // Budget
    await page.getByText('ชิลๆ').locator('..').click(); // Mood
    await page.getByText('กิน').locator('..').click(); // Another mood
    await page.getByText('ครึ่งวัน').locator('..').locator('..').click(); // Time

    // 5. Submit preferences (fires prefs_submit)
    const submitButton = page.getByRole('button', { name: /ดูสถานที่แนะนำ/ });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 6. Navigate to recommendations page
    await expect(page).toHaveURL('/recs');
    await expect(page.getByRole('heading', { name: 'สถานที่แนะนำ' })).toBeVisible();

    // Verify expected placeholder content on recs page
    await expect(page.getByText('ขอบคุณสำหรับความต้องการ!')).toBeVisible();
    await expect(page.getByText('เรากำลังเตรียมสถานที่แนะนำสำหรับคุณ')).toBeVisible();

    // Wait for all analytics events to be logged
    await page.waitForTimeout(300);

    // Verify all analytics events were fired in the correct sequence
    const landingViewLog = consoleLogs.find(log => log.includes('landing_page_view'));
    expect(landingViewLog).toBeTruthy();

    const ctaClickLog = consoleLogs.find(log =>
      log.includes('cta_click') && log.includes('/prefs')
    );
    expect(ctaClickLog).toBeTruthy();

    const prefsViewLog = consoleLogs.find(log => log.includes('prefs_view'));
    expect(prefsViewLog).toBeTruthy();

    const prefsSubmitLog = consoleLogs.find(log =>
      log.includes('prefs_submit') &&
      log.includes('mid') &&
      log.includes('chill') &&
      log.includes('foodie') &&
      log.includes('halfday')
    );
    expect(prefsSubmitLog).toBeTruthy();
  });

  test('should have proper accessibility features', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1.first()).toBeVisible();

    // Check that interactive elements are keyboard accessible
    const ctaButton = page.getByRole('button', { name: /เริ่มต้นเลือกสถานที่/ });
    await ctaButton.focus();

    // Verify the button is focused
    await expect(ctaButton).toBeFocused();

    // Test keyboard navigation
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/prefs');
  });
});