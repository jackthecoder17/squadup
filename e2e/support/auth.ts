import "dotenv/config";

import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { db } from "./db";

// Auth.js v5 with JWT sessions over http uses this cookie name and salts the
// JWE with it. Mirrors what the real Discord sign-in would set.
const COOKIE_NAME = "authjs.session-token";

export type TestUser = { id: string; name: string; email: string };

export async function createTestUser(): Promise<TestUser> {
  const suffix = Math.random().toString(36).slice(2, 10);
  const user = await db.user.create({
    data: { name: `E2E ${suffix}`, email: `e2e-${suffix}@example.test` },
  });
  return { id: user.id, name: user.name ?? "", email: user.email ?? "" };
}

export async function deleteTestUser(id: string): Promise<void> {
  await db.user.delete({ where: { id } }).catch(() => {});
}

/** Add a valid Auth.js session cookie for `user` to the browser context. */
export async function signInAs(context: BrowserContext, user: TestUser): Promise<void> {
  const token = await encode({
    salt: COOKIE_NAME,
    secret: process.env.AUTH_SECRET!,
    maxAge: 60 * 60,
    token: { sub: user.id, id: user.id, name: user.name, email: user.email },
  });

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);
}
