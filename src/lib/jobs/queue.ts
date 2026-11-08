import { prisma } from "@/lib/prisma";
import { processPendingJobs } from "./runner";
import { Prisma } from "@prisma/client";

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

/**
 * Enqueues a job into the persistent database queue and asynchronously triggers execution.
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  options?: EnqueueOptions
) {
  const job = await prisma.jobQueue.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      runAt: options?.runAt ?? new Date(),
      maxAttempts: options?.maxAttempts ?? 3,
      status: "PENDING",
    },
  });

  // Fire-and-forget asynchronous execution (non-blocking)
  // This satisfies Section 2: "anything that doesn't need to happen instantly runs as a background job rather than inline"
  if (!options?.runAt || options.runAt <= new Date()) {
    setTimeout(() => {
      processPendingJobs().catch((err) => {
        console.error("Background job runner error:", err);
      });
    }, 0);
  }

  return job;
}
