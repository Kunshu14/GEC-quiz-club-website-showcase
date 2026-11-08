"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionSync() {
  const router = useRouter();

  useEffect(() => {
    const handleSignOutEvent = () => {
      // Notify active form components on this page to save state as INTERRUPTED
      window.dispatchEvent(new CustomEvent("gec-abrupt-signout"));

      // Small delay to allow any sync event handlers to run before redirecting
      setTimeout(() => {
        router.push("/?reason=signed_out");
        router.refresh();
      }, 100);
    };

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("gec_auth_sync");
      channel.onmessage = (event) => {
        if (event.data?.type === "SIGN_OUT") {
          handleSignOutEvent();
        }
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "gec_last_signout") {
        handleSignOutEvent();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  return null;
}
