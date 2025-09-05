import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * TopBar provides project actions, BPM control, theme toggle, and auth actions.
 */
export default function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user, login, logout, signup } = useAuth();
  const { project, setBpm, saveProject, loadProject } = useProject();
  const [bpmInput, setBpmInput] = useState(String(project.bpm));

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
        <button className="btn" onClick={applyBpm}>Set BPM</button>
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
