import React from "react";
import type { TimeEntry } from "../types";
import { api } from "../api/client";
import { getLogicalDate } from "../utils/dateUtils";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getLocalDayKey(isoString: string) {
  const d = new Date(isoString);
  const logical = getLogicalDate(d);
  return logical.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type DaySummary = {
  dateKey: string;
  totalMs: number;
  categories: {
    name: string;
    totalMs: number;
    entries: TimeEntry[];
  }[];
};

export function HistoryView({ entries: initialEntries }: { entries: TimeEntry[] }) {
  // Local state to reflect immediate updates (optimistic UI or re-fetch)
  const [entries, setEntries] = React.useState(initialEntries);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());

  // Edit form state
  const [editCategory, setEditCategory] = React.useState("");
  const [editDuration, setEditDuration] = React.useState("");

  React.useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const history = React.useMemo(() => {
    const days = new Map<string, Map<string, TimeEntry[]>>();

    for (const entry of entries) {
      const dayKey = getLocalDayKey(entry.stoppedAt);
      if (!days.has(dayKey)) days.set(dayKey, new Map());
      
      const dayCats = days.get(dayKey)!;
      const cat = entry.category.trim() || "Uncategorized";
      
      if (!dayCats.has(cat)) dayCats.set(cat, []);
      dayCats.get(cat)!.push(entry);
    }

    const result: DaySummary[] = [];
    for (const [dateKey, catMap] of days.entries()) {
      let dayTotal = 0;
      const categories: { name: string; totalMs: number; entries: TimeEntry[] }[] = [];
      
      for (const [name, entryList] of catMap.entries()) {
        // Sort entries by time desc
        entryList.sort((a, b) => new Date(b.stoppedAt).getTime() - new Date(a.stoppedAt).getTime());
        const catTotal = entryList.reduce((sum, e) => sum + e.durationMs, 0);
        
        categories.push({ name, totalMs: catTotal, entries: entryList });
        dayTotal += catTotal;
      }
      
      categories.sort((a, b) => b.totalMs - a.totalMs);
      result.push({ dateKey, totalMs: dayTotal, categories });
    }

    result.sort((a, b) => Date.parse(b.dateKey) - Date.parse(a.dateKey));
    return result;
  }, [entries]);

  function toggleExpand(key: string) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(entry: TimeEntry) {
    setEditingId(entry.id);
    setEditCategory(entry.category);
    setEditDuration(Math.round(entry.durationMs / 60000).toString());
  }

  async function saveEdit(originalEntry: TimeEntry) {
    const min = parseFloat(editDuration);
    if (isNaN(min) || min <= 0) return;

    const newDurationMs = Math.floor(min * 60000);
    const updated = {
      ...originalEntry,
      category: editCategory.trim(),
      durationMs: newDurationMs,
      // Adjust start time to match new duration (keeping stop time fixed)
      startedAt: new Date(new Date(originalEntry.stoppedAt).getTime() - newDurationMs).toISOString(),
    };

    await api.updateEntry(updated);
    
    // Update local list
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    await api.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

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

          <div style={{ display: "grid", gap: 12 }}>
            {day.categories.map((cat) => {
              const uniqueKey = `${day.dateKey}-${cat.name}`;
              const isExpanded = expandedCats.has(uniqueKey);

              return (
                <div key={cat.name} style={{ display: "grid", gap: 8 }}>
                  <div
                    onClick={() => toggleExpand(uniqueKey)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      cursor: "pointer",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isExpanded ? "rgba(255,255,255,0.05)" : "transparent",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, opacity: 0.5 }}>{isExpanded ? "▼" : "▶"}</span>
                      <span style={{ opacity: 0.9 }}>{cat.name}</span>
                    </div>
                    <div style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                      {formatDuration(cat.totalMs)}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ paddingLeft: 24, display: "grid", gap: 8 }}>
                      {cat.entries.map(entry => (
                        <div 
                          key={entry.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 12px",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: 8,
                            fontSize: 13,
                          }}
                        >
                          {editingId === entry.id ? (
                            <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                              <input 
                                value={editCategory}
                                onChange={e => setEditCategory(e.target.value)}
                                style={{
                                  background: "rgba(255,255,255,0.1)",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  width: 100,
                                }}
                              />
                              <input 
                                type="number"
                                value={editDuration}
                                onChange={e => setEditDuration(e.target.value)}
                                style={{
                                  background: "rgba(255,255,255,0.1)",
                                  border: "1px solid rgba(255,255,255,0.2)",
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  width: 60,
                                }}
                              />
                              <span style={{ fontSize: 11, opacity: 0.6 }}>min</span>
                              
                              <button onClick={() => saveEdit(entry)} style={{ marginLeft: "auto", cursor: "pointer", background: "rgba(80,200,120,0.2)", border: "none", color: "#8ce99a", borderRadius: 4, padding: "4px 8px" }}>Save</button>
                              <button onClick={() => setEditingId(null)} style={{ cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#e9edf5", borderRadius: 4, padding: "4px 8px" }}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ flex: 1, opacity: 0.8 }}>
                                {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {" - "}
                                {new Date(entry.stoppedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div style={{ fontVariantNumeric: "tabular-nums" }}>
                                {Math.round(entry.durationMs / 60000)}m
                              </div>
                              
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  onClick={() => startEdit(entry)}
                                  title="Edit"
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    opacity: 0.6,
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  title="Delete"
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    opacity: 0.6,
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
