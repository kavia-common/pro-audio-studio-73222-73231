import React from 'react';
import { useProject } from './context/ProjectContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Mixer from './components/Mixer';
import PianoRoll from './components/PianoRoll';
import TransportBar from './components/TransportBar';
import ModalHost from './components/ModalHost';
import InstrumentPanel from './components/InstrumentPanel';
import useMIDI from './hooks/useMIDI';

/**
 * INTERNAL helper component to connect MIDI to the current selected MIDI track
 * because the MIDI hook needs access to selection stored in ProjectContext.
 */
export default function InnerAppWithMIDI({ audio }) {
  const { project, editor } = useProject();

  useMIDI(audio, () => {
    const track = project.tracks.find(t => t.id === editor.selectedTrackId && t.type === 'midi');
    return track?.id || null;
  });

  return (
    <div className="daw-app">
      <TopBar />
      <div className="daw-main">
        <Sidebar />
        <div className="daw-center">
          <TransportBar />
          <div className="daw-editors">
            <Timeline />
            <InstrumentPanel />
            <PianoRoll />
          </div>
        </div>
      </div>
      <Mixer />
      <ModalHost />
    </div>
  );
}
