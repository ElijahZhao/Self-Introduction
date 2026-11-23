import { test, expect } from '@playwright/test';

const overlayReleased = async (page: import('@playwright/test').Page) => {
  // IDs starting with a digit need an attribute selector in CSS.
  await expect(page.locator('[id="3d-loading-screen"]')).toHaveCount(0, { timeout: 100_000 });
};

test.describe('stage and deep links', () => {
  test('stage renders, a module deep link opens the card, Esc closes it', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/?p=projects');
    await overlayReleased(page);

    // Three canvases = stage + aurora backdrop + cursor effect.
    expect(await page.locator('canvas').count()).toBeGreaterThanOrEqual(2);

    // Deep link boot: the card opens once the stage is released, without pushing
    // a second history entry.
    await expect(page.locator('#info-modal-card')).toBeVisible();
    await expect(page.locator('#info-modal-card')).toHaveAttribute('role', 'dialog');
    expect(page.url()).toContain('p=projects');

    await page.keyboard.press('Escape');
    await expect(page.locator('#info-modal-wrapper')).not.toHaveClass(/open/);
    // Closing a direct deep-link entry drops the query instead of leaving the page.
    await expect.poll(() => page.url()).not.toContain('p=projects');
    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});

test.describe('history', () => {
  test('opening from the dock pushes an entry, the back button closes the card', async ({ page }) => {
    await page.goto('/');
    await overlayReleased(page);

    // The dock button is the pointer-free entry point; JS click avoids fighting
    // the entrance animation for actionability.
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((el) =>
        /关于我/.test(el.innerText)
      );
      button?.click();
    });
    await expect(page.locator('#info-modal-card')).toBeVisible();
    await expect.poll(() => page.url()).toContain('p=about');

    await page.goBack();
    await expect(page.locator('#info-modal-wrapper')).not.toHaveClass(/open/);
    expect(page.url()).not.toContain('p=about');
    // Still on the site: back closed the card, it did not leave the page.
    expect(await page.locator('#root').count()).toBe(1);
  });
});

test.describe('preferences', () => {
  test('system dark mode and language both reach the document', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');

    await page.getByRole('button', { name: /EN|English/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
