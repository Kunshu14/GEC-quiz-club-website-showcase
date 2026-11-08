"use client";

import { useTransition } from "react";
import { Button, CardShell, HighlighterMark, Tag } from "@/components/ui";

interface DemoRoleSelectorProps {
  onSelectRole: (role: "admin" | "quizmaster" | "member") => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
}

export function DemoRoleSelector({ onSelectRole, onGoogleSignIn }: DemoRoleSelectorProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleClick = (role: "admin" | "quizmaster" | "member") => {
    startTransition(async () => {
      await onSelectRole(role);
    });
  };

  const handleGoogleClick = () => {
    startTransition(async () => {
      await onGoogleSignIn();
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <CardShell tone="cream" className="p-6 text-left border-[3px] border-ink shadow-[5px_5px_0_var(--ink)]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <span className="font-display font-black text-lg text-ink">
              1-Click Interactive Showcase
            </span>
          </div>
          <Tag tone="mint" className="font-mono text-xs">Recruiter Access</Tag>
        </div>

        <p className="mt-3 font-body text-xs sm:text-sm text-ink/80 leading-relaxed">
          Select a role below to explore the application with pre-configured permissions and realistic test data:
        </p>

        <div className="mt-4 grid gap-3">
          {/* Admin Role Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleRoleClick("admin")}
            className="group flex items-start gap-3 p-3.5 border-2 border-ink bg-white hover:bg-yellow transition-colors shadow-[2px_2px_0_var(--ink)] text-left cursor-pointer disabled:opacity-50"
          >
            <div className="text-2xl mt-0.5">🛡️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-ink">
                  Admin Persona
                </span>
                <span className="font-mono text-[11px] bg-ink/10 px-1.5 py-0.5 rounded text-ink font-bold">
                  All Permissions
                </span>
              </div>
              <p className="font-body text-xs text-ink/75 mt-0.5">
                Full governance: RBAC permission matrix, user approval desk, audit logs, question review, and system settings.
              </p>
            </div>
          </button>

          {/* Quizmaster Role Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleRoleClick("quizmaster")}
            className="group flex items-start gap-3 p-3.5 border-2 border-ink bg-white hover:bg-cream transition-colors shadow-[2px_2px_0_var(--ink)] text-left cursor-pointer disabled:opacity-50"
          >
            <div className="text-2xl mt-0.5">🎙️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-ink">
                  Quizmaster Persona
                </span>
                <span className="font-mono text-[11px] bg-ink/10 px-1.5 py-0.5 rounded text-ink font-bold">
                  Builder + QM
                </span>
              </div>
              <p className="font-body text-xs text-ink/75 mt-0.5">
                Quiz creation, running orders, Google Form roster TSV/CSV import, desk check-in, and live scoring.
              </p>
            </div>
          </button>

          {/* Member Role Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleRoleClick("member")}
            className="group flex items-start gap-3 p-3.5 border-2 border-ink bg-white hover:bg-pink/30 transition-colors shadow-[2px_2px_0_var(--ink)] text-left cursor-pointer disabled:opacity-50"
          >
            <div className="text-2xl mt-0.5">💡</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-ink">
                  Club Member Persona
                </span>
                <span className="font-mono text-[11px] bg-ink/10 px-1.5 py-0.5 rounded text-ink font-bold">
                  Standard Member
                </span>
              </div>
              <p className="font-body text-xs text-ink/75 mt-0.5">
                Submit questions, view duplicate checking, review approved pool, and browse tournament leaderboards.
              </p>
            </div>
          </button>
        </div>

        {isPending && (
          <div className="mt-3 text-center font-mono text-xs text-ink font-bold animate-pulse">
            Signing in to demo environment...
          </div>
        )}
      </CardShell>

      {/* Alternative Google Sign-in */}
      <div className="pt-2 border-t border-ink/20 flex flex-col items-center gap-2">
        <p className="font-body text-xs text-ink/60">
          Or test OAuth authentication flow:
        </p>
        <Button
          type="button"
          onClick={handleGoogleClick}
          disabled={isPending}
          variant="alt"
          className="text-xs py-1.5 px-4"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

