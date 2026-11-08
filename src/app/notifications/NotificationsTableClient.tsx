"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, CardShell, Tag, CheckIcon, TrashIcon, BellIcon, XIcon } from "@/components/ui";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
}

interface Props {
  initialNotifications: NotificationRow[];
}

function getTypeBadge(type: string) {
  switch (type) {
    case "SUBMISSION_APPROVED":
      return <Tag tone="mint">Approved</Tag>;
    case "SUBMISSION_REJECTED":
      return <Tag tone="pink">Rejected</Tag>;
    case "SUBMISSION_AWAITING_REVIEW":
      return <Tag tone="yellow">Review Needed</Tag>;
    case "QUIZ_SCHEDULED":
    case "QUIZ_REMINDER":
      return <Tag tone="lavender">Quiz Alert</Tag>;
    case "LEADERBOARD_UPDATE":
      return <Tag tone="yellow">Leaderboard</Tag>;
    default:
      return <Tag tone="ink">System</Tag>;
  }
}

export function NotificationsTableClient({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [isUpdating, setIsUpdating] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // ignore
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const handleClearRead = async () => {
    if (!confirm("Are you sure you want to clear all read notifications?")) return;
    setIsUpdating(true);
    try {
      await fetch("/api/notifications?clearRead=true", {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch {
      // ignore
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3 shadow-[3px_3px_0_var(--ink)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 text-xs font-display font-bold border-2 border-ink transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink/70 hover:bg-cream"
            }`}
          >
            All Notifications ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-1 text-xs font-display font-bold border-2 border-ink transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "UNREAD"
                ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)]"
                : "bg-white text-ink/70 hover:bg-cream"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="bg-pink text-ink px-1 rounded-xs text-[10px] font-mono font-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="alt"
              onClick={handleMarkAllRead}
              disabled={isUpdating}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <CheckIcon size={12} /> Mark All as Read
            </Button>
          )}

          {notifications.some((n) => n.read) && (
            <Button
              type="button"
              variant="underline"
              onClick={handleClearRead}
              disabled={isUpdating}
              className="text-xs text-red-600 inline-flex items-center gap-1"
            >
              <TrashIcon size={12} /> Clear Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications Table */}
      {filtered.length === 0 ? (
        <CardShell tone="cream" className="p-12 text-center shadow-[4px_4px_0_var(--ink)]">
          <div className="flex justify-center mb-3">
            <BellIcon size={36} className="text-ink/40" />
          </div>
          <h3 className="font-display text-lg font-black text-ink">
            {filter === "UNREAD" ? "No unread notifications!" : "No notifications found"}
          </h3>
          <p className="font-body text-xs text-ink/70 mt-1 max-w-sm mx-auto">
            You are completely caught up. Updates on question submissions, approvals, quizzes, and leaderboards will appear here.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {filter === "UNREAD" ? (
              <Button type="button" variant="alt" onClick={() => setFilter("ALL")}>
                View All Notifications
              </Button>
            ) : (
              <Button as="a" href="/dashboard" variant="alt">
                Return to Dashboard
              </Button>
            )}
          </div>
        </CardShell>
      ) : (
        <div className="border-3 border-ink bg-white shadow-[4px_4px_0_var(--ink)] overflow-x-auto">
          <table className="w-full border-collapse text-left font-body text-xs">
            <thead>
              <tr className="border-b-2 border-ink bg-cream font-display font-black text-[11px] text-ink uppercase tracking-wider">
                <th className="p-3 border-r border-ink/30 text-center w-12">Status</th>
                <th className="p-3 border-r border-ink/30 w-32">Type</th>
                <th className="p-3 border-r border-ink/30 min-w-48">Alert Details</th>
                <th className="p-3 border-r border-ink/30 w-36">Timestamp</th>
                <th className="p-3 text-right w-44">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/20">
              {filtered.map((n) => {
                const date = new Date(n.createdAt);
                const formattedDate = date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr
                    key={n.id}
                    className={`transition-colors hover:bg-cream/40 ${
                      !n.read ? "bg-yellow/15 font-semibold" : ""
                    }`}
                  >
                    {/* Unread indicator */}
                    <td className="p-3 border-r border-ink/30 text-center">
                      {!n.read ? (
                        <span
                          className="inline-block h-3 w-3 rounded-full bg-pink border border-ink shadow-[1px_1px_0_var(--ink)]"
                          title="Unread"
                        />
                      ) : (
                        <CheckIcon size={12} className="text-ink/40 inline" />
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="p-3 border-r border-ink/30">{getTypeBadge(n.type)}</td>

                    {/* Details */}
                    <td className="p-3 border-r border-ink/30">
                      <div className="font-display font-bold text-xs text-ink">{n.title}</div>
                      <div className="font-body text-xs text-ink/75 mt-0.5">{n.message}</div>
                    </td>

                    {/* Timestamp */}
                    <td className="p-3 border-r border-ink/30 font-mono text-[11px] text-ink/60 whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {n.linkUrl && (
                          <Link
                            href={n.linkUrl}
                            onClick={() => !n.read && handleMarkOneRead(n.id)}
                            className="border border-ink bg-yellow px-2 py-0.5 text-[11px] font-bold text-ink shadow-[1px_1px_0_var(--ink)] hover:bg-yellow/80 transition-colors"
                          >
                            Open ↗
                          </Link>
                        )}

                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkOneRead(n.id)}
                            className="border border-ink bg-white px-2 py-0.5 text-[11px] font-bold text-ink hover:bg-cream transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Mark as read"
                          >
                            Read <CheckIcon size={11} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteOne(n.id)}
                          className="text-ink/40 hover:text-pink text-xs font-bold transition-colors cursor-pointer px-1 flex items-center"
                          title="Dismiss notification"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
