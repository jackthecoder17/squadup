import { expect, test } from "@playwright/test";

import { buildTicket } from "../src/lib/queue";
import * as queue from "../src/server/queue/service";
import { runMatchTick } from "../src/worker/tick";
import { seedCompleteProfile } from "./onboarding-helpers";
import { createTestUser, deleteTestUser, signInAs, type TestUser } from "./support/auth";
import { db } from "./support/db";
import { flushQueueKeys } from "./support/queue";

test.describe.configure({ mode: "serial" });

const GAME = "valorant";

/** Queue a fully-seeded user straight through the service (no browser). */
async function enqueue(user: TestUser): Promise<void> {
  const profile = await db.playerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { games: { include: { game: true } } },
  });
  await queue.joinQueue(
    buildTicket(
      user.id,
      { region: profile.region, languages: profile.languages, games: profile.games },
      GAME,
    ),
  );
}

test.describe("match engine", () => {
  let hero: TestUser;
  let fillers: TestUser[] = [];

  test.beforeEach(async () => {
    hero = await createTestUser();
    await seedCompleteProfile(hero.id, "Hero");

    fillers = [];
    for (let i = 0; i < 4; i += 1) {
      const u = await createTestUser();
      await seedCompleteProfile(u.id, `Filler ${i}`);
      fillers.push(u);
    }
  });

  test.afterEach(async () => {
    const all = [hero, ...fillers];
    await flushQueueKeys(all.map((u) => u.id));
    await db.match.deleteMany({
      where: { players: { some: { userId: { in: all.map((u) => u.id) } } } },
    });
    for (const u of all) await deleteTestUser(u.id);
  });

  test("a browser player sees the match form and can open the lobby", async ({ context, page }) => {
    await signInAs(context, hero);
    await page.goto("/app/queue");

    const row = page.getByRole("listitem").filter({ hasText: "VALORANT" });
    await row.getByRole("button", { name: "Find a squad" }).click();
    await expect(row).toContainText("Leave");

    // The other four join out of band, then the worker runs one tick.
    for (const filler of fillers) await enqueue(filler);
    const results = await runMatchTick();
    expect(results.find((r) => r.gameSlug === GAME)?.matchesFormed).toBe(1);

    // The client learns it was matched over SSE — no reload.
    await expect(row.getByRole("link", { name: "Open lobby" })).toBeVisible();

    await row.getByRole("link", { name: "Open lobby" }).click();
    await expect(page).toHaveURL(/\/app\/match\//);
    await expect(page.getByRole("heading")).toContainText("squad found");
    await expect(page.getByText("Hero")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(5);
  });
});
