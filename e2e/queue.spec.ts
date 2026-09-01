import { expect, test } from "@playwright/test";

import { seedCompleteProfile } from "./onboarding-helpers";
import { createTestUser, deleteTestUser, signInAs, type TestUser } from "./support/auth";
import { flushQueueKeys } from "./support/queue";

test.describe.configure({ mode: "serial" });

test.describe("queue", () => {
  let ava: TestUser;
  let bex: TestUser;

  test.beforeEach(async () => {
    ava = await createTestUser();
    bex = await createTestUser();
    await seedCompleteProfile(ava.id, "Ava");
    await seedCompleteProfile(bex.id, "Bex");
  });

  test.afterEach(async () => {
    await flushQueueKeys([ava.id, bex.id]);
    await deleteTestUser(ava.id);
    await deleteTestUser(bex.id);
  });

  test("one player's join shows up live for another", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    await signInAs(ctxA, ava);
    await signInAs(ctxB, bex);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto("/app/queue");
    await pageB.goto("/app/queue");

    const rowA = pageA.getByRole("listitem").filter({ hasText: "VALORANT" });
    const rowB = pageB.getByRole("listitem").filter({ hasText: "VALORANT" });
    await expect(rowA).toContainText("0 in queue");

    await rowA.getByRole("button", { name: "Find a squad" }).click();
    await expect(rowA).toContainText("Leave");
    await expect(rowA).toContainText("1 in queue");
    await expect(rowB).toContainText("1 in queue"); // pushed over SSE, no reload

    await rowB.getByRole("button", { name: "Find a squad" }).click();
    await expect(rowA).toContainText("2 in queue");
    await expect(rowB).toContainText("2 in queue");

    await rowA.getByRole("button", { name: "Leave" }).click();
    await expect(rowA).toContainText("Find a squad");
    await expect(rowB).toContainText("1 in queue");

    await ctxA.close();
    await ctxB.close();
  });

  test("queued state survives a page reload", async ({ context, page }) => {
    await signInAs(context, ava);
    await page.goto("/app/queue");

    const row = page.getByRole("listitem").filter({ hasText: "VALORANT" });
    await row.getByRole("button", { name: "Find a squad" }).click();
    await expect(row).toContainText("Leave");

    await page.reload();
    await expect(row).toContainText("Leave");
    await expect(row).toContainText("1 in queue");
  });
});
