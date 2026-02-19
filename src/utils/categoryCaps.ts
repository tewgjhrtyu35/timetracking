import type { CategoryTotal, TimeEntry, TimeEntryDraft } from "../types";
import { getLogicalDayEnd, getLogicalDayStart } from "./dateUtils";

export const ENTERTAINMENT_CATEGORY = "Entertainment";
export const AUTO_ENTERTAINMENT_CATEGORY = "Entertainment (Auto)";

export const CAPPED_CATEGORY_LIMITS_MS = {
  shower: 45 * 60 * 1000,
  python: 30 * 60 * 1000,
} as const;

export type CappedCategoryKey = keyof typeof CAPPED_CATEGORY_LIMITS_MS;

export function normalizeCategoryKey(category: string): string {
  return category.trim().toLowerCase();
}

export function isAutoEntertainmentCategory(category: string): boolean {
  return normalizeCategoryKey(category) === normalizeCategoryKey(AUTO_ENTERTAINMENT_CATEGORY);
}

export function toAggregationCategory(category: string): string {
  const trimmed = category.trim();
  if (isAutoEntertainmentCategory(trimmed)) return ENTERTAINMENT_CATEGORY;
  return trimmed;
}

export function getCappedCategoryKey(category: string): CappedCategoryKey | null {
  const normalized = normalizeCategoryKey(toAggregationCategory(category));
  if (normalized in CAPPED_CATEGORY_LIMITS_MS) {
    return normalized as CappedCategoryKey;
  }
  return null;
}

function parseTimeOrNull(isoString: string): number | null {
  const t = new Date(isoString).getTime();
  return Number.isNaN(t) ? null : t;
}

function resolveStopTimeMs(draft: TimeEntryDraft): number {
  return parseTimeOrNull(draft.stoppedAt) ?? Date.now();
}

function resolveDurationMs(draft: TimeEntryDraft): number {
  return Math.max(0, Math.floor(draft.durationMs));
}

export function splitDraftForCapOverflow(
  draft: TimeEntryDraft,
  allowedMs: number,
): TimeEntryDraft[] {
  const category = draft.category.trim();
  const durationMs = resolveDurationMs(draft);
  const stopMs = resolveStopTimeMs(draft);
  const startMs = stopMs - durationMs;

  const clampedAllowedMs = Math.max(0, Math.min(durationMs, Math.floor(allowedMs)));
  const overflowMs = durationMs - clampedAllowedMs;

  if (overflowMs <= 0) {
    return [
      {
        ...draft,
        category,
        startedAt: new Date(startMs).toISOString(),
        stoppedAt: new Date(stopMs).toISOString(),
        durationMs,
      },
    ];
  }

  if (clampedAllowedMs <= 0) {
    return [
      {
        ...draft,
        category: ENTERTAINMENT_CATEGORY,
        startedAt: new Date(startMs).toISOString(),
        stoppedAt: new Date(stopMs).toISOString(),
        durationMs,
      },
    ];
  }

  const splitMs = startMs + clampedAllowedMs;

  return [
    {
      ...draft,
      category,
      startedAt: new Date(startMs).toISOString(),
      stoppedAt: new Date(splitMs).toISOString(),
      durationMs: clampedAllowedMs,
    },
    {
      ...draft,
      category: ENTERTAINMENT_CATEGORY,
      startedAt: new Date(splitMs).toISOString(),
      stoppedAt: new Date(stopMs).toISOString(),
      durationMs: overflowMs,
    },
  ];
}

export function computeUsedCappedMsForDay(
  entries: TimeEntry[],
  cappedCategory: CappedCategoryKey,
  dayReference: Date,
): number {
  const dayStart = getLogicalDayStart(dayReference).getTime();
  const dayEnd = getLogicalDayEnd(dayReference).getTime();
  let usedMs = 0;

  for (const entry of entries) {
    const stoppedAt = new Date(entry.stoppedAt).getTime();
    if (Number.isNaN(stoppedAt)) continue;
    if (stoppedAt < dayStart || stoppedAt >= dayEnd) continue;
    if (normalizeCategoryKey(toAggregationCategory(entry.category)) !== cappedCategory) continue;
    usedMs += Math.max(0, entry.durationMs);
  }

  return usedMs;
}

export function applyCapsToCategoryTotals(totals: CategoryTotal[]): CategoryTotal[] {
  const aggregate = new Map<string, { display: string; durationMs: number }>();

  for (const total of totals) {
    const aggregationCategory = toAggregationCategory(total.category);
    const key = normalizeCategoryKey(aggregationCategory);
    const display = aggregationCategory || "Uncategorized";
    const prev = aggregate.get(key);
    if (prev) {
      prev.durationMs += Math.max(0, total.durationMs);
      continue;
    }
    aggregate.set(key, { display, durationMs: Math.max(0, total.durationMs) });
  }

  let overflowToEntertainmentMs = 0;
  for (const [categoryKey, limitMs] of Object.entries(CAPPED_CATEGORY_LIMITS_MS)) {
    const row = aggregate.get(categoryKey);
    if (!row) continue;
    if (row.durationMs <= limitMs) continue;
    overflowToEntertainmentMs += row.durationMs - limitMs;
    row.durationMs = limitMs;
  }

  if (overflowToEntertainmentMs > 0) {
    const entertainmentKey = normalizeCategoryKey(ENTERTAINMENT_CATEGORY);
    const entertainment = aggregate.get(entertainmentKey);
    if (entertainment) {
      entertainment.durationMs += overflowToEntertainmentMs;
    } else {
      aggregate.set(entertainmentKey, {
        display: ENTERTAINMENT_CATEGORY,
        durationMs: overflowToEntertainmentMs,
      });
    }
  }

  const adjusted: CategoryTotal[] = Array.from(aggregate.values()).map((entry) => ({
    category: entry.display,
    durationMs: entry.durationMs,
  }));
  adjusted.sort((a, b) => b.durationMs - a.durationMs);
  return adjusted;
}
