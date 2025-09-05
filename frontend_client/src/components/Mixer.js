import React from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * Mixer shows channel strips with volume, pan, mute, and solo controls.
 */
export default function Mixer() {
  const { project, setProject } = useProject();

  function updateTrack(id, patch) {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === id ? { ...t, ...patch } : t),
      updatedAt: Date.now()
    }));
  }

  return (
    <div className="mixer" role="region" aria-label="Mixer">
      {project.tracks.map(t => (
        <div key={t.id} style={{ minWidth: 160, border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{t.name}</strong>
            <span className="small">{t.type === 'midi' ? '🎹' : '🎤'}</span>
          </div>
          <div className="col" style={{ marginTop: 8 }}>
            <label className="small">Volume {Math.round((t.volume ?? 0.8) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={t.volume ?? 0.8} onChange={e => updateTrack(t.id, { volume: Number(e.target.value) })} />
            <label className="small">Pan {t.pan ?? 0}</label>
            <input type="range" min="-1" max="1" step="0.01" value={t.pan ?? 0} onChange={e => updateTrack(t.id, { pan: Number(e.target.value) })} />
            <div className="row">
              <button className="btn" onClick={() => updateTrack(t.id, { mute: !t.mute })}>{t.mute ? 'Unmute' : 'Mute'}</button>
              <button className="btn" onClick={() => updateTrack(t.id, { solo: !t.solo })}>{t.solo ? 'Unsolo' : 'Solo'}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
