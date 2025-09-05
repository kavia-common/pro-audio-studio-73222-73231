import { useEffect } from 'react';

/**
 * Initializes Web MIDI access and routes incoming NOTE ON/OFF to audio engine.
 * Notes are sent to the currently selected MIDI track (if any).
 */
export default function useMIDI(audio, getSelectedMidiTrackId) {
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    let accessRef = null;
    navigator.requestMIDIAccess().then((access) => {
      accessRef = access;
      function handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const command = status & 0xf0;
        const trackId = getSelectedMidiTrackId?.();
        if (!trackId) return;

        if (command === 0x90 && data2 > 0) {
          audio?.noteOn(trackId, data1, data2);
        } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
          audio?.noteOff(trackId, data1);
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
  }, [audio, getSelectedMidiTrackId]);
}
