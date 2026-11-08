/**
 * Consistent, hydration-safe date formatter.
 * Formats dates into "DD MMM YYYY" (e.g. "14 Sep 2026") using UTC,
 * ensuring zero mismatch between server-side rendering (Node.js) and client hydration.
 */
export function formatDisplayDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();

  return `${day} ${month} ${year}`;
}
