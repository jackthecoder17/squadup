import { expect, test } from "@playwright/test";

test("landing page renders and is titled", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/squadup/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
