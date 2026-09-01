import { expect, test } from "@playwright/test";

import { seedCompleteProfile, seedMatch } from "./onboarding-helpers";
import { createTestUser, deleteTestUser, signInAs, type TestUser } from "./support/auth";
import { db } from "./support/db";

test.describe.configure({ mode: "serial" });

test.describe("match lobby", () => {
  let ava: TestUser;
  let bex: TestUser;
  let matchId: string;

  test.beforeEach(async () => {
    ava = await createTestUser();
    bex = await createTestUser();
    await seedCompleteProfile(ava.id, "Ava");
    await seedCompleteProfile(bex.id, "Bex");
    matchId = await seedMatch([ava.id, bex.id]);
  });

  test.afterEach(async () => {
    await db.match.delete({ where: { id: matchId } }).catch(() => {});
    await deleteTestUser(ava.id);
    await deleteTestUser(bex.id);
  });

  test("chat, ready-up, launch, and rating flow across two clients", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await signInAs(ctxA, ava);
    await signInAs(ctxB, bex);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await pageA.goto(`/app/match/${matchId}`);
    await pageB.goto(`/app/match/${matchId}`);

    // Chat propagates live.
    await pageA.getByPlaceholder("Message your squad…").fill("hey team");
    await pageA.getByRole("button", { name: "Send" }).click();
    await expect(pageB.getByText("hey team")).toBeVisible();

    // Ready-up: both must ready for the state to advance.
    await pageA.getByRole("button", { name: "Ready up" }).click();
    await expect(pageB.getByRole("heading", { level: 1 })).toContainText("Ready up");
    await pageB.getByRole("button", { name: "Ready up" }).click();
    await expect(pageA.getByRole("heading", { level: 1 })).toContainText("Ready to launch");
    await expect(pageB.getByRole("heading", { level: 1 })).toContainText("Ready to launch");

    // Launch → both go live.
    await pageA.getByRole("button", { name: "Launch match" }).click();
    await expect(pageA.getByRole("heading", { level: 1 })).toContainText("Live");
    await expect(pageB.getByRole("heading", { level: 1 })).toContainText("Live");

    // Ava rates Bex.
    await pageA.getByRole("button", { name: "👍" }).click();
    await expect
      .poll(() =>
        db.playerRating.count({ where: { matchId, fromUserId: ava.id, toUserId: bex.id } }),
      )
      .toBe(1);

    // Finish → complete.
    await pageA.getByRole("button", { name: "Finish match" }).click();
    await expect(pageB.getByRole("heading", { level: 1 })).toContainText("Complete");

    await ctxA.close();
    await ctxB.close();
  });

  test("one player leaving cancels the match for everyone", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await signInAs(ctxA, ava);
    await signInAs(ctxB, bex);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await pageA.goto(`/app/match/${matchId}`);
    await pageB.goto(`/app/match/${matchId}`);

    await pageA.getByRole("button", { name: "Leave lobby" }).click();
    await expect(pageA).toHaveURL(/\/app\/queue/);
    await expect(
      pageB.getByText("This match was cancelled — someone left the lobby."),
    ).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
