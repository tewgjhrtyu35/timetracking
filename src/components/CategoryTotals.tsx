import React from "react";
import type { CategoryTotal, TimeEntry } from "../types";
import { getLogicalDate, getLogicalDayStart, getLogicalDayEnd } from "../utils/dateUtils";
import {
  applyCapsToCategoryTotals,
  ENTERTAINMENT_CATEGORY,
  isAutoEntertainmentCategory,
  toAggregationCategory,
} from "../utils/categoryCaps";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function overlapMs(startA: number, endA: number, startB: number, endB: number): number {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
}

function computeTodayTotals(entries: TimeEntry[]): {
  totals: CategoryTotal[];
  grandTotalMs: number;
} {
  const now = new Date();
  const nowMs = now.getTime();
  const dayStart = getLogicalDayStart(now).getTime();
  const dayEnd = getLogicalDayEnd(now).getTime();
  const logical = getLogicalDate(now);
  const baseline = new Date(logical.getFullYear(), logical.getMonth(), logical.getDate());
  baseline.setHours(8, 30, 0, 0);
  const baselineMs = baseline.getTime();
  const windowStartMs = Math.max(dayStart, baselineMs);
  const windowEndMs = nowMs;

  const map = new Map<string, { display: string; durationMs: number }>();
  let grandTotalMs = 0;
  let loggedSinceBaselineMs = 0;

  for (const e of entries) {
    const t = new Date(e.stoppedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t < dayStart || t >= dayEnd) continue;
    if (isAutoEntertainmentCategory(e.category)) continue;

    const display = toAggregationCategory(e.category) || "Uncategorized";
    const key = display.toLowerCase();

    const prev = map.get(key);
    if (prev) prev.durationMs += e.durationMs;
    else map.set(key, { display, durationMs: e.durationMs });

    grandTotalMs += e.durationMs;

    const startedAtMs = new Date(e.startedAt).getTime();
    const stoppedAtMs = new Date(e.stoppedAt).getTime();
    if (!Number.isNaN(startedAtMs) && !Number.isNaN(stoppedAtMs) && stoppedAtMs > startedAtMs) {
      loggedSinceBaselineMs += overlapMs(startedAtMs, stoppedAtMs, windowStartMs, windowEndMs);
    }
  }

  if (windowEndMs > windowStartMs) {
    const elapsedSinceBaselineMs = windowEndMs - windowStartMs;
    const unloggedMs = Math.max(0, elapsedSinceBaselineMs - loggedSinceBaselineMs);
    if (unloggedMs > 0) {
      const entertainmentKey = ENTERTAINMENT_CATEGORY.toLowerCase();
      const existingEntertainment = map.get(entertainmentKey);
      if (existingEntertainment) {
        existingEntertainment.durationMs += unloggedMs;
      } else {
        map.set(entertainmentKey, {
          display: ENTERTAINMENT_CATEGORY,
          durationMs: unloggedMs,
        });
      }
      grandTotalMs += unloggedMs;
    }
  }

  const rawTotals: CategoryTotal[] = Array.from(map.values()).map((v) => ({
    category: v.display,
    durationMs: v.durationMs,
  }));
  const totals = applyCapsToCategoryTotals(rawTotals);
  return { totals, grandTotalMs };
}

export function CategoryTotals({ entries }: { entries: TimeEntry[] }) {
  const { totals, grandTotalMs } = React.useMemo(
    () => computeTodayTotals(entries),
    [entries],
  );

  const [currentTime, setCurrentTime] = React.useState(Date.now());

  // Update current time every 30 seconds for utilization calculation
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fixed utilization baseline: 08:30 in the current logical day.
  const dayStartTime = React.useMemo(() => {
    const logical = getLogicalDate(new Date(currentTime));
    const today = new Date(logical.getFullYear(), logical.getMonth(), logical.getDate());
    today.setHours(8, 30, 0, 0);
    return today.getTime();
  }, [currentTime]);

  // Calculate utilization
  const utilization = React.useMemo(() => {
    const elapsedMs = currentTime - dayStartTime;
    if (elapsedMs <= 0) return null;
    return Math.round((grandTotalMs / elapsedMs) * 100);
  }, [dayStartTime, grandTotalMs, currentTime]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Today's totals</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Total: {formatDuration(grandTotalMs)}
        </div>
      </div>

      {/* Utilization row */}
      {totals.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(100,200,255,0.15)",
            background: "rgba(100,200,255,0.05)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.95, display: "flex", alignItems: "center", gap: 8 }}>
            <span>Utilization:</span>
            <span style={{ fontWeight: 600, color: utilization && utilization >= 80 ? "#69db7c" : utilization && utilization >= 50 ? "#ffd43b" : "#ff6b6b" }}>
              {utilization !== null ? `${utilization}%` : "—"}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Start: 08:30</span>
          </div>
        </div>
      )}

      {totals.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.4 }}>
          No entries yet today. Start the stopwatch, stop it, then categorize the
          time.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {totals.map((t) => (
            <div
              key={t.category.toLowerCase()}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.95 }}>{t.category}</div>
              <div
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  opacity: 0.9,
                }}
              >
                {formatDuration(t.durationMs)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
