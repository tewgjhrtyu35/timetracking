import React from "react";

function formatDuration(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function CountdownTimer() {
  const [durationInput, setDurationInput] = React.useState("5");
  const [timeLeftMs, setTimeLeftMs] = React.useState<number | null>(null);
  const [isActive, setIsActive] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const endTimeRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const pausedTimeLeftRef = React.useRef<number | null>(null);
  
  // Persistent AudioContext ref - created once on first user interaction
  const audioContextRef = React.useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  }

  function playBeep() {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Ensure context is running (may be suspended)
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.5, ctx.currentTime); // Louder volume (was 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  function playAlarm() {
    playBeep();
    setTimeout(playBeep, 600);
    setTimeout(playBeep, 1200);
  }

  React.useEffect(() => {
    if (!isActive || isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    function tick() {
      if (!endTimeRef.current) return;
      const now = performance.now();
      const remaining = Math.max(0, endTimeRef.current - now);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        setIsActive(false);
        setIsPaused(false);
        endTimeRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        playAlarm();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, isPaused]);

  function startTimer(minutes: number) {
    const ms = minutes * 60 * 1000;
    setTimeLeftMs(ms);
    endTimeRef.current = performance.now() + ms;
    setIsActive(true);
    setIsPaused(false);
  }

  function handleStart() {
    const min = parseInt(durationInput, 10);
    if (isNaN(min) || min <= 0) return;
    
    // Initialize and resume AudioContext on user gesture to unlock audio
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
    
    startTimer(min);
  }

  function handlePause() {
    if (!isActive || isPaused || timeLeftMs === null) return;
    pausedTimeLeftRef.current = timeLeftMs;
    setIsPaused(true);
    endTimeRef.current = null;
  }

  function handleResume() {
    if (!isActive || !isPaused || pausedTimeLeftRef.current === null) return;
    endTimeRef.current = performance.now() + pausedTimeLeftRef.current;
    setIsPaused(false);
  }

  function handleReset() {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeftMs(null);
    endTimeRef.current = null;
    pausedTimeLeftRef.current = null;
  }

  const isFinished = !isActive && timeLeftMs === 0;

  return (
    <div
      style={{
        padding: 24,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        Timer
      </div>

      {!isActive && !isPaused && timeLeftMs !== 0 ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            type="number"
            min="1"
            max="999"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "white",
              width: 60,
              textAlign: "center",
              fontSize: 18,
            }}
          />
          <span style={{ opacity: 0.6 }}>min</span>
          <button
            onClick={handleStart}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Start
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 48,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              color: isFinished ? "#ff6b6b" : "inherit",
              textShadow: isFinished ? "0 0 20px rgba(255,107,107,0.4)" : "none",
            }}
          >
            {isFinished ? "00:00" : formatDuration(timeLeftMs ?? 0)}
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            {isActive && !isPaused && (
              <button
                onClick={handlePause}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,200,80,0.15)",
                  color: "#ffd43b",
                  cursor: "pointer",
                }}
              >
                Pause
              </button>
            )}
            {isActive && isPaused && (
              <button
                onClick={handleResume}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(80,200,120,0.15)",
                  color: "#69db7c",
                  cursor: "pointer",
                }}
              >
                Resume
              </button>
            )}
            <button
              onClick={handleReset}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

