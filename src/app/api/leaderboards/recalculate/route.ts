import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/access";
import {
  getSubmissionsLeaderboard,
  getWinnerLeaderboard,
  getDerivedStats,
} from "@/lib/leaderboards";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const viewer = await getViewer();
    if (viewer.kind !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Revalidate paths that display leaderboard stats
    revalidatePath("/leaderboard");
    revalidatePath("/dashboard");

    // Fetch fresh stats immediately
    const [submissions, winners, trivia] = await Promise.all([
      getSubmissionsLeaderboard(),
      getWinnerLeaderboard(),
      getDerivedStats(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Leaderboards recalculated successfully",
      timestamp: new Date().toISOString(),
      summary: {
        totalContributors: submissions.totalContributors,
        totalChampions: winners.totalChampions,
        totalQuizzesRecorded: trivia.totalQuizzesRecorded,
      },
    });
  } catch (error: any) {
    console.error("Recalculate Leaderboard Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to recalculate leaderboards" },
      { status: 500 }
    );
  }
}
