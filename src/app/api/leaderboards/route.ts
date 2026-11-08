import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionsLeaderboard,
  getWinnerLeaderboard,
  getDerivedStats,
} from "@/lib/leaderboards";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const academicYear = searchParams.get("year") || undefined;
    const semester = searchParams.get("semester") || undefined;

    if (type === "submissions") {
      const data = await getSubmissionsLeaderboard({ academicYear, semester });
      return NextResponse.json(data);
    }

    if (type === "winners") {
      const data = await getWinnerLeaderboard({ academicYear });
      return NextResponse.json(data);
    }

    if (type === "trivia") {
      const data = await getDerivedStats();
      return NextResponse.json(data);
    }

    // Default: return all three
    const [submissions, winners, trivia] = await Promise.all([
      getSubmissionsLeaderboard({ academicYear, semester }),
      getWinnerLeaderboard({ academicYear }),
      getDerivedStats(),
    ]);

    return NextResponse.json({
      submissions,
      winners,
      trivia,
    });
  } catch (error: any) {
    console.error("Leaderboards API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load leaderboards" },
      { status: 500 }
    );
  }
}
