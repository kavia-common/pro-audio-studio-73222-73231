import React, { useState } from 'react';
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
  const [bpmInput, setBpmInput] = useState(project.bpm);

  const handleBpm = (e) => setBpmInput(e.target.value);
  const applyBpm = () => setBpm(Math.max(40, Math.min(240, Number(bpmInput) || 120)));

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
        <input className="input" style={{ width: 72 }} value={bpmInput} onChange={handleBpm} onBlur={applyBpm} />
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
