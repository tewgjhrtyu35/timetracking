import React from "react";
import type { TimeEntry, TimeEntryDraft } from "./types";
import { api } from "./api/client";
import { Stopwatch, type StopwatchHandle } from "./components/Stopwatch";
import { CategoryModal } from "./components/CategoryModal";
import { CategoryTotals } from "./components/CategoryTotals";
import { CountdownTimer } from "./components/CountdownTimer";
import { ManualEntry } from "./components/ManualEntry";
import { HistoryView } from "./components/HistoryView";

type View = "timer" | "history";

export function App() {
  const stopwatchRef = React.useRef<StopwatchHandle>(null);

  const [entries, setEntries] = React.useState<TimeEntry[]>([]);
  const [pendingDraft, setPendingDraft] = React.useState<TimeEntryDraft | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [view, setView] = React.useState<View>("timer");

  React.useEffect(() => {
    void (async () => {
      const loaded = await api.listEntries();
      setEntries(loaded);
    })();
  }, []);

  async function handleSubmitCategory(category: string) {
    if (!pendingDraft) return;
    const saved = await api.addEntry({ ...pendingDraft, category });
    setEntries((prev) => [saved, ...prev]);
    setPendingDraft(null);
    setIsModalOpen(false);
    stopwatchRef.current?.reset();
  }

  function handleCancelCategory() {
    setPendingDraft(null);
    setIsModalOpen(false);
    stopwatchRef.current?.reset();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: 16,
        padding: 24,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: 0.4 }}>
          Timetracking
        </h1>
        
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 8 }}>
          <button
            onClick={() => setView("timer")}
            style={{
              border: "none",
              background: view === "timer" ? "rgba(255,255,255,0.1)" : "transparent",
              color: view === "timer" ? "white" : "rgba(255,255,255,0.5)",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Timer
          </button>
          <button
            onClick={() => setView("history")}
            style={{
              border: "none",
              background: view === "history" ? "rgba(255,255,255,0.1)" : "transparent",
              color: view === "history" ? "white" : "rgba(255,255,255,0.5)",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            History
          </button>
        </div>
      </header>

      {view === "timer" ? (
        <main
          style={{
            display: "grid",
            // Responsive grid: stack on mobile (<800px), 2 cols on desktop
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              padding: 24,
              background: "rgba(255,255,255,0.03)",
              display: "flex",
              flexDirection: "column",
              containerType: "inline-size",
              // Ensure reasonable height for the clock
              minHeight: 300,
            }}
          >
            <div style={{ flex: 1 }}>
              <Stopwatch
                ref={stopwatchRef}
                onStopped={(draft) => {
                  setPendingDraft(draft);
                  setIsModalOpen(true);
                }}
              />
            </div>
            
            <div style={{ marginTop: 24 }}>
               <CountdownTimer onEntryAdded={(entry) => setEntries(prev => [entry, ...prev])} />
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateRows: "1fr auto",
              gap: 16,
              alignSelf: "start",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <CategoryTotals entries={entries} />
            </div>

            <ManualEntry onEntryAdded={(entry) => setEntries(prev => [entry, ...prev])} />
          </section>
        </main>
      ) : (
        <main style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
          <HistoryView entries={entries} />
        </main>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        durationMs={pendingDraft?.durationMs ?? 0}
        onSubmit={handleSubmitCategory}
        onCancel={handleCancelCategory}
      />
    </div>
  );
}
