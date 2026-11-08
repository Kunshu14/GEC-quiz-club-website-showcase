import { FramedPanel, HighlighterMark } from "@/components/ui";

export default function RootLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center justify-center gap-6 px-10 py-24 text-center">
      <FramedPanel tone="cream" tilt={false} className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin border-[3px] border-ink border-t-transparent rounded-full" />
          <h2 className="text-xl">
            <HighlighterMark tone="yellow">Loading</HighlighterMark>...
          </h2>
          <p className="font-body text-xs text-ink opacity-70 uppercase tracking-widest font-bold">
            Retrieving council records
          </p>
        </div>
      </FramedPanel>
    </main>
  );
}
