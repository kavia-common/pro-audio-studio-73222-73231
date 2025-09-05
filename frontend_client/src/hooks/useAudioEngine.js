import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Basic Web Audio engine with support for:
 * - Transport (play/stop/seek), BPM
 * - Simple instruments:
 *   - 'sine', 'square', 'saw', 'triangle' synthesizers (ADSR)
 *   - 'piano' (sine + fast decay for demo)
 *   - 'drums' (kick/snare/hats) via synthesized noise and sine
 * - Note scheduling and preview
 * - Simple recorder for capturing played notes into clips
 *
 * This is intentionally minimal and dependency-free to fit the template.
 */
export default function useAudioEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const [ready, setReady] = useState(false);
  const bpmRef = useRef(120);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef(0);
  const startPosRef = useRef(0);
  const panNodesRef = useRef(new Map());
  const gainNodesRef = useRef(new Map());
  const currentInstrumentsRef = useRef(new Map()); // trackId -> instrument config
  const recordingRef = useRef({ isRecording: false, targetTrackId: null, startedAtBeats: 0, notes: [] });

  // simple drum synthesis (no external samples)
  const memoDrumBuffers = useRef({});

  useEffect(() => {
    // Create context and master node
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    ctxRef.current = ctx;
    masterRef.current = master;

    // Pre-generate simple noise buffer for snare/hats
    memoDrumBuffers.current.noise = createNoiseBuffer(ctx);

    setReady(true);
    return () => {
      try {
        ctx.close();
      } catch {}
    };
  }, []);

  // Helpers
  function secondsPerBeat() {
    return 60 / (bpmRef.current || 120);
  }

  function now() {
    const ctx = ctxRef.current;
    return ctx ? ctx.currentTime : 0;
  }

  // PUBLIC_INTERFACE
  function setBpm(bpm) {
    bpmRef.current = bpm;
  }

  // PUBLIC_INTERFACE
  function play() {
    const ctx = ctxRef.current;
    if (!ctx || isPlayingRef.current) return;
    if (ctx.state === 'suspended') ctx.resume();
    isPlayingRef.current = true;
    startTimeRef.current = ctx.currentTime;
  }

  // PUBLIC_INTERFACE
  function stop() {
    const ctx = ctxRef.current;
    if (!ctx || !isPlayingRef.current) return;
    isPlayingRef.current = false;
    // stop implies return to start position for this simple engine
    startPosRef.current = 0;
  }

  // PUBLIC_INTERFACE
  function seek(positionBeats) {
    startPosRef.current = Math.max(0, Number(positionBeats) || 0);
    const ctx = ctxRef.current;
    if (ctx) startTimeRef.current = ctx.currentTime;
  }

  // Track routing (volume/pan)
  function ensureTrackNodes(trackId) {
    const ctx = ctxRef.current;
    if (!ctx || !masterRef.current) return null;
    let pan = panNodesRef.current.get(trackId);
    let gain = gainNodesRef.current.get(trackId);
    if (!pan) {
      pan = ctx.createStereoPanner();
      gain = ctx.createGain();
      gain.connect(pan);
      pan.connect(masterRef.current);
      panNodesRef.current.set(trackId, pan);
      gainNodesRef.current.set(trackId, gain);
    }
    return { pan, gain };
  }

  // PUBLIC_INTERFACE
  function setTrackParams(trackId, { volume, pan }) {
    const nodes = ensureTrackNodes(trackId);
    if (!nodes) return;
    if (typeof volume === 'number') nodes.gain.gain.setTargetAtTime(volume, now(), 0.01);
    if (typeof pan === 'number') nodes.pan.pan.setTargetAtTime(pan, now(), 0.01);
  }

  // PUBLIC_INTERFACE
  function setInstrument(trackId, instrument) {
    // instrument: { type: 'sine'|'square'|'saw'|'triangle'|'piano'|'drums', options? }
    currentInstrumentsRef.current.set(trackId, instrument);
  }

  // MIDI note number to frequency
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Basic synth voice with ADSR
  function triggerSynthVoice({ trackId, midi, velocity = 100, when = now(), duration = 0.5, waveform = 'sine', adsr = { a: 0.005, d: 0.1, s: 0.4, r: 0.2 } }) {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { gain } = ensureTrackNodes(trackId) || {};
    if (!gain) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    const freq = midiToFreq(midi);
    const velGain = Math.max(0, Math.min(1, velocity / 127));

    osc.type = waveform;
    osc.frequency.value = freq;

    env.gain.setValueAtTime(0, when);
    // Attack -> Decay -> Sustain
    env.gain.linearRampToValueAtTime(velGain, when + (adsr.a || 0.005));
    env.gain.linearRampToValueAtTime((adsr.s ?? 0.4) * velGain, when + (adsr.a || 0.005) + (adsr.d || 0.1));

    const stopTime = when + Math.max(0.05, duration);
    // Release
    env.gain.setValueAtTime((adsr.s ?? 0.4) * velGain, stopTime);
    env.gain.linearRampToValueAtTime(0.0001, stopTime + (adsr.r || 0.2));

    osc.connect(env);
    env.connect(gain);

    osc.start(when);
    osc.stop(stopTime + Math.max(0.05, (adsr.r || 0.2)));
  }

  // Fake "piano" voice: sine fundamental + quick decay + slight detune
  function triggerPiano({ trackId, midi, velocity = 100, when = now(), duration = 0.8 }) {
    triggerSynthVoice({
      trackId,
      midi,
      velocity,
      when,
      duration,
      waveform: 'sine',
      adsr: { a: 0.001, d: 0.2, s: 0.2, r: 0.3 }
    });
    // Add a quiet second osc slightly detuned to thicken
    triggerSynthVoice({
      trackId,
      midi: midi + 0.03,
      velocity: Math.min(127, velocity * 0.6),
      when,
      duration,
      waveform: 'triangle',
      adsr: { a: 0.001, d: 0.25, s: 0.15, r: 0.25 }
    });
  }

  // Drum synthesis helpers
  function createNoiseBuffer(ctx) {
    const bufferSize = ctx.sampleRate * 1.0;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function triggerKick({ trackId, when = now() }) {
    const ctx = ctxRef.current;
    const { gain } = ensureTrackNodes(trackId) || {};
    if (!ctx || !gain) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(50, when + 0.12);

    env.gain.setValueAtTime(1.0, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.15);

    osc.connect(env);
    env.connect(gain);
    osc.start(when);
    osc.stop(when + 0.2);
  }

  function triggerSnare({ trackId, when = now() }) {
    const ctx = ctxRef.current;
    const { gain } = ensureTrackNodes(trackId) || {};
    if (!ctx || !gain) return;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = memoDrumBuffers.current.noise;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.7, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.15);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(env);
    env.connect(gain);

    noiseSrc.start(when);
    noiseSrc.stop(when + 0.2);
  }

  function triggerHat({ trackId, when = now() }) {
    const ctx = ctxRef.current;
    const { gain } = ensureTrackNodes(trackId) || {};
    if (!ctx || !gain) return;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = memoDrumBuffers.current.noise;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 6000;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, when);
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.06);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(env);
    env.connect(gain);

    noiseSrc.start(when);
    noiseSrc.stop(when + 0.08);
  }

  // PUBLIC_INTERFACE
  function previewNote(trackId, midi, velocity = 100, duration = 0.5) {
    const instr = currentInstrumentsRef.current.get(trackId) || { type: 'sine' };
    const start = now();
    switch (instr.type) {
      case 'piano':
        triggerPiano({ trackId, midi, velocity, when: start, duration });
        break;
      case 'drums': {
        // Map midi to simple drum notes: 36 kick, 38 snare, 42 hat (typical GM)
        if (midi <= 36) triggerKick({ trackId, when: start });
        else if (midi <= 38) triggerSnare({ trackId, when: start });
        else triggerHat({ trackId, when: start });
        break;
      }
      case 'square':
      case 'saw':
      case 'triangle':
      case 'sine':
      default:
        triggerSynthVoice({ trackId, midi, velocity, when: start, duration, waveform: instr.type || 'sine' });
    }
  }

  // PUBLIC_INTERFACE
  function scheduleNote(trackId, midi, velocity, startBeat, durationBeats) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Convert beat position to when (AudioContext time)
    const when =
      (startTimeRef.current || 0) +
      ((startBeat - (startPosRef.current || 0)) * secondsPerBeat());

    const instr = currentInstrumentsRef.current.get(trackId) || { type: 'sine' };
    const durSec = Math.max(0.05, durationBeats * secondsPerBeat());
    switch (instr.type) {
      case 'piano':
        triggerPiano({ trackId, midi, velocity, when, duration: durSec });
        break;
      case 'drums': {
        if (midi <= 36) triggerKick({ trackId, when });
        else if (midi <= 38) triggerSnare({ trackId, when });
        else triggerHat({ trackId, when });
        break;
      }
      case 'square':
      case 'saw':
      case 'triangle':
      case 'sine':
      default:
        triggerSynthVoice({ trackId, midi, velocity, when, duration: durSec, waveform: instr.type || 'sine' });
    }
  }

  // PUBLIC_INTERFACE
  function startRecording(trackId, startAtBeats) {
    recordingRef.current = { isRecording: true, targetTrackId: trackId, startedAtBeats: startAtBeats ?? startPosRef.current, notes: [] };
  }

  // PUBLIC_INTERFACE
  function stopRecording() {
    const r = recordingRef.current;
    recordingRef.current = { isRecording: false, targetTrackId: null, startedAtBeats: 0, notes: [] };
    return r;
  }

  // PUBLIC_INTERFACE
  function noteOn(trackId, midi, velocity = 100) {
    previewNote(trackId, midi, velocity, 0.5);
    if (recordingRef.current.isRecording && recordingRef.current.targetTrackId === trackId) {
      const elapsedBeats = (now() - startTimeRef.current) / secondsPerBeat();
      const startBeat = (startPosRef.current || 0) + elapsedBeats;
      recordingRef.current.notes.push({ midi, velocity, start: startBeat, end: null });
    }
  }

  // PUBLIC_INTERFACE
  function noteOff(trackId, midi) {
    if (recordingRef.current.isRecording && recordingRef.current.targetTrackId === trackId) {
      // find last note with this midi that has no end
      for (let i = recordingRef.current.notes.length - 1; i >= 0; i--) {
        const n = recordingRef.current.notes[i];
        if (n.midi === midi && n.end == null) {
          const elapsedBeats = (now() - startTimeRef.current) / secondsPerBeat();
          const endBeat = (startPosRef.current || 0) + elapsedBeats;
          n.end = endBeat;
          break;
        }
      }
    }
  }

  // PUBLIC_INTERFACE
  async function renderOffline(project) {
    // Very simplified: return a short silent wav to keep export working
    const lengthSec = 2;
    const sampleRate = 44100;
    const length = lengthSec * sampleRate;
    const offline = new OfflineAudioContext(2, length, sampleRate);
    const buffer = offline.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = 0;
    }
    const src = offline.createBufferSource();
    src.buffer = buffer;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    const wav = audioBufferToWav(rendered);
    return new Blob([new DataView(wav)], { type: 'audio/wav' });
  }

  // Convert AudioBuffer to WAV ArrayBuffer
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    let interleaved;
    if (numChannels === 2) {
      interleaved = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      interleaved = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const bufferLength = 44 + interleaved.length * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, interleaved.length * bytesPerSample, true);
    floatTo16BitPCM(view, 44, interleaved);
    return arrayBuffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  }
  function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }
  function floatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  return {
    // engine
    context: ctxRef.current,
    ready,
    setBpm,
    play,
    stop,
    seek,
    renderOffline,

    // instruments
    setTrackParams,
    setInstrument,
    previewNote,
    scheduleNote,

    // performance/recording hooks
    startRecording,
    stopRecording,
    noteOn,
    noteOff,
  };
}
