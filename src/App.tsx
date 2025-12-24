import React from "react";
import type { TimeEntry, TimeEntryDraft } from "./types";
import { api } from "./api/client";
import { Stopwatch, type StopwatchHandle } from "./components/Stopwatch";
import { CategoryModal } from "./components/CategoryModal";
import { CategoryTotals } from "./components/CategoryTotals";
import { CountdownTimer } from "./components/CountdownTimer";
import { ManualEntry } from "./components/ManualEntry";

export function App() {
  const stopwatchRef = React.useRef<StopwatchHandle>(null);

  const [entries, setEntries] = React.useState<TimeEntry[]>([]);
  const [pendingDraft, setPendingDraft] = React.useState<TimeEntryDraft | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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
      <header style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: 0.4 }}>
          Timetracking
        </h1>
        <span style={{ opacity: 0.7, fontSize: 12 }}>Today</span>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gridTemplateRows: "1fr auto",
          gap: 24,
          alignItems: "stretch",
          height: "100%",
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
             <CountdownTimer />
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

      <CategoryModal
        isOpen={isModalOpen}
        durationMs={pendingDraft?.durationMs ?? 0}
        onSubmit={handleSubmitCategory}
        onCancel={handleCancelCategory}
      />
    </div>
  );
}


