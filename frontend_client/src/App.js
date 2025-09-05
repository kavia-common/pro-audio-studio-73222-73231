import React from 'react';
import './App.css';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import Mixer from './components/Mixer';
import PianoRoll from './components/PianoRoll';
import TransportBar from './components/TransportBar';
import ModalHost from './components/ModalHost';
import useAudioEngine from './hooks/useAudioEngine';
import useMIDI from './hooks/useMIDI';

/**
 * Root DAW application shell composing the main layout:
 * - TopBar: project and file controls
 * - Sidebar: track controls and instrument selection
 * - Center: Timeline editor or Piano Roll (toggle via state)
 * - Bottom: Transport and Mixer
 * Integrates audio engine and MIDI hooks to initialize subsystems.
 */
function App() {
  const audio = useAudioEngine(); // initialize Web Audio engine
  useMIDI(audio); // initialize Web MIDI, route to audio engine

  return (
    <ThemeProvider initialTheme="light">
      <AuthProvider>
        <ProjectProvider audio={audio}>
          <div className="daw-app">
            <TopBar />
            <div className="daw-main">
              <Sidebar />
              <div className="daw-center">
                <TransportBar />
                <div className="daw-editors">
                  <Timeline />
                  <PianoRoll />
                </div>
              </div>
            </div>
            <Mixer />
            <ModalHost />
          </div>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
