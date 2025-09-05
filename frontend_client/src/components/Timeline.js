import React, { useMemo, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * PUBLIC_INTERFACE
 * Timeline renders tracks and clips in a beat grid; supports dragging clips horizontally.
 */
export default function Timeline() {
  const { project, setProject, editor } = useProject();
  const [drag, setDrag] = useState(null);
  const containerRef = useRef();

  const rows = useMemo(() => project.tracks.map((t, i) => ({ ...t, y: i })), [project.tracks]);

  function onMouseDown(e, trackId, clipId) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    setDrag({ trackId, clipId, startX: x });
  }
  function onMouseMove(e) {
    if (!drag) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const deltaPx = x - drag.startX;
    const deltaBeats = Math.round(deltaPx / 80); // 80px per beat
    setProject(prev => {
      const tracks = prev.tracks.map(t => {
        if (t.id !== drag.trackId) return t;
        return {
          ...t,
          clips: t.clips.map(c => c.id === drag.clipId ? { ...c, start: Math.max(0, (drag.origStart ?? c.start) + deltaBeats) } : c)
        };
      });
      return { ...prev, tracks };
    });
    if (drag.origStart == null) setDrag(d => ({ ...d, origStart: project.tracks.find(t => t.id === d.trackId).clips.find(c => c.id === d.clipId).start }));
  }
  function onMouseUp() {
    setDrag(null);
  }

  const heightPerTrack = 64;

  return (
    <div
      className="timeline"
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      role="grid"
      aria-label="Timeline"
    >
      <div style={{ position: 'relative', width: 80 * 64, height: rows.length * heightPerTrack }}>
        {rows.map((row, rIdx) => (
          <div key={row.id} aria-label={`track-${rIdx}`} style={{ position: 'absolute', left: 0, right: 0, top: rIdx * heightPerTrack, height: heightPerTrack }}>
            {row.clips.map(clip => (
              <div
                key={clip.id}
                onMouseDown={(e) => onMouseDown(e, row.id, clip.id)}
                className="clip"
                style={{
                  position: 'absolute',
                  left: (clip.start || 0) * 80,
                  width: Math.max(40, (clip.duration || 1) * 80),
                  height: heightPerTrack - 12,
                  margin: 6,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: row.type === 'midi' ? 'rgba(78,156,255,0.2)' : 'rgba(38,38,38,0.06)',
                  outline: editor.selectedClipId === clip.id ? '2px solid var(--color-accent)' : 'none',
                  cursor: 'grab'
                }}
                title={`${row.name} • ${clip.type} • start ${clip.start} • len ${clip.duration}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
