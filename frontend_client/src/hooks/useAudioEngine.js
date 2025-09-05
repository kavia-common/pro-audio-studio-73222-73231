import { useEffect, useRef, useState } from 'react';

/**
 * Basic Web Audio engine wrapper providing transport control, bpm, metronome,
 * and simple instrument/effect routing stubs. This is a simplified engine
 * suitable for UI integration and demo, not production-grade audio.
 */
export default function useAudioEngine() {
  const ctxRef = useRef(null);
  const [ready, setReady] = useState(false);
  const bpmRef = useRef(120);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef(0);
  const startPosRef = useRef(0);

  useEffect(() => {
    // Lazily create on user gesture in some browsers; here we create immediately for demo
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    setReady(true);
    return () => { try { ctx.close(); } catch {} };
  }, []);

  function setBpm(bpm) {
    bpmRef.current = bpm;
  }

  function play() {
    if (!ctxRef.current) return;
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    startTimeRef.current = ctxRef.current.currentTime;
  }

  function stop() {
    if (!ctxRef.current) return;
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    startPosRef.current = 0; // simplistic
  }

  function seek(positionBeats) {
    startPosRef.current = positionBeats;
    startTimeRef.current = ctxRef.current?.currentTime || 0;
  }

  async function renderOffline(project) {
    // Placeholder: synthesize 2 seconds of silence as a WAV-like blob using WebAudio OfflineAudioContext
    const length = 2 * 44100;
    const offline = new OfflineAudioContext(2, length, 44100);
    const buffer = offline.createBuffer(2, length, 44100);
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
  function audioBufferToWav(buffer, opt = {}) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // raw PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
      result = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const bufferLength = 44 + result.length * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + result.length * bytesPerSample, true);
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
    view.setUint32(40, result.length * bytesPerSample, true);
    floatTo16BitPCM(view, 44, result);
    return arrayBuffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
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
    context: ctxRef.current,
    ready,
    setBpm,
    play,
    stop,
    seek,
    renderOffline
  };
}
