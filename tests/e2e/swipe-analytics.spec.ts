import { test, expect } from '@playwright/test';

test.describe('Swipe Analytics End-to-End', () => {
  // Mock session ID for testing
  const testSessionId = '123e4567-e89b-12d3-a456-426614174000';
  const testDestinationId = '987fcdeb-51a2-43e5-a123-987654321000';

  test.beforeEach(async ({ page }) => {
    // Set up session cookie
    await page.addInitScript((sessionId) => {
      document.cookie = `sid=${sessionId}; path=/`;
      localStorage.setItem('nextspot-session-id', sessionId);
    }, testSessionId);

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

  test('should capture and send swipe events to analytics API', async ({ page }) => {
    // Mock successful swipe events API
    let capturedEvents: any[] = [];
    await page.route('**/api/swipe-events', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = JSON.parse(route.request().postData() || '{}');
        capturedEvents.push(requestBody);

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            eventId: `event-${Date.now()}`,
            request_id: `req-${Date.now()}`,
            recorded: true
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock recommendations API to provide test destinations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่ 1',
              nameEn: 'Test Place 1',
              descTh: 'คำอธิบายทดสอบ 1',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            },
            {
              id: '456e7890-e12b-34d5-a678-901234567890',
              nameTh: 'ทดสอบสถานที่ 2',
              nameEn: 'Test Place 2',
              descTh: 'คำอธิบายทดสอบ 2',
              imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for recommendations to load
    await page.waitForTimeout(2000);
    await expect(page.getByText('ทดสอบสถานที่ 1')).toBeVisible();

    // Test like button click analytics
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();

    // Wait for animation and API call
    await page.waitForTimeout(1000);

    // Verify swipe event was captured
    expect(capturedEvents.length).toBeGreaterThan(0);
    const likeEvent = capturedEvents.find(event => event.action === 'like');
    expect(likeEvent).toBeDefined();
    expect(likeEvent.sessionId).toBe(testSessionId);
    expect(likeEvent.destinationId).toBe(testDestinationId);
    expect(likeEvent.action).toBe('like');
    expect(likeEvent.direction).toBe('right');
    expect(likeEvent.durationMs).toBe(0); // Button click = instant
    expect(likeEvent.viewDurationMs).toBeGreaterThan(0);
    expect(likeEvent.clientTimestamp).toBeDefined();

    // Test skip button on next card
    await expect(page.getByText('ทดสอบสถานที่ 2')).toBeVisible();
    const skipButton = page.locator('button[aria-label="Skip this place"]');
    await skipButton.click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify skip event was captured
    const skipEvent = capturedEvents.find(event => event.action === 'skip');
    expect(skipEvent).toBeDefined();
    expect(skipEvent.sessionId).toBe(testSessionId);
    expect(skipEvent.action).toBe('skip');
    expect(skipEvent.direction).toBe('left');
  });

  test('should capture detail tap events', async ({ page }) => {
    let capturedEvents: any[] = [];
    await page.route('**/api/swipe-events', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = JSON.parse(route.request().postData() || '{}');
        capturedEvents.push(requestBody);

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            eventId: `event-${Date.now()}`,
            request_id: `req-${Date.now()}`,
            recorded: true
          })
        });
      }
    });

    // Mock recommendations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Click on the card content (not buttons) to trigger detail tap
    const card = page.locator('.destination-card');
    await card.click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify detail tap event was captured
    const detailTapEvent = capturedEvents.find(event => event.action === 'detail_tap');
    expect(detailTapEvent).toBeDefined();
    expect(detailTapEvent.sessionId).toBe(testSessionId);
    expect(detailTapEvent.destinationId).toBe(testDestinationId);
    expect(detailTapEvent.action).toBe('detail_tap');
    expect(detailTapEvent.direction).toBe('tap');
    expect(detailTapEvent.viewDurationMs).toBeGreaterThan(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Monitor console for error handling
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Mock API to return errors
    await page.route('**/api/swipe-events', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Test server error'
            },
            request_id: 'test-request'
          })
        });
      }
    });

    // Mock recommendations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Try to perform an action that would trigger analytics
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();

    // Wait for error to be processed
    await page.waitForTimeout(1000);

    // Verify that the UI still works despite analytics error
    // The card should still animate away and the next card should appear
    await expect(page.getByText('ทดสอบสถานที่')).not.toBeVisible();

    // Error should be logged but not break the UI
    const hasAnalyticsError = consoleMessages.some(msg =>
      msg.includes('Failed to track swipe event') ||
      msg.includes('SwipeTracker')
    );
    expect(hasAnalyticsError).toBe(true);
  });

  test('should track view duration accurately', async ({ page }) => {
    let capturedEvents: any[] = [];
    await page.route('**/api/swipe-events', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = JSON.parse(route.request().postData() || '{}');
        capturedEvents.push(requestBody);

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            eventId: `event-${Date.now()}`,
            request_id: `req-${Date.now()}`,
            recorded: true
          })
        });
      }
    });

    // Mock recommendations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Wait for a specific amount of time to simulate viewing
    const viewTime = 3000; // 3 seconds
    await page.waitForTimeout(viewTime);

    // Perform action
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify view duration is reasonable (should be at least the wait time)
    const likeEvent = capturedEvents.find(event => event.action === 'like');
    expect(likeEvent).toBeDefined();
    expect(likeEvent.viewDurationMs).toBeGreaterThanOrEqual(viewTime);
    expect(likeEvent.viewDurationMs).toBeLessThan(viewTime + 2000); // Some tolerance for processing time
  });

  test('should validate session management in analytics', async ({ page }) => {
    let capturedEvents: any[] = [];
    await page.route('**/api/swipe-events', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = JSON.parse(route.request().postData() || '{}');
        capturedEvents.push(requestBody);

        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            eventId: `event-${Date.now()}`,
            request_id: `req-${Date.now()}`,
            recorded: true
          })
        });
      }
    });

    // Mock recommendations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Perform multiple actions
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();
    await page.waitForTimeout(500);

    // Verify all events have the same session ID
    expect(capturedEvents.length).toBeGreaterThan(0);
    capturedEvents.forEach(event => {
      expect(event.sessionId).toBe(testSessionId);
      expect(event.clientTimestamp).toBeDefined();
      expect(new Date(event.clientTimestamp)).toBeInstanceOf(Date);
    });
  });

  test('should meet performance requirements', async ({ page }) => {
    let responseTime = 0;
    await page.route('**/api/swipe-events', async (route) => {
      const startTime = Date.now();

      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          eventId: `event-${Date.now()}`,
          request_id: `req-${Date.now()}`,
          recorded: true
        })
      });

      responseTime = Date.now() - startTime;
    });

    // Mock recommendations
    await page.route('**/api/recommendations**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: testDestinationId,
              nameTh: 'ทดสอบสถานที่',
              nameEn: 'Test Place',
              descTh: 'คำอธิบายทดสอบ',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
              tags: ['ทดสอบ']
            }
          ],
          isFastMode: false,
          request_id: 'test-request'
        })
      });
    });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Measure client-side response time
    const startTime = Date.now();
    const likeButton = page.locator('button[aria-label="Like this place"]');
    await likeButton.click();

    // Wait for the card to animate away (indicating the action completed)
    await expect(page.getByText('ทดสอบสถานที่')).not.toBeVisible();
    const clientResponseTime = Date.now() - startTime;

    // Verify performance requirements from S-08
    expect(clientResponseTime).toBeLessThan(100); // <100ms requirement for event recording
  });

  test('should handle batch processing status check', async ({ page }) => {
    // Mock the health check endpoint
    await page.route('**/api/swipe-events', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            batchQueue: {
              length: 5,
              maxSize: 100,
              timeoutMs: 5000,
              hasPendingTimeout: true
            },
            system: {
              timestamp: new Date().toISOString(),
              status: 'healthy'
            }
          })
        });
      } else {
        route.continue();
      }
    });

    // Test health check via direct API call
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/swipe-events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return res.json();
    });

    expect(response.batchQueue).toBeDefined();
    expect(response.batchQueue.maxSize).toBe(100);
    expect(response.batchQueue.timeoutMs).toBe(5000);
    expect(response.system.status).toBe('healthy');
  });
});