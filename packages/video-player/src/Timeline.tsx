'use client';

import { useRef, useCallback } from 'react';
import type { TimelineProps } from './types';

const EVENT_COLORS: Record<string, string> = {
  goal: '#22c55e',
  shot: '#3b82f6',
  foul: '#ef4444',
  pass: '#8b5cf6',
  offside: '#f97316',
  default: '#6b7280',
};

export function Timeline({
  currentTime,
  duration,
  annotations,
  aiEvents,
  onSeek,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const timeline = timelineRef.current;
      if (!timeline || !duration) return;

      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;

      onSeek(newTime);
    },
    [duration, onSeek]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={timelineRef}
      className="timeline cursor-pointer"
      onClick={handleClick}
    >
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 h-full bg-primary-500/30"
        style={{ width: `${progress}%` }}
      />

      {/* Current position indicator */}
      <div
        className="absolute top-0 w-0.5 h-full bg-primary-500"
        style={{ left: `${progress}%` }}
      />

      {/* Annotations markers */}
      {annotations.map((annotation) => {
        const position = (annotation.startTime / duration) * 100;
        const width = annotation.endTime
          ? ((annotation.endTime - annotation.startTime) / duration) * 100
          : 0.5;

        return (
          <div
            key={annotation.id}
            className="timeline-event bg-accent-500/50 hover:bg-accent-500/70"
            style={{
              left: `${position}%`,
              width: `${Math.max(width, 0.5)}%`,
            }}
            title={`Anotace: ${annotation.type}`}
          />
        );
      })}

      {/* AI Events markers */}
      {aiEvents.map((event) => {
        const position = (event.startTime / duration) * 100;
        const width = event.endTime
          ? ((event.endTime - event.startTime) / duration) * 100
          : 1;
        const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.default;

        return (
          <div
            key={event.id}
            className="absolute bottom-0 h-2 rounded-t opacity-70 hover:opacity-100"
            style={{
              left: `${position}%`,
              width: `${Math.max(width, 1)}%`,
              backgroundColor: color,
            }}
            title={`${event.eventType} (${Math.round(event.confidence * 100)}%)`}
          />
        );
      })}

      {/* Time labels */}
      <div className="absolute bottom-0 left-0 text-xs text-white/70 transform translate-y-full pt-1">
        0:00
      </div>
      <div className="absolute bottom-0 right-0 text-xs text-white/70 transform translate-y-full pt-1">
        {formatDuration(duration)}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
