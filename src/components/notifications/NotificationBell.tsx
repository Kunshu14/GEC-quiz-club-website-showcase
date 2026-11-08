"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  SparklesIcon,
  XIcon,
  AlertTriangleIcon,
  CalendarIcon,
  TrophyIcon,
  CheckIcon,
} from "@/components/ui";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
}

function getTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case "SUBMISSION_APPROVED":
      return <SparklesIcon size={16} className="text-forest" />;
    case "SUBMISSION_REJECTED":
      return <XIcon size={16} className="text-pink" />;
    case "SUBMISSION_AWAITING_REVIEW":
      return <AlertTriangleIcon size={16} className="text-yellow" />;
    case "QUIZ_SCHEDULED":
    case "QUIZ_REMINDER":
      return <CalendarIcon size={16} className="text-ink" />;
    case "LEADERBOARD_UPDATE":
      return <TrophyIcon size={16} className="text-yellow" />;
    default:
      return <BellIcon size={16} className="text-ink" />;
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=6");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Refresh every 30 seconds or on window focus
    const interval = setInterval(fetchNotifications, 30000);
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read) {
      // Mark as read in background
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setIsOpen(false);
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center border-2 border-ink bg-white font-display text-base text-ink shadow-[2px_2px_0_var(--ink)] hover:bg-yellow/20 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-pink px-1 font-mono text-[10px] font-black text-ink shadow-[1px_1px_0_var(--ink)] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 border-3 border-ink bg-cream p-0 shadow-[6px_6px_0_var(--ink)] z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-ink bg-yellow px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-black uppercase text-ink">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="border border-ink bg-pink px-1.5 py-0.2 font-mono text-[10px] font-black text-ink">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="font-body text-[11px] font-bold underline text-ink hover:text-black cursor-pointer inline-flex items-center gap-1"
              >
                Mark all read <CheckIcon size={12} />
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-ink/20 bg-white">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs font-body text-ink/60 flex items-center justify-center gap-1.5">
                <BellIcon size={15} className="opacity-50" />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-cream/50 ${
                    !n.read ? "bg-yellow/10" : ""
                  }`}
                >
                  <span className="text-base shrink-0 pt-0.5">{getTypeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !n.read ? "font-display font-black text-ink" : "font-body font-bold text-ink/80"
                        }`}
                      >
                        {n.title}
                      </h4>
                      <span className="font-mono text-[10px] text-ink/50 shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="font-body text-xs text-ink/70 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-pink shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-ink bg-cream p-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="font-display text-xs font-bold text-ink underline hover:text-pink transition-colors"
            >
              View all in Notifications Table →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
