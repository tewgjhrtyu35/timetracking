import type { ApiAdapter } from "../api/web";
import type { TimeEntry, TimeEntryDraft } from "../types";
import { AUTO_ENTERTAINMENT_CATEGORY, isAutoEntertainmentCategory } from "./categoryCaps";
import { getLogicalDate, getLogicalDayEnd, getLogicalDayStart } from "./dateUtils";

function parseTimeMs(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function overlapMs(startA: number, endA: number, startB: number, endB: number): number {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
}

function getBaselineStartMs(now: Date): number {
  const logical = getLogicalDate(now);
  const baseline = new Date(logical.getFullYear(), logical.getMonth(), logical.getDate());
  baseline.setHours(8, 30, 0, 0);
  return baseline.getTime();
}

function sortByStoppedAtDesc(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) => {
    const aMs = parseTimeMs(a.stoppedAt) ?? -Infinity;
    const bMs = parseTimeMs(b.stoppedAt) ?? -Infinity;
    return bMs - aMs;
  });
}

export async function reconcileTodayAutoEntertainment(
  api: Pick<ApiAdapter, "addEntry" | "updateEntry" | "deleteEntry">,
  entries: TimeEntry[],
  now: Date,
): Promise<void> {
  const nowMs = now.getTime();
  const dayStartMs = getLogicalDayStart(now).getTime();
  const dayEndMs = getLogicalDayEnd(now).getTime();
  const baselineStartMs = getBaselineStartMs(now);
  const windowStartMs = Math.max(dayStartMs, baselineStartMs);
  const windowEndMs = nowMs;

  const todaysAutos = entries.filter((entry) => {
    if (!isAutoEntertainmentCategory(entry.category)) return false;
    const stoppedAtMs = parseTimeMs(entry.stoppedAt);
    if (stoppedAtMs == null) return false;
    return stoppedAtMs >= dayStartMs && stoppedAtMs < dayEndMs;
  });

  let unloggedMs = 0;
  if (windowEndMs > windowStartMs) {
    const elapsedMs = windowEndMs - windowStartMs;
    let loggedMs = 0;

    for (const entry of entries) {
      if (isAutoEntertainmentCategory(entry.category)) continue;

      const startedAtMs = parseTimeMs(entry.startedAt);
      const stoppedAtMs = parseTimeMs(entry.stoppedAt);
      if (startedAtMs == null || stoppedAtMs == null) continue;
      if (stoppedAtMs <= startedAtMs) continue;

      loggedMs += overlapMs(startedAtMs, stoppedAtMs, windowStartMs, windowEndMs);
    }

    unloggedMs = Math.max(0, elapsedMs - loggedMs);
  }

  if (unloggedMs <= 0) {
    for (const entry of todaysAutos) {
      await api.deleteEntry(entry.id);
    }
    return;
  }

  const autoDraft: TimeEntryDraft = {
    category: AUTO_ENTERTAINMENT_CATEGORY,
    stoppedAt: new Date(windowEndMs).toISOString(),
    startedAt: new Date(windowEndMs - unloggedMs).toISOString(),
    durationMs: unloggedMs,
  };

  const sortedAutos = sortByStoppedAtDesc(todaysAutos);
  const primary = sortedAutos[0];

  if (!primary) {
    await api.addEntry(autoDraft);
    return;
  }

  if (
    primary.category !== autoDraft.category ||
    primary.startedAt !== autoDraft.startedAt ||
    primary.stoppedAt !== autoDraft.stoppedAt ||
    primary.durationMs !== autoDraft.durationMs
  ) {
    await api.updateEntry({ ...primary, ...autoDraft });
  }

  for (const duplicate of sortedAutos.slice(1)) {
    await api.deleteEntry(duplicate.id);
  }
}
