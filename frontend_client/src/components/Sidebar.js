import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import storageService from '../services/storageService';

/**
 * PUBLIC_INTERFACE
 * Sidebar shows track list and controls to add/remove tracks and import audio clips.
 */
export default function Sidebar() {
  const { project, addTrack, removeTrack, addClip, editor, setEditor, renameTrack } = useProject();
  const fileRef = useRef();
  const inputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState('');

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

  // focus the input when entering edit mode
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startEdit(track) {
    setEditingId(track.id);
    setNameDraft(track.name || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setNameDraft('');
  }

  function confirmEdit() {
    if (!editingId) return;
    renameTrack(editingId, nameDraft);
    setEditingId(null);
    setNameDraft('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div className="sidebar panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Tracks</strong>
        <div className="row">
          <button className="btn" onClick={() => addTrack('audio')}>+ Audio</button>
          <button className="btn" onClick={() => addTrack('midi')}>+ Instrument</button>
          <button className="btn" onClick={() => fileRef.current?.click()} aria-label="Import audio">⬆ Import</button>
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={onImportAudio} />
        </div>
      </div>
      <div className="col" style={{ marginTop: 12 }}>
        {project.tracks.map((t) => {
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} className="track-item">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row" onDoubleClick={() => startEdit(t)} title="Double-click to rename">
                  <span style={{ width: 22, textAlign: 'center' }}>{t.type === 'midi' ? '🎹' : '🎤'}</span>
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      className="input track-name-input"
                      aria-label="Edit track name"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      onBlur={cancelEdit}
                      style={{ width: 160 }}
                    />
                  ) : (
                    <strong>{t.name}</strong>
                  )}
                </div>
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => setEditor(prev => ({ ...prev, selectedTrackId: t.id, showPianoRoll: t.type === 'midi' }))}
                    aria-label={`Open ${t.type === 'midi' ? 'piano roll' : 'editor'} for ${t.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={() => (isEditing ? confirmEdit() : startEdit(t))}
                    aria-label={isEditing ? 'Save track name' : 'Rename track'}
                    title={isEditing ? 'Save' : 'Rename'}
                  >
                    {isEditing ? 'Save' : 'Rename'}
                  </button>
                  <button className="btn" onClick={() => removeTrack(t.id)} aria-label={`Remove ${t.name}`}>Remove</button>
                </div>
              </div>
              <div className="small">Clips: {t.clips.length} • Vol: {Math.round((t.volume ?? 0.8) * 100)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
