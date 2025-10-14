import { test, expect } from '@playwright/test';

test.describe('Recommendations Page', () => {
  test.beforeEach(async ({ page }) => {
    // Start from landing page and navigate through the full flow
    await page.goto('/');
  });

  test('should display loading state initially', async ({ page }) => {
    // Complete the preferences flow to get to recommendations
    const ctaButton = page.getByTestId('cta');
    await ctaButton.click();
    await expect(page).toHaveURL('/prefs');

    // Fill out preferences
    await page.getByTestId('budget-mid').click();
    await page.getByTestId('mood-cultural').click();
    await page.getByTestId('time-halfday').click();

    // Submit and go to recommendations
    const submitButton = page.getByTestId('prefs-submit');
    await submitButton.click();
    await expect(page).toHaveURL('/recs');

    // Should show loading state initially
    await expect(page.getByText('กำลังค้นหาสถานที่...')).toBeVisible();
    await expect(page.getByText('กรุณารอสักครู่ขณะที่เราค้นหาสถานที่ที่เหมาะกับคุณ')).toBeVisible();
  });

  test('should display recommendations after loading', async ({ page }) => {
    // Complete the preferences flow
    const ctaButton = page.getByTestId('cta');
    await ctaButton.click();

    await page.getByTestId('budget-high').click();
    await page.getByTestId('mood-foodie').click();
    await page.getByTestId('mood-romantic').click();
    await page.getByTestId('time-evening').click();

    const submitButton = page.getByTestId('prefs-submit');
    await submitButton.click();
    await expect(page).toHaveURL('/recs');

    // Wait for recommendations to load
    await expect(page.getByRole('heading', { name: 'สถานที่แนะนำ' })).toBeVisible();

    // Should eventually show recommendation cards
    await expect(page.locator('[data-testid^="rec-card-"]').first()).toBeVisible({ timeout: 10000 });

    // Verify basic structure
    const cards = page.locator('[data-testid^="rec-card-"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Check first card has required elements
    const firstCard = cards.first();
    await expect(firstCard.locator('[data-testid^="rec-name-"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid^="rec-desc-"]')).toBeVisible();
    await expect(firstCard.locator('img')).toBeVisible();
  });

  test('should show fast mode banner when using fallback', async ({ page }) => {
    // Mock session ID to trigger fallback (no preferences)
    await page.addInitScript(() => {
      document.cookie = 'sid=fallback-test-session';
    });

    // Go directly to recommendations (no preferences set)
    await page.goto('/recs');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'สถานที่แนะนำ' })).toBeVisible();

    // Should show fast mode banner
    await expect(page.getByTestId('fast-mode-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('fast-mode-banner')).toContainText('Fast Mode Fallback');

    // Should still show recommendations
    await expect(page.locator('[data-testid^="rec-card-"]').first()).toBeVisible();
  });

  test('should handle missing session gracefully', async ({ page }) => {
    // Clear any existing cookies
    await page.context().clearCookies();

    // Go directly to recommendations without session
    await page.goto('/recs');

    // Should show error state
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Session not found. Please start from the beginning.')).toBeVisible();

    // Should have retry and back options
    await expect(page.getByText('ลองอีกครั้ง')).toBeVisible();
    await expect(page.getByText('แก้ไขความต้องการ')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock the API to return an error
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          },
          request_id: 'test-error-id'
        })
      });
    });

    // Set up session ID
    await page.addInitScript(() => {
      document.cookie = 'sid=error-test-session';
    });

    await page.goto('/recs');

    // Should show error state
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Database connection failed')).toBeVisible();

    // Should have action buttons
    await expect(page.getByText('ลองอีกครั้ง')).toBeVisible();
    await expect(page.getByText('แก้ไขความต้องการ')).toBeVisible();
  });

  test('should handle retry functionality', async ({ page }) => {
    let callCount = 0;

    // Mock API to fail first time, succeed second time
    await page.route('**/api/recommendations*', (route) => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Temporary error' },
            request_id: 'retry-test'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'retry-test-dest',
                nameTh: 'สถานที่ทดสอบ',
                nameEn: 'Test Place',
                descTh: 'สถานที่สำหรับทดสอบการทำงาน',
                imageUrl: 'https://example.com/test.jpg',
                tags: ['cultural']
              }
            ],
            isFastMode: false,
            request_id: 'retry-success'
          })
        });
      }
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=retry-test-session';
    });

    await page.goto('/recs');

    // Should show error first
    await expect(page.getByText('เกิดข้อผิดพลาด')).toBeVisible();

    // Click retry
    const retryButton = page.getByText('ลองอีกครั้ง');
    await retryButton.click();

    // Should show loading then success
    await expect(page.getByText('กำลังค้นหาสถานที่...')).toBeVisible();
    await expect(page.getByTestId('rec-card-retry-test-dest')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to preferences correctly', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'nav-test-dest',
              nameTh: 'สถานที่นำทาง',
              nameEn: 'Navigation Test',
              descTh: 'ทดสอบการนำทาง',
              imageUrl: 'https://example.com/nav.jpg',
              tags: ['cultural']
            }
          ],
          isFastMode: false,
          request_id: 'nav-test'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=nav-test-session';
    });

    await page.goto('/recs');

    // Wait for page to load
    await expect(page.getByTestId('rec-card-nav-test-dest')).toBeVisible();

    // Click edit preferences button
    const editButton = page.getByTestId('edit-preferences');
    await editButton.click();

    // Should navigate to preferences page
    await expect(page).toHaveURL('/prefs');
    await expect(page.getByRole('heading', { name: 'ตั้งค่าความต้องการ' })).toBeVisible();
  });

  test('should navigate back to home correctly', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'home-test-dest',
              nameTh: 'สถานที่หน้าแรก',
              nameEn: 'Home Test',
              descTh: 'ทดสอบกลับหน้าแรก',
              imageUrl: 'https://example.com/home.jpg',
              tags: ['chill']
            }
          ],
          isFastMode: false,
          request_id: 'home-test'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=home-test-session';
    });

    await page.goto('/recs');

    // Wait for page to load
    await expect(page.getByTestId('rec-card-home-test-dest')).toBeVisible();

    // Click back to home button
    const homeButton = page.getByTestId('back-to-home');
    await homeButton.click();

    // Should navigate to home page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();
  });

  test('should display recommendation cards with correct structure', async ({ page }) => {
    // Mock detailed API response
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'detailed-dest-1',
              nameTh: 'วัดพระแก้ว',
              nameEn: 'Temple of the Emerald Buddha',
              descTh: 'วัดที่มีพระแก้วมรกตอันศักดิ์สิทธิ์',
              imageUrl: 'https://example.com/temple.jpg',
              tags: ['cultural', 'spiritual', 'historic']
            },
            {
              id: 'detailed-dest-2',
              nameTh: 'ตลาดจตุจักร',
              nameEn: 'Chatuchak Market',
              descTh: 'ตลาดนัดที่ใหญ่ที่สุดในไทย',
              imageUrl: 'https://example.com/market.jpg',
              tags: ['shopping', 'food']
            }
          ],
          isFastMode: false,
          request_id: 'detailed-test'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=detailed-test-session';
    });

    await page.goto('/recs');

    // Wait for cards to load
    await expect(page.getByTestId('rec-card-detailed-dest-1')).toBeVisible();

    // Check first card structure
    const firstCard = page.getByTestId('rec-card-detailed-dest-1');
    await expect(firstCard.getByTestId('rec-name-detailed-dest-1')).toContainText('วัดพระแก้ว');
    await expect(firstCard.getByText('Temple of the Emerald Buddha')).toBeVisible();
    await expect(firstCard.getByTestId('rec-desc-detailed-dest-1')).toContainText('วัดที่มีพระแก้วมรกตอันศักดิ์สิทธิ์');

    // Check tags
    await expect(firstCard.getByTestId('rec-tag-cultural')).toBeVisible();
    await expect(firstCard.getByTestId('rec-tag-spiritual')).toBeVisible();
    await expect(firstCard.getByTestId('rec-tag-historic')).toBeVisible();

    // Check image
    await expect(firstCard.locator('img')).toBeVisible();

    // Check second card
    const secondCard = page.getByTestId('rec-card-detailed-dest-2');
    await expect(secondCard.getByTestId('rec-name-detailed-dest-2')).toContainText('ตลาดจตุจักร');
    await expect(secondCard.getByTestId('rec-tag-shopping')).toBeVisible();
    await expect(secondCard.getByTestId('rec-tag-food')).toBeVisible();
  });

  test('should handle image loading errors gracefully', async ({ page }) => {
    // Mock API with broken image URL
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'broken-image-dest',
              nameTh: 'สถานที่รูปเสีย',
              nameEn: 'Broken Image Place',
              descTh: 'ทดสอบรูปภาพเสีย',
              imageUrl: 'https://broken-url.invalid/nonexistent.jpg',
              tags: ['test']
            }
          ],
          isFastMode: false,
          request_id: 'broken-image-test'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=broken-image-session';
    });

    await page.goto('/recs');

    // Wait for card to load
    const card = page.getByTestId('rec-card-broken-image-dest');
    await expect(card).toBeVisible();

    // Image should fallback to default
    const image = card.locator('img');
    await expect(image).toBeVisible();

    // The image should eventually load the fallback URL
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="rec-card-broken-image-dest"] img') as HTMLImageElement;
      return img && img.src.includes('unsplash.com');
    });
  });

  test('should show correct item count and mode in footer', async ({ page }) => {
    // Mock API response
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: Array.from({ length: 8 }, (_, i) => ({
            id: `footer-dest-${i}`,
            nameTh: `สถานที่ ${i + 1}`,
            nameEn: `Place ${i + 1}`,
            descTh: `คำอธิบาย ${i + 1}`,
            imageUrl: 'https://example.com/place.jpg',
            tags: ['test']
          })),
          isFastMode: true,
          request_id: 'footer-test'
        })
      });
    });

    await page.addInitScript(() => {
      document.cookie = 'sid=footer-test-session';
    });

    await page.goto('/recs');

    // Wait for content to load
    await expect(page.getByTestId('rec-card-footer-dest-0')).toBeVisible();

    // Check footer shows correct count and mode
    await expect(page.getByText('แสดง 8 สถานที่ (โหมดเร็ว)')).toBeVisible();
  });

  test('should complete full user journey from landing to recommendations', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Monitor analytics events
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('[Analytics]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Mock the recommendations API
    await page.route('**/api/recommendations*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'journey-dest-1',
              nameTh: 'วัดพระเชตุพน',
              nameEn: 'Wat Pho',
              descTh: 'วัดเก่าแก่ที่มีพระนอนยักษ์',
              imageUrl: 'https://example.com/watpho.jpg',
              tags: ['cultural', 'spiritual']
            },
            {
              id: 'journey-dest-2',
              nameTh: 'ตลาดโรงเกลือ',
              nameEn: 'Rong Klua Market',
              descTh: 'ตลาดอาหารทะเลสด',
              imageUrl: 'https://example.com/market.jpg',
              tags: ['food', 'local']
            }
          ],
          isFastMode: false,
          request_id: 'journey-test'
        })
      });
    });

    // 1. Start on landing page
    await expect(page.getByRole('heading', { name: 'NextSpot' })).toBeVisible();

    // 2. Click CTA
    const ctaButton = page.getByTestId('cta');
    await ctaButton.click();
    await expect(page).toHaveURL('/prefs');

    // 3. Fill preferences
    await page.getByTestId('budget-mid').click();
    await page.getByTestId('mood-cultural').click();
    await page.getByTestId('mood-foodie').click();
    await page.getByTestId('time-halfday').click();

    // 4. Submit preferences
    const submitButton = page.getByTestId('prefs-submit');
    await submitButton.click();
    await expect(page).toHaveURL('/recs');

    // 5. Wait for recommendations to load
    await expect(page.getByTestId('rec-card-journey-dest-1')).toBeVisible({ timeout: 10000 });

    // 6. Verify recommendations are displayed correctly
    await expect(page.getByTestId('rec-name-journey-dest-1')).toContainText('วัดพระเชตุพน');
    await expect(page.getByTestId('rec-card-journey-dest-2')).toBeVisible();

    // 7. Verify analytics events were fired
    await page.waitForTimeout(500);
    const recsPageViewLog = consoleLogs.find(log =>
      log.includes('recs_page_view') &&
      log.includes('itemCount') &&
      log.includes('isFastMode')
    );
    expect(recsPageViewLog).toBeTruthy();
  });
});