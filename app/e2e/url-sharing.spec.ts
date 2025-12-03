import { test, expect } from '@playwright/test';
import { createAssumption, ensureOnBoard } from './helpers';

/**
 * E2E Tests for URL-based document sharing
 * Validates that documents can be shared via URL and persist across sessions
 */
test.describe('URL Sharing', () => {
  test('should create document with URL hash', async ({ page }) => {
    await ensureOnBoard(page);

    // URL should contain #doc= with a valid document ID
    const url = page.url();
    expect(url).toContain('#doc=');
    expect(url).toMatch(/#doc=[A-Za-z0-9]+/);
  });

  test('should maintain document ID in URL when adding content', async ({ page }) => {
    await ensureOnBoard(page);

    const initialUrl = page.url();
    const docId = initialUrl.split('#doc=')[1];

    // Add content
    await createAssumption(page, 'Testing URL persistence');
    await page.waitForTimeout(500);

    // URL should still have the same document ID
    const currentUrl = page.url();
    expect(currentUrl).toContain(docId);
  });

  test('should persist document after page reload', async ({ page }) => {
    await ensureOnBoard(page);

    const assumptionText = 'Persistence test assumption';
    await createAssumption(page, assumptionText);

    // Get current URL
    const docUrl = page.url();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for sync

    // Content should still be there
    await expect(page.getByText(assumptionText)).toBeVisible({ timeout: 10000 });
  });

  test('should support multiple documents', async ({ page }) => {
    // Create first document
    await ensureOnBoard(page);
    await createAssumption(page, 'First document assumption');
    const firstDocUrl = page.url();

    // Create second document by clicking "New Board" button
    // Click the hamburger menu (Board Menu FAB at bottom-left)
    const hamburgerButton = page.locator('.dropdown-top .btn[role="button"]');
    await expect(hamburgerButton).toBeVisible({ timeout: 5000 });
    await hamburgerButton.click();
    await page.waitForTimeout(500);

    // Click "New Board" in the dropdown menu
    const newBoardButton = page.getByText('New Board', { exact: true });
    await expect(newBoardButton).toBeVisible({ timeout: 5000 });
    await newBoardButton.click();
    await page.waitForTimeout(2000); // Wait for navigation and document creation

    await createAssumption(page, 'Second document assumption');
    const secondDocUrl = page.url();

    // Document URLs should be different
    expect(firstDocUrl).not.toBe(secondDocUrl);

    // Navigate back to first document
    await page.goto(firstDocUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should see first document content
    await expect(page.getByText('First document assumption')).toBeVisible({ timeout: 10000 });
  });

  test('should share document URL between contexts', async ({ browser }) => {
    // Context 1: Create a document
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/');
    await page1.waitForLoadState('networkidle');

    const newButton = page1.getByRole('button', { name: /^new$/i });
    if (await newButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newButton.click();
      await page1.waitForURL(/.*#doc=.*/);
      await page1.waitForTimeout(1000);
    }

    await createAssumption(page1, 'Shared document test');
    const shareUrl = page1.url();

    // Context 2: Open the same URL
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto(shareUrl);
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(2000); // Wait for sync

    // Should see the same content
    await expect(page2.getByText('Shared document test')).toBeVisible({ timeout: 10000 });

    // Verify URL is the same
    expect(page2.url()).toBe(shareUrl);

    await context1.close();
    await context2.close();
  });
});
