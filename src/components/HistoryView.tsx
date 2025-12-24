import React from "react";
import type { TimeEntry } from "../types";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  // Show minimal format for history lines
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getLocalDayKey(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type DaySummary = {
  dateKey: string;
  totalMs: number;
  categories: { name: string; durationMs: number }[];
};

export function HistoryView({ entries }: { entries: TimeEntry[] }) {
  const history = React.useMemo(() => {
    const days = new Map<string, Map<string, number>>();

    // 1. Group by Day -> Category
    for (const entry of entries) {
      const dayKey = getLocalDayKey(entry.stoppedAt);
      if (!days.has(dayKey)) days.set(dayKey, new Map());
      
      const dayCats = days.get(dayKey)!;
      const cat = entry.category.trim() || "Uncategorized";
      const current = dayCats.get(cat) || 0;
      dayCats.set(cat, current + entry.durationMs);
    }

    // 2. Flatten to sorted array
    const result: DaySummary[] = [];
    for (const [dateKey, catMap] of days.entries()) {
      let dayTotal = 0;
      const categories: { name: string; durationMs: number }[] = [];
      
      for (const [name, durationMs] of catMap.entries()) {
        categories.push({ name, durationMs });
        dayTotal += durationMs;
      }
      
      // Sort categories by duration desc
      categories.sort((a, b) => b.durationMs - a.durationMs);
      
      result.push({ dateKey, totalMs: dayTotal, categories });
    }

    // Sort days by date desc (newest first)
    // We can rely on Date.parse of the locale string for basic sorting, 
    // or better: sort by the raw timestamp of the first entry found for that day.
    // For simplicity, we'll assume the locale string parses chronologically enough 
    // or just rely on the order they were processed if entries are sorted.
    // Let's do a robust sort:
    result.sort((a, b) => Date.parse(b.dateKey) - Date.parse(a.dateKey));

    return result;
  }, [entries]);

  if (history.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>
        No history available.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 40 }}>
      {history.map((day) => (
        <div
          key={day.dateKey}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: 12,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>{day.dateKey}</div>
            <div style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(day.totalMs)}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {day.categories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <div style={{ opacity: 0.9 }}>{cat.name}</div>
                <div style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                  {formatDuration(cat.durationMs)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

