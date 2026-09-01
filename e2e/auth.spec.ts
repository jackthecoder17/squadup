import { expect, test } from "@playwright/test";

test.describe("auth", () => {
  test("visiting a protected route redirects to sign-in", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByRole("button", { name: /continue with discord/i })).toBeVisible();
  });

  test("sign-in preserves the original destination as a callback URL", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/callbackUrl=\/app/);
  });

  test("landing page prompts sign-in when logged out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sign in to get started/i })).toBeVisible();
  });
});
