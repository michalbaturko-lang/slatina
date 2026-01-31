'use client';

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  Pencil,
  ArrowRight,
  Circle,
  Square,
  Type,
  X,
  CircleDot,
  Ruler,
  Mic,
} from 'lucide-react';
import type { VideoControlsProps } from './types';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const ANNOTATION_TOOLS = [
  { id: 'pencil', icon: Pencil, label: 'Volné kreslení' },
  { id: 'arrow', icon: ArrowRight, label: 'Šipka' },
  { id: 'circle', icon: Circle, label: 'Kruh' },
  { id: 'rectangle', icon: Square, label: 'Obdélník' },
  { id: 'player-x', icon: X, label: 'Hráč X' },
  { id: 'player-o', icon: CircleDot, label: 'Hráč O' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'measurement', icon: Ruler, label: 'Měření' },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  isFullscreen,
  selectedTool,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onToggleFullscreen,
  onToolSelect,
  onScreenshot,
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-between mt-2">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </button>

        <span className="text-white text-sm font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Volume */}
        <div className="flex items-center gap-1 group/volume">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {volume > 0 ? (
              <Volume2 className="w-5 h-5 text-white" />
            ) : (
              <VolumeX className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-0 group-hover/volume:w-20 transition-all opacity-0 group-hover/volume:opacity-100"
          />
        </div>

        {/* Playback rate */}
        <select
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
          className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1"
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate} className="text-black">
              {rate}x
            </option>
          ))}
        </select>
      </div>

      {/* Center - Annotation tools */}
      <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
        {ANNOTATION_TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(selectedTool === tool.id ? null : tool.id)}
            className={`p-2 rounded transition-colors ${
              selectedTool === tool.id
                ? 'bg-primary-500 text-white'
                : 'hover:bg-white/20 text-white'
            }`}
            title={tool.label}
          >
            <tool.icon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-white/30 mx-1" />

        {/* Voice recording */}
        <button
          className="p-2 hover:bg-white/20 rounded transition-colors"
          title="Nahrát komentář"
        >
          <Mic className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onScreenshot}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Screenshot"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5 text-white" />
          ) : (
            <Maximize className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
