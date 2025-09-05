import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * InstrumentPanel lets the user pick an instrument for the selected MIDI track and audition notes.
 * Supports basic types: piano, drums, sine, square, saw, triangle, guitar (alias to triangle+sine feel).
 */
export default function InstrumentPanel() {
  const { project, editor, setProject, audio } = useProject();
  const track = useMemo(() => project.tracks.find(t => t.id === editor.selectedTrackId && t.type === 'midi'), [project.tracks, editor.selectedTrackId]);
  const [auditionMidi, setAuditionMidi] = useState(60);

  if (!track) {
    return (
      <div className="track-item" style={{ margin: 12 }}>
        <div className="row"><strong>Instrument</strong></div>
        <div className="small">Select a MIDI track to configure its instrument.</div>
      </div>
    );
  }

  const current = track.instrument || { type: 'piano' };

  function updateInstrument(patch) {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === track.id ? { ...t, instrument: { ...(t.instrument || {}), ...patch } } : t),
      updatedAt: Date.now()
    }));
    audio?.setInstrument(track.id, { ...(current || {}), ...patch });
  }

  function initInstrumentToEngine() {
    audio?.setInstrument(track.id, current);
    audio?.setTrackParams(track.id, { volume: track.volume ?? 0.8, pan: track.pan ?? 0 });
  }

  function audition() {
    initInstrumentToEngine();
    audio?.previewNote(track.id, auditionMidi, 100, 0.5);
  }

  const types = [
    { id: 'piano', name: 'Piano' },
    { id: 'drums', name: 'Drums' },
    { id: 'sine', name: 'Synth: Sine' },
    { id: 'square', name: 'Synth: Square' },
    { id: 'saw', name: 'Synth: Saw' },
    { id: 'triangle', name: 'Synth: Triangle' },
    { id: 'guitar', name: 'Guitar' }, // alias to triangle
  ];

  function onTypeChange(e) {
    const val = e.target.value;
    const mapped = val === 'guitar' ? 'triangle' : val;
    updateInstrument({ type: mapped });
  }

  function onVolumeChange(e) {
    const vol = Number(e.target.value);
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === track.id ? { ...t, volume: vol } : t),
      updatedAt: Date.now()
    }));
    audio?.setTrackParams(track.id, { volume: vol });
  }

  function onPanChange(e) {
    const pan = Number(e.target.value);
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === track.id ? { ...t, pan } : t),
      updatedAt: Date.now()
    }));
    audio?.setTrackParams(track.id, { pan });
  }

  return (
    <div className="track-item" style={{ margin: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Instrument</strong>
        <span className="small">{track.name}</span>
      </div>
      <div className="col" style={{ marginTop: 8 }}>
        <label className="small">Type</label>
        <select className="input" value={current.type || 'piano'} onChange={onTypeChange}>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <label className="small">Volume {Math.round((track.volume ?? 0.8) * 100)}%</label>
        <input type="range" min="0" max="1" step="0.01" value={track.volume ?? 0.8} onChange={onVolumeChange} />

        <label className="small">Pan {track.pan ?? 0}</label>
        <input type="range" min="-1" max="1" step="0.01" value={track.pan ?? 0} onChange={onPanChange} />

        <div className="row">
          <label className="small">Audition MIDI note</label>
          <input className="input" style={{ width: 70 }} value={auditionMidi} onChange={e => setAuditionMidi(Number(e.target.value) || 60)} />
          <button className="btn" onClick={audition}>Play</button>
        </div>
      </div>
    </div>
  );
}
