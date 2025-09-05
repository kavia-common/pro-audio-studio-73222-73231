import React, { useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import storageService from '../services/storageService';

/**
 * PUBLIC_INTERFACE
 * Sidebar shows track list and controls to add/remove tracks and import audio clips.
 */
export default function Sidebar() {
  const { project, addTrack, removeTrack, addClip, editor, setEditor } = useProject();
  const fileRef = useRef();

  async function onImportAudio(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // For demo add to first audio track or create one
    let audioTrack = project.tracks.find(t => t.type === 'audio');
    if (!audioTrack) {
      addTrack('audio');
      audioTrack = { ...project.tracks[project.tracks.length - 1] };
    }
    const url = await storageService.readFileAsDataURL(file);
    addClip(audioTrack.id, { type: 'audio', start: 0, duration: 4, src: url });
    e.target.value = '';
  }

  return (
    <div className="sidebar panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Tracks</strong>
        <div className="row">
          <button className="btn" onClick={() => addTrack('audio')}>+ Audio</button>
          <button className="btn" onClick={() => addTrack('midi')}>+ Instrument</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Import</button>
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={onImportAudio} />
        </div>
      </div>
      <div className="col" style={{ marginTop: 12 }}>
        {project.tracks.map((t) => (
          <div key={t.id} className="track-item">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row">
                <span style={{ width: 22, textAlign: 'center' }}>{t.type === 'midi' ? '🎹' : '🎤'}</span>
                <strong>{t.name}</strong>
              </div>
              <div className="row">
                <button className="btn" onClick={() => setEditor(prev => ({ ...prev, selectedTrackId: t.id, showPianoRoll: t.type === 'midi' }))}>Edit</button>
                <button className="btn" onClick={() => removeTrack(t.id)}>Remove</button>
              </div>
            </div>
            <div className="small">Clips: {t.clips.length} • Vol: {Math.round((t.volume ?? 0.8) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
