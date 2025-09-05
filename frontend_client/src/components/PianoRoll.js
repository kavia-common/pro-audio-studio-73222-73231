import React from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * PianoRoll shows a simplified grid placeholder for MIDI editing for the selected track.
 */
export default function PianoRoll() {
  const { editor, project } = useProject();
  const track = project.tracks.find(t => t.id === editor.selectedTrackId && t.type === 'midi');

  return (
    <div className="pianoroll" role="region" aria-label="Piano Roll">
      <div style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Piano Roll</strong>
        <span className="small">{track ? track.name : 'No MIDI track selected'}</span>
      </div>
      {/* Placeholder: MIDI note blocks could be displayed here */}
    </div>
  );
}
