import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Creates a new assumption via the UI
 * @param page Playwright page object
 * @param sentence The assumption text
 * @param tags Optional comma-separated tags
 */
export async function createAssumption(
  page: Page,
  sentence: string,
  tags?: string
) {
  // Click the "New Assumption" button
  const newButton = page.getByRole('button', { name: /new assumption/i });
  await expect(newButton).toBeVisible({ timeout: 10000 });
  await newButton.click();

  // Wait for modal to open and be visible
  await page.waitForTimeout(500);

  // Fill in the sentence
  const sentenceInput = page.getByPlaceholder(/enter a single-sentence assumption/i);
  await expect(sentenceInput).toBeVisible({ timeout: 5000 });
  await sentenceInput.fill(sentence);

  // Fill in tags if provided
  if (tags) {
    const tagsInput = page.getByPlaceholder(/climate, policy, energy/i);
    await tagsInput.fill(tags);
  }

  // Submit the form
  const createButton = page.getByRole('button', { name: /^create$/i });
  await expect(createButton).toBeEnabled({ timeout: 5000 });
  await createButton.click();

  // Wait for modal to close and assumption to appear in the list
  await page.waitForTimeout(1000);

  // Verify assumption was created
  await expect(page.getByText(sentence)).toBeVisible({ timeout: 10000 });
}

/**
 * Ensures we're on a board (creates new if needed)
 */
export async function ensureOnBoard(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const url = page.url();
  if (!url.includes('#doc=')) {
    // Click hamburger menu button (Board Menu FAB at bottom-left)
    const hamburgerButton = page.locator('.dropdown-top .btn[role="button"]');
    if (await hamburgerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hamburgerButton.click();
      await page.waitForTimeout(500);

      // Click "New Board" in the dropdown menu
      const newBoardButton = page.getByText('New Board', { exact: true });
      if (await newBoardButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newBoardButton.click();
        await page.waitForURL(/.*#doc=.*/);
        await page.waitForTimeout(1000);
      }
    }
  }
}
