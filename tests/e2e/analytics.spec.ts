import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics');
  });

  test('should display analytics page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Analytics');
  });

  test('should show time range selector', async ({ page }) => {
    const select = page.locator('select');
    await expect(select).toBeVisible();
    
    // Should have options for different time ranges
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('Last 7 days');
    expect(options).toContain('Last 30 days');
    expect(options).toContain('Last 90 days');
  });

  test('should change time range', async ({ page }) => {
    await page.selectOption('select', '7');
    
    // Wait for data to reload
    await page.waitForTimeout(1000);
    
    // Page should still be on analytics
    await expect(page.locator('h1')).toContainText('Analytics');
  });

  test('should display charts when data is available', async ({ page }) => {
    // Check for chart containers
    const hasLeaderboard = await page.locator('text=Agent Leaderboard').isVisible();
    const hasTrends = await page.locator('text=Helpfulness Over Time').isVisible();
    const hasDimensions = await page.locator('text=Evaluation Dimension Breakdown').isVisible();
    
    // At least one should be visible
    expect(hasLeaderboard || hasTrends || hasDimensions).toBeTruthy();
  });

  test('should display cost tracking section', async ({ page }) => {
    await expect(page.locator('text=Cost Tracking')).toBeVisible();
  });
});

