"use client";

import { useState, useMemo } from "react";
import {
  Button,
  CardShell,
  Tag,
  UploadIcon,
  ZapIcon,
  UserIcon,
  TrashIcon,
  CheckIcon,
  ExternalLinkIcon,
  XIcon,
  GlobeIcon,
} from "@/components/ui";
import { GoogleFormImportModal } from "./GoogleFormImportModal";

export interface ParticipantItem {
  id: string;
  name: string;
  email?: string | null;
  college?: string | null;
}

export interface TeamMemberItem {
  id: string;
  participantId: string;
  seatNo?: number | null;
  participant: ParticipantItem;
}

export interface RosterItem {
  id: string;
  quizId: string;
  teamName: string;
  seatNo: number | null;
  status: "CONFIRMED" | "NO_SHOW";
  teamMembers: TeamMemberItem[];
  totalPoints?: number;
}

interface RosterChecklistProps {
  quizId: string;
  initialRoster: RosterItem[];
  canEdit: boolean;
  mode?: "IN_PERSON" | "ONLINE" | "HYBRID";
  venueOrPlatform?: string | null;
  onRosterUpdated?: () => void;
}

export function RosterChecklist({
  quizId,
  initialRoster,
  canEdit,
  mode = "IN_PERSON",
  venueOrPlatform,
  onRosterUpdated,
}: RosterChecklistProps) {
  const [roster, setRoster] = useState<RosterItem[]>(initialRoster);
  const [filterTab, setFilterTab] = useState<"all" | "seated" | "unseated" | "noshow">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSeatRosterId, setEditingSeatRosterId] = useState<string | null>(null);
  const [customSeatInput, setCustomSeatInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Online mode terminology & helpers
  const isOnline = mode === "ONLINE" || mode === "HYBRID";
  const seatLabel = isOnline ? "Breakout Room" : "Seat";
  const shortSeatLabel = isOnline ? "Room" : "Seat";
  const isMeetingUrl = Boolean(
    venueOrPlatform &&
      (/^https?:\/\//i.test(venueOrPlatform) ||
        venueOrPlatform.includes("meet.google.com") ||
        venueOrPlatform.includes("zoom.us") ||
        venueOrPlatform.includes("discord")),
  );

  // Walk-in form state
  const [walkInTeamName, setWalkInTeamName] = useState("");
  const [walkInSeatNo, setWalkInSeatNo] = useState("");
  const [walkInMembers, setWalkInMembers] = useState<string[]>(["", "", ""]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = roster.length;
    const seated = roster.filter((r) => r.seatNo !== null && r.status !== "NO_SHOW").length;
    const unseated = roster.filter((r) => r.seatNo === null && r.status !== "NO_SHOW").length;
    const noshow = roster.filter((r) => r.status === "NO_SHOW").length;
    return { total, seated, unseated, noshow };
  }, [roster]);

  // Find lowest available seat number
  const nextAvailableSeat = useMemo(() => {
    const assignedSeats = new Set(
      roster.map((r) => r.seatNo).filter((s): s is number => s !== null && s !== undefined),
    );
    let seat = 1;
    while (assignedSeats.has(seat)) {
      seat++;
    }
    return seat;
  }, [roster]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // Tab filter
      if (filterTab === "seated" && (item.seatNo === null || item.status === "NO_SHOW")) return false;
      if (filterTab === "unseated" && (item.seatNo !== null || item.status === "NO_SHOW")) return false;
      if (filterTab === "noshow" && item.status !== "NO_SHOW") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTeam = item.teamName.toLowerCase().includes(q);
        const matchesSeat = item.seatNo !== null && String(item.seatNo).includes(q);
        const matchesMember = item.teamMembers.some((m) =>
          m.participant.name.toLowerCase().includes(q),
        );
        return matchesTeam || matchesSeat || matchesMember;
      }

      return true;
    });
  }, [roster, filterTab, searchQuery]);

  const refreshRoster = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster`);
      if (res.ok) {
        const data = await res.json();
        setRoster(data.roster || []);
        onRosterUpdated?.();
      }
    } catch {
      // ignore
    }
  };

  const handleAssignSeat = async (rosterId: string, seatNo: number | null) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, seatNo }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign seat");
      }

      setEditingSeatRosterId(null);
      setSuccessMessage(seatNo ? `Assigned to ${seatLabel} #${seatNo}` : `${seatLabel} unassigned`);
      await refreshRoster();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || `Failed to update ${seatLabel.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoAssignAll = async () => {
    if (stats.unseated === 0) return;
    if (
      !confirm(
        `Auto-assign sequential ${seatLabel.toLowerCase()} numbers (1, 2, 3...) to all ${stats.unseated} unassigned teams?`,
      )
    ) {
      return;
    }

    setIsBatchAssigning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoAssignAll: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to auto-assign");
      }

      setSuccessMessage(`Auto-assigned ${data.assignedCount} teams to ${seatLabel.toLowerCase()}s!`);
      await refreshRoster();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to auto-assign seats");
    } finally {
      setIsBatchAssigning(false);
    }
  };

  const handleToggleStatus = async (rosterId: string, currentStatus: "CONFIRMED" | "NO_SHOW") => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const newStatus = currentStatus === "CONFIRMED" ? "NO_SHOW" : "CONFIRMED";

    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setSuccessMessage(newStatus === "NO_SHOW" ? "Marked as No-Show" : "Marked as Confirmed");
      await refreshRoster();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to toggle status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async (rosterId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to remove team "${teamName}"?`)) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster?rosterId=${rosterId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete team");
      }

      setSuccessMessage(`Team "${teamName}" removed`);
      await refreshRoster();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to delete team");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInTeamName.trim()) {
      setErrorMessage("Team or participant name is required");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const members = walkInMembers
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    // If no members entered, default to the team name as a solo participant
    if (members.length === 0) {
      members.push({ name: walkInTeamName.trim() });
    }

    const parsedSeat = walkInSeatNo.trim() ? parseInt(walkInSeatNo.trim(), 10) : nextAvailableSeat;

    try {
      const res = await fetch(`/api/quizzes/${quizId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: walkInTeamName.trim(),
          seatNo: parsedSeat,
          members,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add team");
      }

      // Reset form
      setWalkInTeamName("");
      setWalkInSeatNo("");
      setWalkInMembers(["", "", ""]);
      setIsWalkInOpen(false);
      setSuccessMessage(`"${data.rosterItem.teamName}" added as ${seatLabel} #${parsedSeat}!`);
      await refreshRoster();
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Failed to add team");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Venue Checklist Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[3px] border-ink bg-cream p-4 shadow-[4px_4px_0_var(--ink)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-display text-xl sm:text-2xl text-ink">
              {isOnline ? (
                <>
                  <GlobeIcon size={22} className="inline-block shrink-0" />
                  <span>Online Breakouts & Roster</span>
                </>
              ) : (
                "Venue Check-In & Roster"
              )}
            </h2>
            <Tag tone="yellow" className="font-mono text-xs">
              {stats.seated} / {stats.total} {isOnline ? "Assigned" : "Seated"}
            </Tag>
            {isOnline && (
              <Tag tone="lavender" className="font-mono text-xs">
                Online Mode
              </Tag>
            )}
            {isMeetingUrl && (
              <a
                href={venueOrPlatform!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 border-2 border-ink bg-white px-2 py-0.5 font-mono text-xs font-bold text-ink hover:bg-yellow shadow-[2px_2px_0_var(--ink)] transition-colors"
              >
                <ExternalLinkIcon size={12} /> Meeting Room
              </a>
            )}
          </div>
          <p className="mt-1 font-body text-xs text-ink/75">
            {isOnline
              ? "Manage online participants, breakout room assignments, and Google Form response sheets."
              : "Assign seats as teams arrive at the registration desk. Supports live walk-ins and no-show flags."}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              variant="alt"
              className="cursor-pointer font-bold text-xs sm:text-sm inline-flex items-center"
            >
              <UploadIcon size={14} className="mr-1.5" /> Import Form / Sheet
            </Button>

            {stats.unseated > 0 && (
              <Button
                type="button"
                onClick={handleAutoAssignAll}
                variant="alt"
                disabled={isBatchAssigning}
                className="cursor-pointer font-bold text-xs sm:text-sm bg-yellow/80 hover:bg-yellow inline-flex items-center"
              >
                {isBatchAssigning ? (
                  "Assigning..."
                ) : (
                  <>
                    <ZapIcon size={14} className="mr-1.5" />
                    {isOnline ? "Auto-Assign Breakouts" : "Auto-Assign Seats"}
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              onClick={() => {
                setWalkInSeatNo(String(nextAvailableSeat));
                setIsWalkInOpen(true);
              }}
              variant="primary"
              className="cursor-pointer font-bold text-xs sm:text-sm inline-flex items-center"
            >
              <ZapIcon size={14} className="mr-1.5" />
              {isOnline ? "Add Participant / Team" : "Add Walk-In Team"}
            </Button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div className="border-[3px] border-ink bg-pink p-3 font-body text-xs font-bold text-ink shadow-[3px_3px_0_var(--ink)] flex items-center gap-2">
          <XIcon size={14} /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="border-[3px] border-ink bg-yellow p-3 font-body text-xs font-bold text-ink shadow-[3px_3px_0_var(--ink)]">
          ✓ {successMessage}
        </div>
      )}

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 font-body text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`border-2 border-ink px-3 py-1.5 font-bold transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-ink text-white shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink hover:bg-cream"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("seated")}
            className={`border-2 border-ink px-3 py-1.5 font-bold transition-all cursor-pointer ${
              filterTab === "seated"
                ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink hover:bg-cream"
            }`}
          >
            {isOnline ? "Assigned" : "Seated"} ({stats.seated})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("unseated")}
            className={`border-2 border-ink px-3 py-1.5 font-bold transition-all cursor-pointer ${
              filterTab === "unseated"
                ? "bg-pink text-ink shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink hover:bg-cream"
            }`}
          >
            {isOnline ? "Unassigned" : "Unseated"} ({stats.unseated})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("noshow")}
            className={`border-2 border-ink px-3 py-1.5 font-bold transition-all cursor-pointer ${
              filterTab === "noshow"
                ? "bg-lavender text-ink shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink hover:bg-cream"
            }`}
          >
            No-Show ({stats.noshow})
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search team, ${shortSeatLabel.toLowerCase()} #, participant...`}
            className="w-full border-2 border-ink bg-white px-3 py-1.5 font-body text-xs shadow-[2px_2px_0_var(--ink)] placeholder:text-ink/40 focus:outline-none focus:bg-yellow/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-xs text-ink/60 hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Roster Cards List */}
      {filteredRoster.length === 0 ? (
        <CardShell tone="cream" className="border-2 border-dashed border-ink/40 p-8 text-center">
          <p className="font-body text-sm text-ink/70">
            {searchQuery ? "No teams matched your search." : "No teams in this roster list yet."}
          </p>
          {canEdit && !searchQuery && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                variant="alt"
                className="text-xs font-bold inline-flex items-center"
              >
                <UploadIcon size={14} className="mr-1.5" /> Import Google Form / Sheet
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setWalkInSeatNo(String(nextAvailableSeat));
                  setIsWalkInOpen(true);
                }}
                variant="primary"
                className="text-xs font-bold"
              >
                {isOnline ? "Add First Participant / Team" : "Add First Walk-In Team"}
              </Button>
            </div>
          )}
        </CardShell>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRoster.map((item) => {
            const isSeated = item.seatNo !== null && item.seatNo !== undefined;
            const isNoShow = item.status === "NO_SHOW";
            const isEditingThisSeat = editingSeatRosterId === item.id;
            const isSolo = item.teamMembers.length === 1;

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-ink p-3.5 transition-all shadow-[3px_3px_0_var(--ink)] ${
                  isNoShow
                    ? "bg-gray-100/70 opacity-65 border-dashed"
                    : isSeated
                      ? "bg-white"
                      : "bg-pink/10 border-pink"
                }`}
              >
                {/* Left: Seat Indicator & Team Details */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Seat/Breakout Number Tag */}
                  <div
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center border-2 border-ink font-display font-black text-sm shadow-[1px_1px_0_var(--ink)] ${
                      isNoShow
                        ? "bg-gray-300 text-ink/60"
                        : isSeated
                          ? "bg-yellow text-ink"
                          : "bg-white text-pink border-dashed"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold text-ink/60 leading-none">
                      {shortSeatLabel}
                    </span>
                    <span>{isSeated ? `#${item.seatNo}` : "—"}</span>
                  </div>

                  {/* Team Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base text-ink truncate">
                        {item.teamName}
                      </h3>
                      {isSolo && (
                        <span className="inline-flex items-center gap-1 rounded-xs border border-ink bg-lavender/30 px-1.5 py-0.2 text-[10px] font-bold text-ink">
                          <UserIcon size={10} /> Solo
                        </span>
                      )}
                      {isNoShow && (
                        <span className="rounded-xs border border-ink bg-gray-200 px-1.5 py-0.2 text-[10px] font-black uppercase text-ink">
                          No-Show
                        </span>
                      )}
                      {!isSeated && !isNoShow && (
                        <span className="rounded-xs border border-pink bg-pink/20 px-1.5 py-0.2 text-[10px] font-black uppercase text-pink">
                          {isOnline ? "Awaiting Breakout" : "Awaiting Check-In"}
                        </span>
                      )}
                    </div>

                    {/* Member names & details */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-body text-ink/75">
                      {item.teamMembers.length > 0 ? (
                        item.teamMembers.map((m, idx) => (
                          <span key={m.id}>
                            <span className="font-medium text-ink">{m.participant.name}</span>
                            {m.participant.college && (
                              <span className="text-ink/60 text-[11px]"> ({m.participant.college})</span>
                            )}
                            {idx < item.teamMembers.length - 1 && " · "}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink/40 italic">No members listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-ink/20 shrink-0 w-full sm:w-auto">
                    {/* Seat Editor or Quick Assign */}
                    {isEditingThisSeat ? (
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <input
                          type="number"
                          min="1"
                          value={customSeatInput}
                          onChange={(e) => setCustomSeatInput(e.target.value)}
                          placeholder="#"
                          className="w-16 min-h-[38px] border-2 border-ink px-2 py-1 text-xs font-mono font-bold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = customSeatInput.trim() ? parseInt(customSeatInput, 10) : null;
                            handleAssignSeat(item.id, val);
                          }}
                          disabled={isLoading}
                          className="min-h-[38px] border border-ink bg-yellow px-3 py-1 text-xs font-bold hover:bg-cream cursor-pointer touch-manipulation"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSeatRosterId(null)}
                          className="min-h-[38px] border border-ink bg-white px-2.5 py-1 text-xs text-ink/60 cursor-pointer touch-manipulation"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        {!isSeated && !isNoShow && (
                          <button
                            type="button"
                            onClick={() => handleAssignSeat(item.id, nextAvailableSeat)}
                            disabled={isLoading}
                            className="min-h-[38px] flex-1 sm:flex-initial border-2 border-ink bg-yellow px-3 py-1.5 text-xs font-bold shadow-[1px_1px_0_var(--ink)] hover:bg-yellow/80 active:translate-y-0.5 transition-all cursor-pointer select-none touch-manipulation inline-flex items-center justify-center gap-1"
                          >
                            Assign #{nextAvailableSeat} <ZapIcon size={13} className="text-ink" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCustomSeatInput(item.seatNo ? String(item.seatNo) : String(nextAvailableSeat));
                            setEditingSeatRosterId(item.id);
                          }}
                          className="min-h-[38px] flex-1 sm:flex-initial border border-ink bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-cream active:bg-cream/60 cursor-pointer touch-manipulation"
                        >
                          {isSeated ? `Change ${shortSeatLabel}` : `Custom ${shortSeatLabel} #`}
                        </button>
                      </>
                    )}

                    {/* Mark No-Show / Confirmed toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      disabled={isLoading}
                      className={`min-h-[38px] border border-ink px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors touch-manipulation inline-flex items-center gap-1 ${
                        isNoShow
                          ? "bg-mint/30 hover:bg-mint"
                          : "bg-white text-ink/70 hover:bg-pink/20 hover:text-ink"
                      }`}
                    >
                      {isNoShow ? (
                        <>
                          <CheckIcon size={13} className="text-ink" /> Mark Present
                        </>
                      ) : (
                        "Flag No-Show"
                      )}
                    </button>

                    {/* Delete Team Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(item.id, item.teamName)}
                      disabled={isLoading}
                      className="min-h-[38px] min-w-[38px] border border-ink bg-white px-2.5 py-1 text-xs text-pink hover:bg-pink hover:text-ink cursor-pointer touch-manipulation flex items-center justify-center"
                      title="Delete team from roster"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Google Form Import Modal */}
      <GoogleFormImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        quizId={quizId}
        isOnlineMode={isOnline}
        onImportComplete={refreshRoster}
      />

      {/* Walk-In / Live Team Add Modal */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
          <div className="relative w-full max-w-md">
            <CardShell tone="cream" className="p-6">
              <div className="flex items-start justify-between border-b-2 border-ink pb-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {isOnline ? "+ Add Online Participant / Team" : "+ Add Walk-In Team"}
                  </h3>
                  <p className="mt-0.5 font-body text-xs text-ink/70">
                    {isOnline
                      ? "Directly add a solo participant or team to the live roster."
                      : "Register an on-spot team and assign their table immediately."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-white font-bold text-xs hover:bg-pink transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Walk-In Form */}
              <form onSubmit={handleCreateWalkIn} className="mt-4 flex flex-col gap-3 font-body text-xs">
                <div>
                  <label className="block font-bold text-ink">
                    Team Name or Solo Participant <span className="text-pink">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInTeamName}
                    onChange={(e) => setWalkInTeamName(e.target.value)}
                    placeholder="e.g. Quizzical Minds or Arjun K"
                    className="mt-1 w-full border-2 border-ink bg-white px-3 py-1.5 text-xs shadow-[2px_2px_0_var(--ink)] focus:outline-none focus:bg-yellow/10"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink">{seatLabel} Number</label>
                  <input
                    type="number"
                    min="1"
                    value={walkInSeatNo}
                    onChange={(e) => setWalkInSeatNo(e.target.value)}
                    placeholder={`Default: #${nextAvailableSeat}`}
                    className="mt-1 w-full border-2 border-ink bg-white px-3 py-1.5 font-mono text-xs shadow-[2px_2px_0_var(--ink)] focus:outline-none"
                  />
                  <p className="mt-0.5 text-[11px] text-ink/60">
                    Leave blank to automatically assign {seatLabel} #{nextAvailableSeat}.
                  </p>
                </div>

                <div className="border-t border-dashed border-ink/30 pt-3">
                  <span className="font-bold text-ink">Team Members (leave blank if solo):</span>
                  <div className="mt-2 flex flex-col gap-2">
                    {walkInMembers.map((member, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={member}
                        onChange={(e) => {
                          const updated = [...walkInMembers];
                          updated[idx] = e.target.value;
                          setWalkInMembers(updated);
                        }}
                        placeholder={`Member ${idx + 1} Name (optional)`}
                        className="w-full border-2 border-ink bg-white px-3 py-1.5 text-xs shadow-[1px_1px_0_var(--ink)] focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t-2 border-ink pt-3">
                  <Button
                    type="button"
                    onClick={() => setIsWalkInOpen(false)}
                    variant="underline"
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !walkInTeamName.trim()}
                    variant="primary"
                    className="text-xs inline-flex items-center gap-1.5"
                  >
                    {isLoading ? "Saving..." : (
                      <>
                        <CheckIcon size={14} />
                        Save & Check In
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardShell>
          </div>
        </div>
      )}
    </div>
  );
}
