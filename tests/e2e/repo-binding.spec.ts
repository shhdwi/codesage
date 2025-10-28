import { test, expect } from '@playwright/test';

test.describe('Repository Bindings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/repos');
  });

  test('should display repositories page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Repositories');
  });

  test('should show repository table or empty state', async ({ page }) => {
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No repositories found').isVisible().catch(() => false);
    
    // Should have either table or empty state
    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('should toggle agent binding', async ({ page }) => {
    // Check if there are any checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 0) {
      // Toggle first checkbox
      const firstCheckbox = checkboxes.first();
      const wasChecked = await firstCheckbox.isChecked();
      
      await firstCheckbox.click();
      
      // Wait for API call
      await page.waitForTimeout(500);
      
      // State should have changed
      const isNowChecked = await firstCheckbox.isChecked();
      expect(isNowChecked).toBe(!wasChecked);
    }
  });
});

