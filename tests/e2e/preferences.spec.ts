import { test, expect } from '@playwright/test';

test.describe('Preferences Page', () => {
  test.beforeEach(async ({ page }) => {
    // Start from landing page and navigate to preferences
    await page.goto('/');
    const ctaButton = page.getByTestId('cta');
    await ctaButton.click();
    await expect(page).toHaveURL('/prefs');
  });

  test('should display preferences form correctly', async ({ page }) => {
    // Check header
    await expect(page.getByRole('heading', { name: 'ตั้งค่าความต้องการ' })).toBeVisible();
    await expect(page.getByText('บอกเราว่าคุณต้องการอะไร')).toBeVisible();

    // Check back button
    const backButton = page.getByTestId('prefs-back');
    await expect(backButton).toBeVisible();

    // Check budget section
    await expect(page.getByText('💰 งบประมาณ')).toBeVisible();
    await expect(page.getByTestId('budget-low')).toBeVisible();
    await expect(page.getByTestId('budget-mid')).toBeVisible();
    await expect(page.getByTestId('budget-high')).toBeVisible();

    // Check mood section
    await expect(page.getByText('🎭 อารมณ์ (เลือกได้หลายอย่าง)')).toBeVisible();
    await expect(page.getByTestId('mood-chill')).toBeVisible();
    await expect(page.getByTestId('mood-adventure')).toBeVisible();
    await expect(page.getByTestId('mood-foodie')).toBeVisible();
    await expect(page.getByTestId('mood-cultural')).toBeVisible();
    await expect(page.getByTestId('mood-social')).toBeVisible();
    await expect(page.getByTestId('mood-romantic')).toBeVisible();

    // Check time section
    await expect(page.getByText('⏰ ช่วงเวลา')).toBeVisible();
    await expect(page.getByTestId('time-evening')).toBeVisible();
    await expect(page.getByTestId('time-halfday')).toBeVisible();
    await expect(page.getByTestId('time-fullday')).toBeVisible();

    // Check submit button (should be disabled initially)
    const submitButton = page.getByTestId('prefs-submit');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should fire preferences view analytics on page load', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor console logs
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Refresh the page to trigger the event again
    await page.reload();
    await page.waitForTimeout(200);

    // Verify preferences view event was fired
    const prefsViewLog = consoleLogs.find(log =>
      log.includes('prefs_view') &&
      log.includes('deviceType') &&
      log.includes('timestamp')
    );
    expect(prefsViewLog).toBeTruthy();
  });

  test('should handle budget selection', async ({ page }) => {
    // Initially no budget selected
    const midBudgetButton = page.getByTestId('budget-mid');
    await expect(midBudgetButton).not.toHaveClass(/border-indigo-500/);

    // Click mid budget
    await midBudgetButton.click();
    await expect(midBudgetButton).toHaveClass(/border-indigo-500/);

    // Switch to high budget
    const highBudgetButton = page.getByTestId('budget-high');
    await highBudgetButton.click();
    await expect(highBudgetButton).toHaveClass(/border-indigo-500/);
    await expect(midBudgetButton).not.toHaveClass(/border-indigo-500/);
  });

  test('should handle mood tag selection', async ({ page }) => {
    // Click multiple mood tags
    const chillButton = page.getByTestId('mood-chill');
    const foodieButton = page.getByTestId('mood-foodie');

    await chillButton.click();
    await expect(chillButton).toHaveClass(/border-indigo-500/);

    await foodieButton.click();
    await expect(foodieButton).toHaveClass(/border-indigo-500/);

    // Both should remain selected (multi-select)
    await expect(chillButton).toHaveClass(/border-indigo-500/);
    await expect(foodieButton).toHaveClass(/border-indigo-500/);

    // Deselect first mood
    await chillButton.click();
    await expect(chillButton).not.toHaveClass(/border-indigo-500/);
    await expect(foodieButton).toHaveClass(/border-indigo-500/);
  });

  test('should handle time window selection', async ({ page }) => {
    // Initially no time selected
    const halfdayButton = page.getByTestId('time-halfday');
    await expect(halfdayButton).not.toHaveClass(/border-indigo-500/);

    // Click halfday
    await halfdayButton.click();
    await expect(halfdayButton).toHaveClass(/border-indigo-500/);

    // Switch to fullday
    const fulldayButton = page.getByTestId('time-fullday');
    await fulldayButton.click();
    await expect(fulldayButton).toHaveClass(/border-indigo-500/);
    await expect(halfdayButton).not.toHaveClass(/border-indigo-500/);
  });

  test('should validate form completion', async ({ page }) => {
    const submitButton = page.getByTestId('prefs-submit');

    // Initially disabled
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText('กรุณาเลือกครบทุกหัวข้อ')).toBeVisible();

    // Select budget only - still disabled
    await page.getByTestId('budget-mid').click();
    await expect(submitButton).toBeDisabled();

    // Add mood - still disabled
    await page.getByTestId('mood-chill').click();
    await expect(submitButton).toBeDisabled();

    // Add time window - now enabled
    await page.getByTestId('time-halfday').click();
    await expect(submitButton).toBeEnabled();
    await expect(page.getByText('กรุณาเลือกครบทุกหัวข้อ')).not.toBeVisible();
  });

  test('should complete full flow: Landing → CTA → Prefs → Submit → /recs', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor console logs for analytics
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Fill out preferences form
    await page.getByTestId('budget-high').click(); // High budget
    await page.getByTestId('mood-chill').click(); // Chill mood
    await page.getByTestId('mood-foodie').click(); // Foodie mood
    await page.getByTestId('time-fullday').click(); // Full day

    // Submit form
    const submitButton = page.getByTestId('prefs-submit');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Should navigate to recommendations page
    await expect(page).toHaveURL('/recs');
    await expect(page.getByRole('heading', { name: 'สถานที่แนะนำ' })).toBeVisible();

    // Wait for analytics events
    await page.waitForTimeout(200);

    // Verify preferences submit event was fired
    const prefsSubmitLog = consoleLogs.find(log =>
      log.includes('prefs_submit') &&
      log.includes('high') &&
      log.includes('chill') &&
      log.includes('foodie') &&
      log.includes('fullday')
    );
    expect(prefsSubmitLog).toBeTruthy();
  });

  test('should persist preferences in localStorage', async ({ page }) => {
    // Fill out preferences
    await page.getByTestId('budget-mid').click();
    await page.getByTestId('mood-social').click();
    await page.getByTestId('time-halfday').click();

    // Navigate away and back
    await page.goBack(); // Go to landing
    await expect(page).toHaveURL('/');

    const ctaButton = page.getByTestId('cta');
    await ctaButton.click(); // Go back to prefs
    await expect(page).toHaveURL('/prefs');

    // Preferences should be restored
    await expect(page.getByTestId('budget-mid')).toHaveClass(/border-indigo-500/);
    await expect(page.getByTestId('mood-social')).toHaveClass(/border-indigo-500/);
    await expect(page.getByTestId('time-halfday')).toHaveClass(/border-indigo-500/);
  });

  test('should show loading state during submission', async ({ page }) => {
    // Fill out form
    await page.getByTestId('budget-low').click();
    await page.getByTestId('mood-adventure').click();
    await page.getByTestId('time-evening').click();

    // Intercept navigation to slow it down
    await page.route('/recs', route => {
      setTimeout(() => route.continue(), 500);
    });

    const submitButton = page.getByTestId('prefs-submit');
    await submitButton.click();

    // Should show loading state
    await expect(page.getByText('กำลังประมวลผล...')).toBeVisible();
    await expect(submitButton).toBeDisabled();

    // Eventually should navigate
    await expect(page).toHaveURL('/recs');
  });

  test('should have proper mobile touch targets', async ({ page }) => {
    // Check that all interactive elements meet minimum touch target size (44px)
    const budgetButtons = page.locator('[style*="minHeight: 44px"]');
    const moodButtons = page.locator('[style*="minHeight: 44px"]');
    const timeButtons = page.locator('[style*="minHeight: 44px"]');
    const submitButton = page.getByTestId('prefs-submit');

    // Check some budget buttons
    const budgetCount = await budgetButtons.count();
    expect(budgetCount).toBeGreaterThan(0);

    // Check back button dimensions
    const backButton = page.getByTestId('prefs-back');
    const backButtonBox = await backButton.boundingBox();
    expect(backButtonBox?.height).toBeGreaterThanOrEqual(44);
    expect(backButtonBox?.width).toBeGreaterThanOrEqual(44);

    // Check submit button dimensions
    const submitButtonBox = await submitButton.boundingBox();
    expect(submitButtonBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle back button navigation', async ({ page }) => {
    // Click back button
    const backButton = page.getByTestId('prefs-back');
    await backButton.click();

    // Should go back to landing page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();
  });
});