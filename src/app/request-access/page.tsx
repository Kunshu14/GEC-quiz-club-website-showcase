import { redirect } from "next/navigation";
import { CardShell, HighlighterMark, Tag } from "@/components/ui";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getViewer } from "@/lib/access";
import { RequestAccessForm } from "./RequestAccessForm";

export const dynamic = "force-dynamic";

// Section 5.2: "Login with no approved/invited row -> 'Request access'
// screen, not the site." This page IS that screen.
export default async function RequestAccessPage() {
  const viewer = await getViewer();

  if (viewer.kind === "anonymous") redirect("/");
  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "member") redirect("/dashboard");

  const { latestAccessRequest, denialCount, capped } = viewer;
  const isPending = latestAccessRequest?.status === "PENDING";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-24 text-center">
      <h1 className="max-w-xl text-4xl">
        <HighlighterMark tone="lavender">Request access</HighlighterMark>
      </h1>

      <p className="max-w-md font-body text-base text-ink">
        Signed in as <strong>{viewer.email}</strong>. This site is for GEC
        Quiz Club council members only — an admin needs to approve your
        account before you can get in.
      </p>

      {isPending ? (
        <CardShell tone="yellow" className="max-w-md">
          <Tag tone="ink" className="mb-3">
            Pending
          </Tag>
          <p className="font-body text-sm">
            Your request is awaiting review. Check back later, or reach out
            to the council directly if it&apos;s been a while.
          </p>
        </CardShell>
      ) : capped ? (
        <CardShell tone="orange" className="max-w-md">
          <p className="font-body text-sm">
            This email has been denied too many times to request again here.
            Contact the council directly if you think this is a mistake.
          </p>
        </CardShell>
      ) : (
        <>
          {denialCount > 0 && (
            <p className="max-w-md font-body text-sm text-ink">
              A previous request from this email was denied. You can submit
              a new one below.
            </p>
          )}
          <RequestAccessForm />
        </>
      )}

      <SignOutButton />
    </main>
  );
}
