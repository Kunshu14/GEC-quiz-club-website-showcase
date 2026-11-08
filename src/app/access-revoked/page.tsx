import { redirect } from "next/navigation";
import { CardShell, HighlighterMark } from "@/components/ui";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getViewer } from "@/lib/access";

export const dynamic = "force-dynamic";

// Section 5.5: "A revoked user is redirected to an explicit 'access
// revoked' screen, never a silent failure."
export default async function AccessRevokedPage() {
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "unregistered") redirect("/request-access");
  if (viewer.kind === "member") redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-24 text-center">
      <h1 className="max-w-xl text-4xl">
        <HighlighterMark tone="orange">Access revoked</HighlighterMark>
      </h1>

      <CardShell tone="orange" className="max-w-md">
        <p className="font-body text-sm">
          Your access to this site has been revoked. Only a fresh invite
          from a council Admin can restore it — you can&apos;t request access
          again yourself.
        </p>
      </CardShell>

      <p className="max-w-md font-body text-sm text-ink">
        Signed in as <strong>{viewer.email}</strong>. If you think this is a
        mistake, contact the council directly.
      </p>

      <SignOutButton />
    </main>
  );
}
