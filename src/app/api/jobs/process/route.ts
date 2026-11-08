import { NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";

/**
 * Background job processing endpoint.
 * Can be triggered via external cron (e.g. Vercel Cron) or internally.
 */
export async function POST() {
  try {
    const result = await processPendingJobs(20);
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    console.error("Job processor error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to process background jobs" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
