import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { env } from "./env";

/**
 * Single-user magic-link auth. Only the email in ALLOWED_LOGIN_EMAIL can sign in.
 * This is a single-tenant product for Marcelo; if expanded later, swap for a role model.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login?check=1" },
  providers: [
    EmailProvider({
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT ? Number(env.EMAIL_SERVER_PORT) : 587,
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: env.EMAIL_FROM ?? "ErroZero <no-reply@errozero.online>",
      maxAge: 10 * 60, // 10 min
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = env.ALLOWED_LOGIN_EMAIL.toLowerCase();
      return user.email?.toLowerCase() === allowed;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
