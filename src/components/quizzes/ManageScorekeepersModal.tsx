"use client";

import { useState, useTransition } from "react";
import { Button, Tag, SearchIcon, CheckIcon, XIcon } from "@/components/ui";
import { updateQuizScorekeepers } from "@/app/quizzes/actions";

interface CouncilMember {
  id: string;
  name: string | null;
  email: string;
  role: { name: string };
}

interface ManageScorekeepersModalProps {
  quizId: string;
  quizTitle: string;
  currentScorekeeperIds: string[];
  councilMembers: CouncilMember[];
  canManage: boolean;
}

export function ManageScorekeepersModal({
  quizId,
  quizTitle,
  currentScorekeeperIds,
  councilMembers,
  canManage,
}: ManageScorekeepersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(currentScorekeeperIds);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!canManage) return null;

  const handleOpen = () => {
    setSelectedIds(currentScorekeeperIds);
    setSearch("");
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("quizId", quizId);
    for (const id of selectedIds) {
      formData.append("scorekeeperUserIds", id);
    }

    startTransition(async () => {
      const res = await updateQuizScorekeepers(formData);
      if (!res.ok) {
        setError(res.error || "Failed to update scorekeepers.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 800);
      }
    });
  };

  const filteredMembers = councilMembers.filter((m) => {
    const term = search.toLowerCase();
    return (
      (m.name?.toLowerCase().includes(term) ?? false) ||
      m.email.toLowerCase().includes(term) ||
      m.role.name.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 border border-ink bg-mint px-2 py-0.5 font-body text-xs font-bold text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-mint/80 transition-colors"
      >
        <span>+ Assign Desk</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg border-4 border-ink bg-cream p-6 shadow-[8px_8px_0_var(--ink)] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
              <div>
                <span className="inline-block border border-ink bg-yellow px-2 py-0.5 font-display text-[11px] uppercase tracking-wider font-bold">
                  Event Desk Setup
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold text-ink">
                  Designate Scorekeepers
                </h3>
                <p className="mt-0.5 font-body text-xs text-ink/70">
                  Assign council members operating the scoring desk for <strong className="text-ink">{quizTitle}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="border-2 border-ink bg-white p-1 hover:bg-pink text-ink transition-colors shadow-[2px_2px_0_var(--ink)]"
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Info Notice */}
            <div className="mt-3 border border-ink/40 bg-white/70 p-2.5 font-body text-[11px] text-ink/80">
              ⚡ <strong>Desk Authorization:</strong> Scorekeepers can check in arriving teams, auto-assign table seating, and enter live scores without exposing confidential quiz questions.
            </div>

            {/* Search Input */}
            <div className="mt-3 relative">
              <span className="absolute left-2.5 top-2.5 text-ink/50">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-2 border-ink bg-white py-1.5 pl-8 pr-3 font-body text-xs text-ink shadow-[2px_2px_0_var(--ink)] focus:outline-none"
              />
            </div>

            {/* Member List */}
            <form onSubmit={handleSave} className="mt-3 flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto border-2 border-ink bg-white p-2 flex flex-col gap-1.5 shadow-[inset_2px_2px_0_rgba(0,0,0,0.05)]">
                {filteredMembers.length === 0 ? (
                  <p className="py-6 text-center font-body text-xs text-ink/50 italic">
                    No council members found.
                  </p>
                ) : (
                  filteredMembers.map((member) => {
                    const isChecked = selectedIds.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 border p-2 text-xs transition-colors ${
                          isChecked
                            ? "border-ink bg-mint/30 shadow-[1px_1px_0_var(--ink)] font-semibold"
                            : "border-ink/20 bg-white hover:bg-cream/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by label click
                            className="h-4 w-4 border-2 border-ink accent-yellow cursor-pointer"
                          />
                          <span className="truncate font-body text-ink">
                            {member.name ?? member.email}
                          </span>
                        </div>
                        <Tag tone="lavender" className="text-[10px] shrink-0">
                          {member.role.name}
                        </Tag>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Status and Error */}
              {error && (
                <div className="mt-2 border-2 border-ink bg-pink/30 p-2 font-body text-xs font-bold text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-2 border-2 border-ink bg-mint p-2 font-body text-xs font-bold text-ink flex items-center gap-1.5">
                  <CheckIcon size={14} className="text-forest" /> Desk scorekeepers updated!
                </div>
              )}

              {/* Footer Buttons */}
              <div className="mt-4 flex items-center justify-between border-t-2 border-ink pt-3">
                <span className="font-body text-xs text-ink/70">
                  {selectedIds.length} scorekeeper{selectedIds.length === 1 ? "" : "s"} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="alt" onClick={handleClose} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending}
                    className="text-xs min-w-[100px]"
                  >
                    {isPending ? "Saving..." : "Save Desk Roster"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
