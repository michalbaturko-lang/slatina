'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { VideoControls } from './VideoControls';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Timeline } from './Timeline';
import type { Annotation, AIEvent, VideoPlayerProps } from './types';

export function VideoPlayer({
  src,
  annotations = [],
  aiEvents = [],
  onAnnotationCreate,
  onAnnotationUpdate,
  onTimeUpdate,
  onScreenshot,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Initialize HLS if needed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    } else {
      video.src = src;
    }
  }, [src]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          seek(currentTime - 5);
          break;
        case 'ArrowRight':
          seek(currentTime + 5);
          break;
        case 'ArrowUp':
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case 'ArrowDown':
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case 'f':
          toggleFullscreen();
          break;
        case ',':
          // Frame back
          if (videoRef.current) {
            videoRef.current.currentTime -= 1 / 30;
          }
          break;
        case '.':
          // Frame forward
          if (videoRef.current) {
            videoRef.current.currentTime += 1 / 30;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, time));
    }
  }, [duration]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const captureScreenshot = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0);

      // Draw annotations if any
      // TODO: Composite annotation canvas

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      onScreenshot?.(blob, currentTime);
    }
  }, [currentTime, onScreenshot]);

  // Get visible annotations for current time
  const visibleAnnotations = annotations.filter(
    (a) => currentTime >= a.startTime && (!a.endTime || currentTime <= a.endTime)
  );

  // Get AI events near current time
  const nearbyAIEvents = aiEvents.filter(
    (e) => Math.abs(e.startTime - currentTime) < 30
  );

  return (
    <div
      ref={containerRef}
      className="video-container group"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
      />

      <AnnotationCanvas
        videoRef={videoRef}
        annotations={visibleAnnotations}
        isDrawing={isDrawing}
        selectedTool={selectedTool}
        onAnnotationCreate={onAnnotationCreate}
        currentTime={currentTime}
      />

      {/* AI Events overlay */}
      {nearbyAIEvents.length > 0 && (
        <div className="absolute top-4 right-4 space-y-2 z-20">
          {nearbyAIEvents.map((event) => (
            <div
              key={event.id}
              className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-black/80"
              onClick={() => seek(event.startTime)}
            >
              <span className="font-medium">{event.eventType}</span>
              <span className="ml-2 text-gray-300">
                {Math.round(event.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Timeline
          currentTime={currentTime}
          duration={duration}
          annotations={annotations}
          aiEvents={aiEvents}
          onSeek={seek}
        />

        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          isFullscreen={isFullscreen}
          selectedTool={selectedTool}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onVolumeChange={setVolume}
          onPlaybackRateChange={changePlaybackRate}
          onToggleFullscreen={toggleFullscreen}
          onToolSelect={(tool) => {
            setSelectedTool(tool);
            setIsDrawing(!!tool);
          }}
          onScreenshot={captureScreenshot}
        />
      </div>
    </div>
  );
}
