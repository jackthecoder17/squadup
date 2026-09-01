import { expect, test } from "@playwright/test";

import { buildTicket } from "../src/lib/queue";
import * as queue from "../src/server/queue/service";
import { runMatchTick } from "../src/worker/tick";
import { seedCompleteProfile, seedMatch } from "./onboarding-helpers";
import { createTestUser, deleteTestUser, signInAs, type TestUser } from "./support/auth";
import { db } from "./support/db";
import { flushQueueKeys } from "./support/queue";

test.describe.configure({ mode: "serial" });

const GAME = "valorant";

test.describe("live dashboard", () => {
  let viewer: TestUser;
  let players: TestUser[] = [];

  test.beforeEach(async () => {
    viewer = await createTestUser();
    await seedCompleteProfile(viewer.id, "Watcher");

    players = [];
    for (let i = 0; i < 5; i += 1) {
      const u = await createTestUser();
      await seedCompleteProfile(u.id, `Player ${i}`);
      players.push(u);
    }
    await seedMatch([players[0].id, players[1].id]);
  });

  test.afterEach(async () => {
    const all = [viewer, ...players];
    await flushQueueKeys(all.map((u) => u.id));
    await db.match.deleteMany({
      where: { players: { some: { userId: { in: all.map((u) => u.id) } } } },
    });
    for (const u of all) await deleteTestUser(u.id);
  });

  test("reflects queue changes and match formation live", async ({ context, page }) => {
    await signInAs(context, viewer);
    await page.goto("/app/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "Live" })).toBeVisible();

    // The pre-seeded match shows in the feed.
    const feed = page.locator("section", { hasText: "Matches forming" });
    await expect(feed.getByRole("listitem")).not.toHaveCount(0);

    const valorantRow = page
      .locator("section", { hasText: "Queues" })
      .getByRole("listitem")
      .filter({ hasText: "VALORANT" });
    await expect(valorantRow).toContainText("0");

    // Five players queue for Valorant out of band.
    for (const player of players) {
      const profile = await db.playerProfile.findUniqueOrThrow({
        where: { userId: player.id },
        include: { games: { include: { game: true } } },
      });
      await queue.joinQueue(
        buildTicket(
          player.id,
          { region: profile.region, languages: profile.languages, games: profile.games },
          GAME,
        ),
      );
    }

    // The dashboard count climbs to 5 over SSE, no reload.
    await expect(valorantRow).toContainText("5");

    // The worker forms a match; the queue drains over SSE.
    await runMatchTick();
    await expect(valorantRow).toContainText("0");
  });
});
