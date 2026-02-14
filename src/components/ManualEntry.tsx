import React from "react";
import type { TimeEntry } from "../types";
import { api } from "../api/client";
import { enforceCappedAdd } from "../utils/entryEnforcement";

export function ManualEntry(props: {
  onEntryAdded: (entry: TimeEntry) => void;
}) {
  const [category, setCategory] = React.useState("");
  const [minutes, setMinutes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minVal = parseFloat(minutes);
    if (!category.trim() || isNaN(minVal) || minVal <= 0) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const durationMs = Math.floor(minVal * 60 * 1000);
      // Construct a past start time so the duration is correct
      const start = new Date(now.getTime() - durationMs);

      const saved = await enforceCappedAdd(api, {
        category: category.trim(),
        startedAt: start.toISOString(),
        stoppedAt: now.toISOString(),
        durationMs,
      });

      for (const entry of saved) {
        props.onEntryAdded(entry);
      }
      setCategory("");
      setMinutes("");
    } finally {
      setIsSubmitting(false);
    }
  }

  const PRESETS = ["Entertainment", "Work", "Python", "Study", "Shower"];
  const DURATION_PRESETS = [15, 30, 45, 60];

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        Manual Entry
      </div>
      
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setCategory(p)}
              style={{
                padding: "4px 8px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e9edf5",
                fontSize: 11,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
              }
            >
              {p}
            </button>
          ))}
        </div>

        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.3)",
            color: "white",
            fontSize: 14,
          }}
        />
        
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DURATION_PRESETS.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMinutes(m.toString())}
                style={{
                  padding: "4px 8px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#e9edf5",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                }
              >
                {m}m
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              type="number"
              min="1"
              step="0.1"
              placeholder="Minutes"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.3)",
                color: "white",
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "rgba(90, 150, 255, 0.2)",
                color: "#a5d8ff",
                cursor: isSubmitting ? "wait" : "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
