import { test, expect } from '@playwright/test';

test.describe('Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real scenario, you'd need to handle authentication
    // This is a placeholder - you'd mock or use test credentials
    await page.goto('/dashboard/agents');
  });

  test('should display agents page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Review Agents');
  });

  test('should navigate to new agent form', async ({ page }) => {
    await page.click('text=New Agent');
    await expect(page.locator('h1')).toContainText('Create New Agent');
  });

  test('should show form validation errors', async ({ page }) => {
    await page.goto('/dashboard/agents/new');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('should create a new agent', async ({ page }) => {
    await page.goto('/dashboard/agents/new');
    
    // Fill form
    await page.fill('input[name="name"]', 'Test Agent');
    await page.fill('textarea[name="description"]', 'A test agent for E2E testing');
    await page.fill('input[name="fileTypeFilters"]', '.ts, .tsx');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to agents list
    await expect(page).toHaveURL('/dashboard/agents');
    
    // Should show the new agent
    await expect(page.locator('text=Test Agent')).toBeVisible();
  });

  test('should test agent prompt', async ({ page }) => {
    await page.goto('/dashboard/agents/new');
    
    // Fill minimal required fields
    await page.fill('input[name="name"]', 'Test Agent');
    
    // Click test button
    await page.click('text=Test with Sample Code');
    
    // Should show test results
    await expect(page.locator('text=Generated Comment')).toBeVisible({ timeout: 10000 });
  });
});

