"use server";

import { revalidatePath } from "next/cache";
import { DENIAL_CAP, getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export type SubmitAccessRequestResult = { error: string } | { ok: true };

/**
 * Path A — self-requested access (Section 5.2). Re-checks everything
 * server-side rather than trusting the page's rendered state, since the
 * page is just a UI convenience, not the actual gate (Section 4).
 */
export async function submitAccessRequest(
  _prev: SubmitAccessRequestResult | null,
  formData: FormData,
): Promise<SubmitAccessRequestResult> {
  const viewer = await getViewer();

  if (viewer.kind !== "unregistered") {
    return { error: "You already have an account or a pending request." };
  }

  if (viewer.denialCount >= DENIAL_CAP) {
    return {
      error:
        "This email has been denied too many times. Contact the council directly instead.",
    };
  }

  if (viewer.latestAccessRequest?.status === "PENDING") {
    return { error: "You already have a request awaiting review." };
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  await prisma.accessRequest.create({
    data: {
      email: viewer.email,
      note: note.length > 0 ? note : null,
      status: "PENDING",
    },
  });

  revalidatePath("/request-access");
  return { ok: true };
}
