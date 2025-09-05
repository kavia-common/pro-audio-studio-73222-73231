import React, { useMemo } from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * PianoRoll shows a simplified grid placeholder for MIDI editing for the selected track.
 * Adds click-to-audition behavior: clicking the keyboard area previews notes via the audio engine.
 */
export default function PianoRoll() {
  const { editor, project, audio } = useProject();
  const track = useMemo(() => project.tracks.find(t => t.id === editor.selectedTrackId && t.type === 'midi'), [project.tracks, editor.selectedTrackId]);

  const keys = useMemo(() => {
    // 2 octaves around C4 for quick preview
    const start = 60 - 12; // C3
    return Array.from({ length: 24 }).map((_, i) => start + i);
  }, []);

  function onKeyClick(midi) {
    if (!track || !audio) return;
    const instrument = track.instrument || { type: 'piano' };
    audio.setInstrument(track.id, instrument);
    audio.setTrackParams(track.id, { volume: track.volume ?? 0.8, pan: track.pan ?? 0 });
    audio.previewNote(track.id, midi, 110, 0.5);
  }

  return (
    <div className="pianoroll" role="region" aria-label="Piano Roll">
      <div style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Piano Roll</strong>
        <span className="small">{track ? track.name : 'No MIDI track selected'}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 8, overflowX: 'auto' }}>
        {keys.map(midi => {
          const isBlack = [1,3,6,8,10].includes(midi % 12);
          return (
            <button
              key={midi}
              className="btn"
              onClick={() => onKeyClick(midi)}
              style={{
                height: 48,
                width: isBlack ? 28 : 36,
                background: isBlack ? '#333' : 'var(--panel)',
                color: isBlack ? '#fff' : 'var(--text)'
              }}
              title={`MIDI ${midi}`}
            >
              {midi}
            </button>
          );
        })}
      </div>
    </div>
  );
}
