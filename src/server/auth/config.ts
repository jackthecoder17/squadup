import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

import { db } from "@/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * JWT sessions, not database sessions: Next.js 16's `proxy` (formerly
 * `middleware`) runs on the Node runtime, but keeping the session in the
 * token avoids a DB round trip on every request and matches how `auth()`
 * is meant to be called from Server Components, Server Actions, and the
 * proxy alike. The Prisma adapter still persists users/accounts/verification
 * tokens — only the *session* lives in the JWT.
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [Discord],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.id as string },
    }),
  },
} satisfies NextAuthConfig;
