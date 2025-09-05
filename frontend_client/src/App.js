import React from 'react';
import './App.css';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import useAudioEngine from './hooks/useAudioEngine';
import InnerAppWithMIDI from './InnerAppWithMIDI';

/**
 * Root DAW application shell composing the main layout:
 * Integrates audio engine and MIDI hooks to initialize subsystems.
 */
function App() {
  const audio = useAudioEngine(); // initialize Web Audio engine

  return (
    <ThemeProvider initialTheme="light">
      <AuthProvider>
        <ProjectProvider audio={audio}>
          <InnerAppWithMIDI audio={audio} />
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
