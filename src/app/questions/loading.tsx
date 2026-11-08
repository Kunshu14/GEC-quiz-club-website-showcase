import { CardShell, FramedPanel, HighlighterMark } from "@/components/ui";

export default function QuestionsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-10 py-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-4xl">
          <HighlighterMark tone="yellow">Question</HighlighterMark> pool
        </h1>
        <div className="flex items-center gap-4">
          <div className="h-11 w-32 border-[3px] border-ink bg-ink/20" />
          <div className="h-6 w-36 bg-ink/20" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <FramedPanel tone="cream" tilt={false} className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1 w-64">
            <div className="h-4 w-16 bg-ink/20" />
            <div className="h-10 border-[3px] border-ink bg-white/60" />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <div className="h-4 w-20 bg-ink/20" />
            <div className="h-10 border-[3px] border-ink bg-white/60" />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <div className="h-4 w-20 bg-ink/20" />
            <div className="h-10 border-[3px] border-ink bg-white/60" />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <div className="h-4 w-16 bg-ink/20" />
            <div className="h-10 border-[3px] border-ink bg-white/60" />
          </div>
        </div>
      </FramedPanel>

      {/* Tally skeleton */}
      <CardShell tone="cream" className="max-w-lg">
        <div className="h-4 w-48 bg-ink/30 mb-1" />
        <div className="h-3 w-32 bg-ink/20" />
      </CardShell>

      {/* Question card skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <CardShell key={i} tone="cream" className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl w-full flex flex-col gap-2">
              <div className="h-5 w-3/4 bg-ink/40" />
              <div className="h-4 w-1/2 bg-ink/25" />
              <div className="mt-2 flex gap-2">
                <div className="h-6 w-16 border-[2px] border-ink bg-yellow/40" />
                <div className="h-6 w-20 border-[2px] border-ink bg-mint/40" />
                <div className="h-6 w-28 border-[2px] border-ink bg-ink/20" />
              </div>
            </div>
            <div className="h-10 w-20 border-[3px] border-ink bg-cream" />
          </CardShell>
        ))}
      </div>
    </main>
  );
}
