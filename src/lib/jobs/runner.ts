import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getSubmissionsLeaderboard,
  getWinnerLeaderboard,
  getDerivedStats,
} from "@/lib/leaderboards";
import {
  notifyUsers,
  notifyCouncilWithPermission,
  createNotification,
} from "@/lib/notifications";
import { NotificationType } from "@prisma/client";

/**
 * Executes a single claimed job.
 */
export async function executeJob(job: { id: string; type: string; payload: unknown }) {
  const payload = (job.payload && typeof job.payload === "object" ? job.payload : {}) as Record<string, unknown>;

  switch (job.type) {
    case "RECALCULATE_LEADERBOARD": {
      // Revalidate Next.js cache
      try {
        revalidatePath("/leaderboard");
        revalidatePath("/dashboard");
      } catch {
        // Ignored if outside request context
      }

      // Compute fresh leaderboards
      await Promise.all([
        getSubmissionsLeaderboard(),
        getWinnerLeaderboard(),
        getDerivedStats(),
      ]);
      return { success: true, recalculatedAt: new Date().toISOString() };
    }

    case "DISPATCH_NOTIFICATION": {
      const type = (payload.type as NotificationType) || NotificationType.SYSTEM;
      const title = String(payload.title || "Notification");
      const message = String(payload.message || "");
      const linkUrl = (payload.linkUrl ?? payload.link) ? String(payload.linkUrl ?? payload.link) : undefined;

      if (payload.userId) {
        await createNotification({
          userId: String(payload.userId),
          type,
          title,
          message,
          linkUrl,
        });
      } else if (Array.isArray(payload.userIds) && payload.userIds.length > 0) {
        await notifyUsers(payload.userIds.map(String), {
          type,
          title,
          message,
          linkUrl,
        });
      } else if (payload.permissionKey) {
        await notifyCouncilWithPermission(
          String(payload.permissionKey),
          { type, title, message, linkUrl },
          payload.excludeUserId ? String(payload.excludeUserId) : undefined
        );
      }
      return { success: true, dispatched: true };
    }

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * Claims and executes pending jobs from the database queue.
 */
export async function processPendingJobs(batchSize = 10): Promise<{ processed: number; errors: number }> {
  const now = new Date();

  // Find pending jobs that are ready to run
  const pendingJobs = await prisma.jobQueue.findMany({
    where: {
      status: "PENDING",
      runAt: { lte: now },
    },
    orderBy: { runAt: "asc" },
    take: batchSize,
  });

  if (pendingJobs.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const job of pendingJobs) {
    // Atomically claim the job
    const claimed = await prisma.jobQueue.updateMany({
      where: {
        id: job.id,
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      // Job was claimed by another worker concurrently
      continue;
    }

    try {
      await executeJob(job);

      // Mark completed
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          error: null,
        },
      });
      processed++;
    } catch (err: unknown) {
      errors++;
      const errorMessage = (err as Error)?.message || "Unknown error";
      const nextAttempt = job.attempts + 1;
      const isFailed = nextAttempt >= job.maxAttempts;

      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: isFailed ? "FAILED" : "PENDING",
          error: errorMessage,
          // Exponential backoff for retry: 30s, 2m, etc.
          runAt: new Date(Date.now() + Math.pow(2, nextAttempt) * 15 * 1000),
        },
      });
    }
  }

  return { processed, errors };
}
