"use client";

import { Button } from "@/components/ui";
import { handleSignOut } from "./actions";

export function SignOutButton() {
  const onSubmit = () => {
    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("gec_auth_sync");
        channel.postMessage({ type: "SIGN_OUT" });
        channel.close();
      }
      localStorage.setItem("gec_last_signout", String(Date.now()));
    } catch {
      // Ignore storage/broadcast restriction errors
    }
  };

  return (
    <form action={handleSignOut} onSubmit={onSubmit}>
      <Button type="submit" variant="underline">
        Sign out
      </Button>
    </form>
  );
}
