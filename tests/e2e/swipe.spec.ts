import { test, expect } from '@playwright/test';

test.describe('Swipe Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through the complete flow to get to swipe page
    await page.goto('/');

    // Click CTA to go to preferences
    const ctaButton = page.getByTestId('cta');
    await ctaButton.click();
    await expect(page).toHaveURL('/prefs');

    // Fill out preferences to enable navigation to swipe
    await page.getByTestId('budget-mid').click();
    await page.getByTestId('mood-chill').click();
    await page.getByTestId('time-halfday').click();

    // Submit to go to swipe page
    const submitButton = page.getByTestId('prefs-submit');
    await submitButton.click();
    await expect(page).toHaveURL('/swipe');
  });

  test('should display swipe interface correctly', async ({ page }) => {
    // Check header elements
    await expect(page.getByRole('heading', { name: 'เลือกสถานที่ที่ชอบ' })).toBeVisible();

    // Check back button exists
    const backButton = page.locator('button').first();
    await expect(backButton).toBeVisible();

    // Check liked destinations button (heart icon)
    const likedButton = page.locator('button').filter({ hasText: '❤️' });
    await expect(likedButton).toBeVisible();

    // Should show loading state initially
    await expect(page.getByText('กำลังค้นหาสถานที่...')).toBeVisible();
  });

  test('should handle loading state and show error for missing session', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Should show error state since no session exists
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('Session not found. Please start from the beginning.')).toBeVisible();

    // Should have a button to go back to preferences
    const backToPrefsButton = page.getByText('กลับไปตั้งค่าความต้องการ');
    await expect(backToPrefsButton).toBeVisible();

    // Test navigation back to preferences
    await backToPrefsButton.click();
    await expect(page).toHaveURL('/prefs');
  });

  test('should handle back button navigation', async ({ page }) => {
    // Click back button (first button in header)
    const backButton = page.locator('button').first();
    await backButton.click();

    // Should navigate back to preferences
    await expect(page).toHaveURL('/prefs');
  });

  test('should handle liked destinations button', async ({ page }) => {
    // Click liked destinations button
    const likedButton = page.locator('button').filter({ hasText: '❤️' });
    await likedButton.click();

    // Since we haven't liked anything yet, should show empty state
    // The button click should work (no errors), but the modal behavior depends on state
  });

  test('should display mobile-optimized interface', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Check that interface adapts to mobile
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check touch target sizes (minimum 44px)
    const backButton = page.locator('button').first();
    const backButtonBox = await backButton.boundingBox();
    expect(backButtonBox?.height).toBeGreaterThanOrEqual(44);
    expect(backButtonBox?.width).toBeGreaterThanOrEqual(44);

    const likedButton = page.locator('button').filter({ hasText: '❤️' });
    const likedButtonBox = await likedButton.boundingBox();
    expect(likedButtonBox?.height).toBeGreaterThanOrEqual(44);
    expect(likedButtonBox?.width).toBeGreaterThanOrEqual(44);
  });

  test('should show fast mode banner when appropriate', async ({ page }) => {
    // Mock API response with fast mode
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '1',
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: true,
          request_id: 'test-request'
        })
      });
    });

    // Set up session cookie to trigger API call
    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    // Reload page to trigger API call
    await page.reload();

    // Wait for API response
    await page.waitForTimeout(1000);

    // Should show fast mode banner
    await expect(page.getByText('⚡ Fast Mode: showing popular places near you')).toBeVisible();
  });

  test('should handle successful recommendations loading', async ({ page }) => {
    const mockDestinations = [
      {
        id: '1',
        nameTh: 'วัดพระแก้ว',
        nameEn: 'Temple of the Emerald Buddha',
        descTh: 'วัดที่สำคัญที่สุดในประเทศไทย ตั้งอยู่ในพระบรมมหาราชวัง',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์']
      },
      {
        id: '2',
        nameTh: 'ตลาดนัดจตุจักร',
        nameEn: 'Chatuchak Weekend Market',
        descTh: 'ตลาดนัดที่ใหญ่ที่สุดในไทย มีสินค้าหลากหลาย',
        imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
        tags: ['ช้อปปิ้ง', 'อาหาร', 'วัฒนธรรม']
      }
    ];

    // Mock successful API response
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockDestinations,
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Set up session cookie
    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    // Reload to trigger API call
    await page.reload();

    // Wait for loading to complete
    await page.waitForTimeout(1500);

    // Should show card interface
    await expect(page.getByText('วัดพระแก้ว')).toBeVisible();
    await expect(page.getByText('Temple of the Emerald Buddha')).toBeVisible();
    await expect(page.getByText('วัฒนธรรม')).toBeVisible();

    // Should show instructions
    await expect(page.getByText('สไลด์ขวา = ชอบ • สไลด์ซ้าย = ไม่สนใจ')).toBeVisible();
    await expect(page.getByText('หรือแตะเพื่อดูรายละเอียด')).toBeVisible();

    // Should show remaining count
    await expect(page.getByText('2 สถานที่เหลือ')).toBeVisible();
  });

  test('should handle swipe gestures simulation', async ({ page }) => {
    const mockDestinations = [
      {
        id: '1',
        nameTh: 'ทดสอบสถานที่ 1',
        nameEn: 'Test Place 1',
        descTh: 'คำอธิบายทดสอบ 1',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['ทดสอบ']
      },
      {
        id: '2',
        nameTh: 'ทดสอบสถานที่ 2',
        nameEn: 'Test Place 2',
        descTh: 'คำอธิบายทดสอบ 2',
        imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
        tags: ['ทดสอบ']
      }
    ];

    // Mock API response
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockDestinations,
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // First card should be visible
    await expect(page.getByText('ทดสอบสถานที่ 1')).toBeVisible();

    // Simulate like action using fallback button
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Second card should now be visible
    await expect(page.getByText('ทดสอบสถานที่ 2')).toBeVisible();

    // Remaining count should update
    await expect(page.getByText('1 สถานที่เหลือ')).toBeVisible();

    // Liked button should show count badge
    const likedBadge = page.locator('span').filter({ hasText: '1' });
    await expect(likedBadge).toBeVisible();
  });

  test('should handle empty stack completion', async ({ page }) => {
    const mockDestinations = [
      {
        id: '1',
        nameTh: 'ทดสอบสถานที่เดียว',
        nameEn: 'Single Test Place',
        descTh: 'คำอธิบายทดสอบ',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['ทดสอบ']
      }
    ];

    // Mock API response with single item
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockDestinations,
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Swipe the only card
    const skipButton = page.locator('button[aria-label="Skip this place"]');
    await skipButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Should show completion state
    await expect(page.getByText('🎉')).toBeVisible();
    await expect(page.getByText('เยี่ยมเลย!')).toBeVisible();
    await expect(page.getByText('คุณได้ดูสถานที่ครบแล้ว')).toBeVisible();
    await expect(page.getByText('ดูสถานที่เพิ่มเติม')).toBeVisible();
  });

  test('should track analytics events', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor console logs for analytics
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    const mockDestinations = [
      {
        id: '1',
        nameTh: 'ทดสอบ Analytics',
        nameEn: 'Analytics Test',
        descTh: 'ทดสอบ Analytics',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        tags: ['ทดสอบ']
      }
    ];

    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: mockDestinations,
          request_id: 'test-request'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Verify card stack loaded event
    const stackLoadedLog = consoleLogs.find(log =>
      log.includes('card_stack_loaded') &&
      log.includes('sessionId') &&
      log.includes('itemCount')
    );
    expect(stackLoadedLog).toBeTruthy();

    // Simulate card tap for detail analytics
    const card = page.locator('.destination-card');
    await card.click();

    await page.waitForTimeout(200);

    // Verify card tapped event
    const cardTappedLog = consoleLogs.find(log =>
      log.includes('card_tapped') &&
      log.includes('destinationId')
    );
    expect(cardTappedLog).toBeTruthy();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Failed to load recommendations'
          }
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=test-session-id';
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Should show error state
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();
    await expect(page.getByText('Failed to load recommendations')).toBeVisible();

    // Should provide way to return to preferences
    const backButton = page.getByText('กลับไปตั้งค่าความต้องการ');
    await expect(backButton).toBeVisible();
  });
});