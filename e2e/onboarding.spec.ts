import { expect, test } from "@playwright/test";

import { createTestUser, deleteTestUser, signInAs, type TestUser } from "./support/auth";
import { db } from "./support/db";

test.describe("onboarding", () => {
  let user: TestUser;

  test.beforeEach(async ({ context }) => {
    user = await createTestUser();
    await signInAs(context, user);
  });

  test.afterEach(async () => {
    await deleteTestUser(user.id);
  });

  test("routes a new user through onboarding and completes a profile", async ({ page }) => {
    // No profile yet -> /app bounces to onboarding.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 1 — basics.
    await page.getByLabel("Display name").fill("Nova");
    await page.getByLabel("Region").selectOption("EU_WEST");
    await page
      .getByRole("group", { name: "Languages" })
      .getByRole("button", { name: "English" })
      .click();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2 — games.
    await page.getByRole("button", { name: "VALORANT", pressed: false }).click();
    await page
      .getByRole("group", { name: "VALORANT roles" })
      .getByRole("button", { name: "Duelist" })
      .click();
    await page.getByLabel("Current rank").selectOption("Diamond");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3 — availability (one window with valid defaults).
    await page.getByRole("button", { name: "+ Add window" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4 — review + submit.
    await expect(page.getByText("VALORANT")).toBeVisible();
    await page.getByRole("button", { name: "Finish setup" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: /welcome, nova/i })).toBeVisible();

    // Persisted.
    const profile = await db.playerProfile.findUnique({
      where: { userId: user.id },
      include: { games: { include: { game: true } }, availability: true },
    });
    expect(profile?.displayName).toBe("Nova");
    expect(profile?.region).toBe("EU_WEST");
    expect(profile?.games[0]?.game.slug).toBe("valorant");
    expect(profile?.availability.length).toBeGreaterThan(0);

    // Re-visiting onboarding when complete redirects to the profile.
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/app\/profile/);
  });

  test("edits persist from the profile editor", async ({ page }) => {
    await db.playerProfile.create({
      data: {
        userId: user.id,
        displayName: "Placeholder",
        region: "NA_EAST",
        languages: ["English"],
        timezone: "America/New_York",
        games: {
          create: {
            rank: "Gold",
            roles: ["Mid"],
            game: { connect: { slug: "league-of-legends" } },
          },
        },
        availability: { create: { dayOfWeek: 2, startMinute: 1080, endMinute: 1320 } },
      },
    });

    await page.goto("/app/profile/edit");
    await page.getByLabel("Display name").fill("Renamed");
    await page.getByRole("button", { name: "Save basics" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
    expect(profile?.displayName).toBe("Renamed");
  });
});
