import React from "react";
import type { CategoryTotal, TimeEntry } from "../types";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeTodayTotals(entries: TimeEntry[]): {
  totals: CategoryTotal[];
  grandTotalMs: number;
} {
  const now = new Date();
  const dayStart = startOfLocalDay(now).getTime();
  const dayEnd = new Date(dayStart + 24 * 60 * 60 * 1000).getTime();

  const map = new Map<string, { display: string; durationMs: number }>();
  let grandTotalMs = 0;

  for (const e of entries) {
    const t = new Date(e.stoppedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t < dayStart || t >= dayEnd) continue;

    const display = e.category.trim() || "Uncategorized";
    const key = display.toLowerCase();

    const prev = map.get(key);
    if (prev) prev.durationMs += e.durationMs;
    else map.set(key, { display, durationMs: e.durationMs });

    grandTotalMs += e.durationMs;
  }

  const totals: CategoryTotal[] = Array.from(map.values()).map((v) => ({
    category: v.display,
    durationMs: v.durationMs,
  }));

  totals.sort((a, b) => b.durationMs - a.durationMs);
  return { totals, grandTotalMs };
}

export function CategoryTotals({ entries }: { entries: TimeEntry[] }) {
  const { totals, grandTotalMs } = React.useMemo(
    () => computeTodayTotals(entries),
    [entries],
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Today’s totals</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Total: {formatDuration(grandTotalMs)}
        </div>
      </div>

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


