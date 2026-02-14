import React from "react";
import type { CategoryTotal, TimeEntry } from "../types";
import { getLogicalDate, getLogicalDayStart, getLogicalDayEnd } from "../utils/dateUtils";
import { applyCapsToCategoryTotals } from "../utils/categoryCaps";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

function getTodayKey(): string {
  const logical = getLogicalDate(new Date());
  const y = logical.getFullYear();
  const m = String(logical.getMonth() + 1).padStart(2, "0");
  const d = String(logical.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayStartOverrideKey(): string {
  return `timetracking-day-start-${getTodayKey()}`;
}

function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseTimeHHMM(str: string): { hours: number; minutes: number } | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function computeTodayTotals(entries: TimeEntry[]): {
  totals: CategoryTotal[];
  grandTotalMs: number;
  firstEntryStartedAt: string | null;
} {
  const now = new Date();
  const dayStart = getLogicalDayStart(now).getTime();
  const dayEnd = getLogicalDayEnd(now).getTime();

  const map = new Map<string, { display: string; durationMs: number }>();
  let grandTotalMs = 0;
  let firstEntryStartedAt: string | null = null;
  let firstEntryTime = Infinity;

  for (const e of entries) {
    const t = new Date(e.stoppedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t < dayStart || t >= dayEnd) continue;

    // Track the earliest startedAt for today
    const startedAtTime = new Date(e.startedAt).getTime();
    if (!Number.isNaN(startedAtTime) && startedAtTime < firstEntryTime) {
      firstEntryTime = startedAtTime;
      firstEntryStartedAt = e.startedAt;
    }

    const display = e.category.trim() || "Uncategorized";
    const key = display.toLowerCase();

    const prev = map.get(key);
    if (prev) prev.durationMs += e.durationMs;
    else map.set(key, { display, durationMs: e.durationMs });

    grandTotalMs += e.durationMs;
  }

  const rawTotals: CategoryTotal[] = Array.from(map.values()).map((v) => ({
    category: v.display,
    durationMs: v.durationMs,
  }));
  const totals = applyCapsToCategoryTotals(rawTotals);
  return { totals, grandTotalMs, firstEntryStartedAt };
}

export function CategoryTotals({ entries }: { entries: TimeEntry[] }) {
  const { totals, grandTotalMs, firstEntryStartedAt } = React.useMemo(
    () => computeTodayTotals(entries),
    [entries],
  );

  // State for editable start time
  const [startTimeOverride, setStartTimeOverride] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(getDayStartOverrideKey());
    } catch {
      return null;
    }
  });
  const [isEditingStartTime, setIsEditingStartTime] = React.useState(false);
  const [startTimeInput, setStartTimeInput] = React.useState("");
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  // Update current time every 30 seconds for utilization calculation
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine actual day start time
  const dayStartTime = React.useMemo(() => {
    // First priority: localStorage override for today
    if (startTimeOverride) {
      const parsed = parseTimeHHMM(startTimeOverride);
      if (parsed) {
        const logical = getLogicalDate(new Date());
        const today = new Date(logical.getFullYear(), logical.getMonth(), logical.getDate());
        today.setHours(parsed.hours, parsed.minutes, 0, 0);
        return today.getTime();
      }
    }
    // Second priority: first entry's startedAt
    if (firstEntryStartedAt) {
      return new Date(firstEntryStartedAt).getTime();
    }
    return null;
  }, [startTimeOverride, firstEntryStartedAt]);

  // Calculate utilization
  const utilization = React.useMemo(() => {
    if (!dayStartTime || grandTotalMs === 0) return null;
    const elapsedMs = currentTime - dayStartTime;
    if (elapsedMs <= 0) return null;
    return Math.round((grandTotalMs / elapsedMs) * 100);
  }, [dayStartTime, grandTotalMs, currentTime]);

  const displayStartTime = dayStartTime ? formatTimeHHMM(new Date(dayStartTime)) : null;

  function handleStartTimeClick() {
    setStartTimeInput(displayStartTime || "");
    setIsEditingStartTime(true);
  }

  function handleStartTimeSave() {
    const parsed = parseTimeHHMM(startTimeInput.trim());
    if (parsed) {
      const timeStr = `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
      try {
        localStorage.setItem(getDayStartOverrideKey(), timeStr);
      } catch {
        // ignore
      }
      setStartTimeOverride(timeStr);
    }
    setIsEditingStartTime(false);
  }

  function handleStartTimeCancel() {
    setIsEditingStartTime(false);
  }

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
            {isEditingStartTime ? (
              <>
                <input
                  type="text"
                  value={startTimeInput}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  placeholder="HH:MM"
                  style={{
                    width: 60,
                    padding: "4px 6px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.3)",
                    color: "white",
                    textAlign: "center",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleStartTimeSave();
                    if (e.key === "Escape") handleStartTimeCancel();
                  }}
                  autoFocus
                />
                <button
                  onClick={handleStartTimeSave}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: "none",
                    background: "rgba(80,200,120,0.2)",
                    color: "#69db7c",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleStartTimeCancel}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: "none",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <span
                onClick={handleStartTimeClick}
                style={{ cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
                title="Click to edit start time"
              >
                Start: {displayStartTime || "—"}
              </span>
            )}
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

