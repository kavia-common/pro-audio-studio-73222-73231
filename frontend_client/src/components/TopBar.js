import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * TopBar provides project actions, BPM control, theme toggle, and auth actions.
 * Adds tap-tempo behavior on the Set BPM button:
 * - Each click records a timestamp
 * - BPM is computed from the average interval of the last few taps
 * - Tapping UI gives a brief visual cue
 * - History resets after 2s of inactivity
 */
export default function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user, login, logout, signup } = useAuth();
  const { project, setBpm, saveProject, loadProject } = useProject();

  // Local BPM input mirrors project.bpm and allows type-in override
  const [bpmInput, setBpmInput] = useState(String(project.bpm));

  // Tap tempo state
  const tapTimesRef = useRef([]); // stores ms timestamps of recent taps
  const [isTapping, setIsTapping] = useState(false); // visual cue flag
  const resetTimerRef = useRef(null);
  const TAP_RESET_MS = 2000; // inactivity reset threshold
  const TAP_WINDOW = 5; // number of recent taps to average (intervals = taps-1)

  // Keep local BPM input synced when project.bpm changes externally (e.g., loading a project)
  useEffect(() => {
    setBpmInput(String(project.bpm));
  }, [project.bpm]);

  const handleBpm = (e) => {
    setBpmInput(e.target.value);
  };

  // Clamp and normalize BPM to a number in allowed range and apply to state + audio engine
  const applyBpm = () => {
    const parsed = Number(bpmInput);
    const safe = Number.isFinite(parsed) ? parsed : 120;
    const clamped = Math.max(40, Math.min(240, Math.round(safe)));
    setBpm(clamped);
    // Reflect clamped value back into the input to show the applied BPM
    setBpmInput(String(clamped));
  };

  // Compute BPM from tap timestamps
  function computeBpmFromTaps(tapsMs) {
    if (tapsMs.length < 2) return null;
    // Use only the last TAP_WINDOW taps
    const recent = tapsMs.slice(-TAP_WINDOW);
    // Compute intervals
    const intervals = [];
    for (let i = 1; i < recent.length; i++) {
      const dt = recent[i] - recent[i - 1];
      if (dt > 0) intervals.push(dt);
    }
    if (intervals.length === 0) return null;
    // Simple outlier rejection: keep intervals within 0.5x .. 2x of median
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const filtered = intervals.filter(dt => dt >= median * 0.5 && dt <= median * 2);
    const avgMs = (filtered.length ? filtered : intervals).reduce((a, b) => a + b, 0) / (filtered.length ? filtered.length : intervals.length);
    if (!Number.isFinite(avgMs) || avgMs <= 0) return null;
    const bpm = 60000 / avgMs; // ms per beat -> BPM
    // Clamp to sensible range
    return Math.max(40, Math.min(240, Math.round(bpm)));
  }

  // Reset tap history after inactivity
  function scheduleTapReset() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      tapTimesRef.current = [];
      setIsTapping(false);
    }, TAP_RESET_MS);
  }

  // Handle tap-tempo: bound to Set BPM button
  function handleTapTempo() {
    const now = Date.now();
    tapTimesRef.current.push(now);
    // Keep only last TAP_WINDOW taps in memory to avoid unbounded growth
    if (tapTimesRef.current.length > TAP_WINDOW) {
      tapTimesRef.current = tapTimesRef.current.slice(-TAP_WINDOW);
    }
    setIsTapping(true);

    const bpm = computeBpmFromTaps(tapTimesRef.current);
    if (bpm) {
      setBpm(bpm);
      setBpmInput(String(bpm));
    }

    scheduleTapReset();

    // Briefly show visual cue
    setTimeout(() => setIsTapping(false), 120);
  }

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function handleLogin() {
    const email = window.prompt('Email');
    const pass = window.prompt('Password');
    if (!email || !pass) return;
    await login(email, pass);
  }
  async function handleSignup() {
    const email = window.prompt('Email');
    const pass = window.prompt('Password');
    if (!email || !pass) return;
    await signup(email, pass);
  }
  async function handleLoad() {
    const id = window.prompt('Project ID to load');
    if (!id) return;
    await loadProject(id);
  }
  async function handleSave() {
    await saveProject();
    alert('Project saved');
  }

  // Button label and style adapt while tapping to provide a clear visual cue
  const tapButtonLabel = useMemo(() => (isTapping ? 'Tapping…' : 'Tap Tempo'), [isTapping]);
  const tapButtonStyle = useMemo(
    () => ({
      borderColor: isTapping ? 'var(--color-accent)' : undefined,
      boxShadow: isTapping ? '0 0 0 2px rgba(78,156,255,0.25)' : undefined,
      transition: 'box-shadow 80ms ease, border-color 80ms ease'
    }),
    [isTapping]
  );

  return (
    <div className="topbar">
      <div className="row">
        <button className="btn" onClick={handleLoad} title="Load project">📂 Load</button>
        <button className="btn" onClick={handleSave} title="Save project">💾 Save</button>
        <button className="btn" onClick={() => window.location.reload()} title="New project">🆕 New</button>
        <span className="badge">{project.name}</span>
      </div>
      <div className="row">
        <input
          className="input"
          style={{ width: 72 }}
          value={bpmInput}
          onChange={handleBpm}
          onBlur={applyBpm}
          inputMode="numeric"
          aria-label="Beats per minute"
          title="Beats per minute (40 - 240)"
        />
        <button
          className="btn"
          onClick={handleTapTempo}
          aria-label="Tap tempo (click repeatedly to set BPM)"
          title="Tap tempo (click repeatedly to set BPM)"
          style={tapButtonStyle}
        >
          {tapButtonLabel}
        </button>
        <button className="btn" onClick={applyBpm} title="Apply typed BPM">Apply</button>
        <button
          className="btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {user ? (
          <>
            <span className="badge">Signed in as {user.email}</span>
            <button className="btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={handleLogin}>Login</button>
            <button className="btn primary" onClick={handleSignup}>Sign up</button>
          </>
        )}
      </div>
    </div>
  );
}
