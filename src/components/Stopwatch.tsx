import React from "react";
import type { TimeEntryDraft } from "../types";

export type StopwatchHandle = {
  reset: () => void;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export const Stopwatch = React.forwardRef<
  StopwatchHandle,
  {
    onStopped: (draft: TimeEntryDraft) => void;
  }
>(function StopwatchImpl({ onStopped }, ref) {
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [accumulatedMs, setAccumulatedMs] = React.useState(0);

  const startedAtRef = React.useRef<Date | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastResumeTimeRef = React.useRef<number | null>(null);

  const stopInternal = React.useCallback(() => {
    if (!startedAtRef.current) return;
    const stoppedAt = new Date();
    const startedAt = startedAtRef.current;
    
    // Total duration is accumulation + time since last resume (if running)
    let finalDuration = accumulatedMs;
    if (isRunning && !isPaused && lastResumeTimeRef.current != null) {
      finalDuration += performance.now() - lastResumeTimeRef.current;
    }

    setIsRunning(false);
    setIsPaused(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    onStopped({
      startedAt: startedAt.toISOString(),
      stoppedAt: stoppedAt.toISOString(),
      durationMs: finalDuration,
      category: "",
    });
  }, [accumulatedMs, isRunning, isPaused, onStopped]);

  React.useImperativeHandle(
    ref,
    () => ({
      reset() {
        setIsRunning(false);
        setIsPaused(false);
        setElapsedMs(0);
        setAccumulatedMs(0);
        startedAtRef.current = null;
        lastResumeTimeRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      },
    }),
    [],
  );

  React.useEffect(() => {
    if (!isRunning || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    function tick(now: number) {
      if (lastResumeTimeRef.current != null) {
        setElapsedMs(accumulatedMs + (now - lastResumeTimeRef.current));
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (lastResumeTimeRef.current == null) {
      lastResumeTimeRef.current = performance.now();
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isRunning, isPaused, accumulatedMs]);

  function handleStart() {
    if (isRunning) return; // Already running or paused
    
    // Fresh start
    startedAtRef.current = new Date();
    lastResumeTimeRef.current = performance.now();
    setAccumulatedMs(0);
    setElapsedMs(0);
    setIsRunning(true);
    setIsPaused(false);
  }

  function handlePause() {
    if (!isRunning || isPaused) return;
    
    // Capture elapsed time into accumulated
    if (lastResumeTimeRef.current != null) {
      const now = performance.now();
      const sessionDuration = now - lastResumeTimeRef.current;
      const newTotal = accumulatedMs + sessionDuration;
      setAccumulatedMs(newTotal);
      setElapsedMs(newTotal);
    }
    
    setIsPaused(true);
    lastResumeTimeRef.current = null;
  }

  function handleResume() {
    if (!isRunning || !isPaused) return;
    
    lastResumeTimeRef.current = performance.now();
    setIsPaused(false);
  }

  function handleStop() {
    if (!isRunning) return;
    stopInternal();
  }

  return (
    <div style={{ display: "grid", gap: 32, height: "100%", alignContent: "center" }}>
      <div
        style={{
          fontSize: "20cqw",
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: -4,
          textAlign: "center",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontVariantNumeric: "tabular-nums",
          padding: "48px 24px",
          borderRadius: 32,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          textShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        {formatDuration(elapsedMs)}
      </div>

      <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
        {!isRunning ? (
          <button
            onClick={handleStart}
            style={{
              padding: "24px 48px",
              fontSize: 24,
              fontWeight: 600,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(80, 200, 120, 0.18)",
              color: "#e9edf5",
              cursor: "pointer",
              minWidth: 200,
              transition: "all 0.2s",
            }}
          >
            Start
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={handleResume}
                style={{
                  padding: "24px 48px",
                  fontSize: 24,
                  fontWeight: 600,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255, 200, 80, 0.18)",
                  color: "#e9edf5",
                  cursor: "pointer",
                  minWidth: 200,
                  transition: "all 0.2s",
                }}
              >
                Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                style={{
                  padding: "24px 48px",
                  fontSize: 24,
                  fontWeight: 600,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255, 200, 80, 0.18)",
                  color: "#e9edf5",
                  cursor: "pointer",
                  minWidth: 200,
                  transition: "all 0.2s",
                }}
              >
                Pause
              </button>
            )}

            <button
              onClick={handleStop}
              style={{
                padding: "24px 48px",
                fontSize: 24,
                fontWeight: 600,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(240, 90, 90, 0.18)",
                color: "#e9edf5",
                cursor: "pointer",
                minWidth: 200,
                transition: "all 0.2s",
              }}
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
});


