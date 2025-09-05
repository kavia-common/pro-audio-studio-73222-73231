import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * TransportBar provides play/stop and position controls.
 */
export default function TransportBar() {
  const { transport, togglePlay, setPosition } = useProject();
  const [pos, setPos] = useState(transport.position);

  const applyPos = () => setPosition(Math.max(0, Number(pos) || 0));

  return (
    <div className="transport">
      <button className="btn primary" onClick={togglePlay}>{transport.playing ? '⏹ Stop' : '▶️ Play'}</button>
      <div className="row">
        <input className="input" value={pos} onChange={e => setPos(e.target.value)} onBlur={applyPos} style={{ width: 80 }} />
        <span className="badge">beats</span>
      </div>
    </div>
  );
}
