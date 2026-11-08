import Image from "next/image";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { DismissibleNotice, FramedPanel, HighlighterMark, Tag } from "@/components/ui";
import { DemoRoleSelector } from "@/components/auth/DemoRoleSelector";
import { getViewer } from "@/lib/access";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { reason } = await searchParams;
  const viewer = await getViewer();

  if (viewer.kind === "revoked") redirect("/access-revoked");
  if (viewer.kind === "unregistered") redirect("/request-access");
  if (viewer.kind === "member") redirect("/dashboard");

  async function handleDemoSignIn(role: "admin" | "quizmaster" | "member") {
    "use server";
    await signIn("demo-login", { role, redirectTo: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream/40">
      {/* Top Portfolio Notice */}
      <div className="bg-yellow border-b-2 border-ink px-4 py-2 text-center text-xs font-mono font-bold text-ink flex items-center justify-center gap-2">
        <span>✨ PORTFOLIO SHOWCASE:</span>
        <span className="font-body font-normal">
          Interactive full-stack council management system. All features unlocked for demonstration.
        </span>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        {reason === "signed_out" && (
          <DismissibleNotice tone="yellow" paramToClear="reason" className="max-w-md text-left">
            You have been signed out. Any work in progress was saved.
          </DismissibleNotice>
        )}

        <div className="relative inline-block">
          <FramedPanel tone="cream" className="!p-4">
            <Image src="/logo.png" alt="Quiz Club crest" width={110} height={110} unoptimized />
          </FramedPanel>
        </div>

        <div className="max-w-2xl space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black font-display text-ink">
            Quiz Club <HighlighterMark tone="yellow">Council Suite</HighlighterMark>
          </h1>
          <p className="font-body text-sm sm:text-base text-ink/80 max-w-lg mx-auto">
            Full-stack tournament operations platform: Question curation & duplicate detection, dynamic quiz building, PPTX slide exports, Google Form roster imports, and live desk scoring.
          </p>
        </div>

        {/* 1-Click Showcase Authentication */}
        <DemoRoleSelector onSelectRole={handleDemoSignIn} />
      </main>
    </div>
  );
}
