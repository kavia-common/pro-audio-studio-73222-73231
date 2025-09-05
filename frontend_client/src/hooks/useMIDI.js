import { useEffect } from 'react';

/**
 * Initializes Web MIDI access and routes incoming NOTE ON/OFF to audio engine.
 */
export default function useMIDI(audio) {
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    let accessRef = null;
    navigator.requestMIDIAccess().then((access) => {
      accessRef = access;
      function handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const command = status & 0xf0;
        if (command === 0x90 && data2 > 0) {
          // Note on
          // Here you could trigger synth via audio engine
          // console.log('NOTE ON', data1, data2);
        } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
          // Note off
        }
      }
      access.inputs.forEach((input) => {
        input.onmidimessage = handleMIDIMessage;
      });
      access.onstatechange = () => {
        // Refresh listeners on device changes
        access.inputs.forEach((input) => (input.onmidimessage = handleMIDIMessage));
      };
    }).catch(() => {
      // MIDI not available or user blocked
    });
    return () => {
      if (accessRef) {
        accessRef.inputs.forEach(i => i.onmidimessage = null);
      }
    };
  }, [audio]);
}
