import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Schema-independent connectivity ping. The Phase 0 `HealthCheck` model this
// route was originally built on was dropped in the Phase 1 migration, so this
// now just proves the DB round-trip (SELECT 1) rather than touching a model.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown database error",
        hint: "Check that DATABASE_URL in .env points at a real Postgres instance and that migrations have been run (npx prisma migrate deploy).",
      },
      { status: 500 },
    );
  }
}
