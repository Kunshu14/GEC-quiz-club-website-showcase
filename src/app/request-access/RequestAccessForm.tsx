"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { submitAccessRequest } from "./actions";

export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(submitAccessRequest, null);

  if (state && "ok" in state) {
    return (
      <p className="font-body text-sm text-ink">
        Request sent. An admin will review it — check back here for updates.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-left font-body text-sm">
        <span className="font-bold uppercase tracking-wide">
          Note for the council (optional)
        </span>
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="e.g. I'm a member of the club, joined this semester..."
          className="border-[3px] border-ink bg-cream p-3 font-body text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      {state && "error" in state && (
        <p className="font-body text-sm font-bold text-orange">{state.error}</p>
      )}

      <Button type="submit" variant="primary" disabled={pending} className="self-start">
        {pending ? "Sending..." : "Request access"}
      </Button>
    </form>
  );
}
