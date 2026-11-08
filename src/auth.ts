import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { getRoleIdByName, MEMBER_ROLE_NAME } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "demo-login",
      name: "Demo Login",
      credentials: {
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const role = credentials?.role as string;
        if (role === "admin") {
          return {
            id: "demo-admin-id",
            name: "Demo Admin",
            email: "demo.admin@quizclub.dev",
          };
        }
        if (role === "quizmaster") {
          return {
            id: "demo-qm-id",
            name: "Demo Quizmaster",
            email: "demo.quizmaster@quizclub.dev",
          };
        }
        if (role === "member") {
          return {
            id: "demo-member-id",
            name: "Demo Member",
            email: "demo.member@quizclub.dev",
          };
        }
        return null;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (user.name && user.name !== existing.name) {
          await prisma.user.update({ where: { email }, data: { name: user.name } });
        }
        return true;
      }

      // Showcase Auto-Provisioning for Demo Users
      if (email.endsWith("@quizclub.dev")) {
        let targetRoleName = "Member";
        if (email.includes("admin")) targetRoleName = "Admin";
        else if (email.includes("quizmaster")) targetRoleName = "Head of Quizzing";

        let role = await prisma.role.findFirst({ where: { name: targetRoleName } });
        if (!role) {
          role = await prisma.role.findFirst({ where: { isSystem: true } });
        }

        if (role) {
          await prisma.user.create({
            data: {
              email,
              name: user.name ?? "Demo User",
              roleId: role.id,
              status: "ACTIVE",
            },
          });
          return true;
        }
      }

      const invited = await prisma.accessRequest.findFirst({
        where: { email, status: "INVITED" },
        orderBy: { requestedAt: "desc" },
      });

      if (invited) {
        const memberRoleId = await getRoleIdByName(MEMBER_ROLE_NAME);
        if (!memberRoleId) return true;

        await prisma.user.create({
          data: {
            email,
            name: user.name ?? undefined,
            roleId: memberRoleId,
            status: "ACTIVE",
          },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email.toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  trustHost: true,
});
