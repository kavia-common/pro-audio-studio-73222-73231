import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import projectService from '../services/projectService';
import storageService from '../services/storageService';
import { useAuth } from './AuthContext';

const DEFAULT_BPM = 120;

const ProjectContext = createContext(null);

/**
 * PUBLIC_INTERFACE
 * useProject exposes project state, tracks, and actions for the DAW.
 */
export function useProject() {
  return useContext(ProjectContext);
}

/**
 * ProjectProvider owns application project data and actions,
 * and connects with audio engine for transport sync.
 */
export function ProjectProvider({ children, audio }) {
  const { user } = useAuth();

  const [project, setProject] = useState(() => ({
    id: null,
    name: 'Untitled Project',
    bpm: DEFAULT_BPM,
    tracks: [], // { id, name, type: 'audio' | 'midi', clips: [], volume, pan, mute, solo, plugins: [] }
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));
  const [transport, setTransport] = useState({ playing: false, position: 0, loop: false });
  const [editor, setEditor] = useState({ showPianoRoll: true, selectedTrackId: null, selectedClipId: null });

  const autosaveTimer = useRef(null);
  const dirtyRef = useRef(false);

  // Initialize with a default track
  useEffect(() => {
    if (project.tracks.length === 0) {
      addTrack('midi');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync transport to audio engine
  useEffect(() => {
    if (!audio) return;
    audio.setBpm(project.bpm);
  }, [audio, project.bpm]);

  useEffect(() => {
    if (!audio) return;
    if (transport.playing) {
      audio.play();
    } else {
      audio.stop();
    }
  }, [audio, transport.playing]);

  // Autosave
  useEffect(() => {
    if (!user) return;
    if (!dirtyRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        const saved = await projectService.saveProject({ ...project, updatedAt: Date.now() });
        setProject(saved);
        dirtyRef.current = false;
      } catch (e) {
        console.warn('Autosave failed', e);
      }
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [project, user]);

  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  // PUBLIC_INTERFACE
  const addTrack = useCallback((type = 'audio') => {
    setProject(prev => {
      const t = {
        id: crypto.randomUUID(),
        name: type === 'midi' ? 'Instrument' : 'Audio',
        type,
        clips: [],
        volume: 0.8,
        pan: 0,
        mute: false,
        solo: false,
        plugins: []
      };
      const np = { ...prev, tracks: [...prev.tracks, t], updatedAt: Date.now() };
      dirtyRef.current = true;
      return np;
    });
  }, []);

  // PUBLIC_INTERFACE
  const removeTrack = useCallback((trackId) => {
    setProject(prev => {
      const np = { ...prev, tracks: prev.tracks.filter(t => t.id !== trackId), updatedAt: Date.now() };
      dirtyRef.current = true;
      return np;
    });
  }, []);

  // PUBLIC_INTERFACE
  const addClip = useCallback((trackId, clip) => {
    setProject(prev => {
      const tracks = prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, { id: crypto.randomUUID(), ...clip }] } : t);
      const np = { ...prev, tracks, updatedAt: Date.now() };
      dirtyRef.current = true;
      return np;
    });
  }, []);

  // PUBLIC_INTERFACE
  const setBpm = useCallback((bpm) => {
    setProject(prev => ({ ...prev, bpm, updatedAt: Date.now() }));
    audio?.setBpm(bpm);
    markDirty();
  }, [audio, markDirty]);

  // PUBLIC_INTERFACE
  const togglePlay = useCallback(() => {
    setTransport(prev => ({ ...prev, playing: !prev.playing }));
  }, []);

  // PUBLIC_INTERFACE
  const setPosition = useCallback((pos) => {
    setTransport(prev => ({ ...prev, position: pos }));
    audio?.seek(pos);
  }, [audio]);

  // PUBLIC_INTERFACE
  const loadFromFile = useCallback(async (file) => {
    const data = await storageService.readFileAsJSON(file);
    setProject({ ...data, id: data.id || null });
    dirtyRef.current = false;
  }, []);

  // PUBLIC_INTERFACE
  const exportAudio = useCallback(async () => {
    const blob = await audio?.renderOffline(project);
    if (blob) storageService.downloadBlob(blob, `${project.name}.wav`);
  }, [audio, project]);

  // PUBLIC_INTERFACE
  const saveProject = useCallback(async () => {
    const saved = await projectService.saveProject({ ...project, updatedAt: Date.now() });
    setProject(saved);
    dirtyRef.current = false;
    return saved;
  }, [project]);

  // PUBLIC_INTERFACE
  const loadProject = useCallback(async (id) => {
    const loaded = await projectService.loadProject(id);
    setProject(loaded);
    dirtyRef.current = false;
    return loaded;
  }, []);

  const value = useMemo(() => ({
    project, setProject,
    transport, setTransport,
    editor, setEditor,
    addTrack, removeTrack, addClip,
    setBpm, togglePlay, setPosition,
    loadFromFile, exportAudio, saveProject, loadProject
  }), [project, transport, editor, addTrack, removeTrack, addClip, setBpm, togglePlay, setPosition, loadFromFile, exportAudio, saveProject, loadProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
