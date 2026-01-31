'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Type,
  Mic,
  MicOff,
  Camera,
  Download,
  Share2,
  Brain,
  Check,
  X,
  ChevronDown,
  Trash2,
  MousePointer,
  Move,
} from 'lucide-react';

type ToolType = 'select' | 'pencil' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'playerX' | 'playerO';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  startTime: number;
  endTime: number;
}

interface AIEvent {
  id: string;
  type: string;
  label: string;
  time: number;
  confidence: number;
  verified?: boolean;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];
const STROKE_WIDTHS = [2, 4, 6, 8];

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  // Annotation state
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // AI events
  const [aiEvents, setAiEvents] = useState<AIEvent[]>([
    { id: '1', type: 'shot', label: 'Střela na branku', time: 125.5, confidence: 0.92, verified: undefined },
    { id: '2', type: 'pass', label: 'Klíčová přihrávka', time: 340.2, confidence: 0.87, verified: undefined },
    { id: '3', type: 'sprint', label: 'Sprint útočníka', time: 512.8, confidence: 0.78, verified: undefined },
    { id: '4', type: 'formation', label: 'Změna formace', time: 678.3, confidence: 0.85, verified: undefined },
  ]);

  const [showAIPanel, setShowAIPanel] = useState(true);

  // Video controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const skipFrames = useCallback((frames: number) => {
    if (!videoRef.current) return;
    const frameTime = 1 / 30; // Assuming 30fps
    seek(currentTime + frames * frameTime);
  }, [currentTime, seek]);

  // Canvas drawing
  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select') return;

    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentPoints([point]);
  }, [selectedTool, getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(e);

    if (selectedTool === 'pencil') {
      setCurrentPoints((prev) => [...prev, point]);
    } else {
      setCurrentPoints((prev) => [prev[0], point]);
    }
  }, [isDrawing, selectedTool, getCanvasPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPoints.length === 0) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: selectedTool,
      points: currentPoints,
      color: selectedColor,
      strokeWidth,
      startTime: currentTime,
      endTime: currentTime + 5, // Show for 5 seconds by default
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth, currentTime]);

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleAnnotations = annotations.filter(
      (a) => currentTime >= a.startTime && currentTime <= a.endTime
    );

    for (const annotation of visibleAnnotations) {
      drawAnnotation(ctx, annotation, canvas.width, canvas.height);
    }

    // Draw current drawing
    if (isDrawing && currentPoints.length > 0) {
      drawAnnotation(
        ctx,
        {
          id: 'current',
          type: selectedTool,
          points: currentPoints,
          color: selectedColor,
          strokeWidth,
          startTime: 0,
          endTime: 0,
        },
        canvas.width,
        canvas.height
      );
    }
  }, [annotations, currentTime, isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth]);

  // Voice recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Recording saved:', blob);
          // TODO: Upload to server
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  }, [isRecording]);

  // Screenshot
  const captureScreenshot = useCallback(() => {
    const video = videoRef.current;
    const annotationCanvas = canvasRef.current;
    if (!video || !annotationCanvas) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw video
    ctx.drawImage(video, 0, 0);

    // Draw annotations
    ctx.drawImage(annotationCanvas, 0, 0, canvas.width, canvas.height);

    // Download
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // AI event verification
  const verifyEvent = useCallback((eventId: string, isCorrect: boolean) => {
    setAiEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, verified: isCorrect } : e))
    );
    // TODO: Send feedback to API
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold">Zápas vs. Sparta Praha U15</h1>
              <p className="text-sm text-gray-400">28. ledna 2024</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={captureScreenshot}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition"
            >
              <Camera className="w-4 h-4" />
              Screenshot
            </button>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition">
              <Download className="w-4 h-4" />
              Export klip
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
              <Share2 className="w-4 h-4" />
              Sdílet
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main video area */}
        <div className="flex-1 flex flex-col">
          {/* Video container */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-[1400px] aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full"
                src="/sample-video.mp4"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                width={1920}
                height={1080}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-gray-900 border-t border-gray-800 p-3">
            <div className="flex items-center justify-between max-w-[1400px] mx-auto">
              {/* Drawing tools */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <ToolButton
                  icon={<MousePointer className="w-4 h-4" />}
                  active={selectedTool === 'select'}
                  onClick={() => setSelectedTool('select')}
                  tooltip="Výběr"
                />
                <ToolButton
                  icon={<Pencil className="w-4 h-4" />}
                  active={selectedTool === 'pencil'}
                  onClick={() => setSelectedTool('pencil')}
                  tooltip="Tužka"
                />
                <ToolButton
                  icon={<ArrowRight className="w-4 h-4" />}
                  active={selectedTool === 'arrow'}
                  onClick={() => setSelectedTool('arrow')}
                  tooltip="Šipka"
                />
                <ToolButton
                  icon={<Circle className="w-4 h-4" />}
                  active={selectedTool === 'circle'}
                  onClick={() => setSelectedTool('circle')}
                  tooltip="Kruh"
                />
                <ToolButton
                  icon={<Square className="w-4 h-4" />}
                  active={selectedTool === 'rectangle'}
                  onClick={() => setSelectedTool('rectangle')}
                  tooltip="Obdélník"
                />
                <ToolButton
                  icon={<Type className="w-4 h-4" />}
                  active={selectedTool === 'text'}
                  onClick={() => setSelectedTool('text')}
                  tooltip="Text"
                />
                <div className="w-px h-6 bg-gray-700 mx-1" />
                <ToolButton
                  icon={<span className="font-bold text-sm">X</span>}
                  active={selectedTool === 'playerX'}
                  onClick={() => setSelectedTool('playerX')}
                  tooltip="Hráč X"
                />
                <ToolButton
                  icon={<span className="font-bold text-sm">O</span>}
                  active={selectedTool === 'playerO'}
                  onClick={() => setSelectedTool('playerO')}
                  tooltip="Hráč O"
                />
              </div>

              {/* Colors */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>

                {/* Stroke width */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      className={`w-8 h-8 rounded flex items-center justify-center transition ${
                        strokeWidth === width ? 'bg-gray-700' : 'hover:bg-gray-700'
                      }`}
                      onClick={() => setStrokeWidth(width)}
                    >
                      <div
                        className="rounded-full bg-white"
                        style={{ width: width * 2, height: width * 2 }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice recording */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Zastavit nahrávání
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Nahrát komentář
                    </>
                  )}
                </button>

                {annotations.length > 0 && (
                  <button
                    onClick={() => setAnnotations([])}
                    className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat vše
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Video controls */}
          <div className="bg-gray-900 border-t border-gray-800 p-3">
            <div className="max-w-[1400px] mx-auto">
              {/* Timeline */}
              <div className="mb-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${(currentTime / duration) * 100}%, #374151 0%)`,
                  }}
                />
                {/* AI event markers */}
                <div className="relative h-2 mt-1">
                  {aiEvents.map((event) => (
                    <button
                      key={event.id}
                      className="absolute w-2 h-2 bg-purple-500 rounded-full transform -translate-x-1/2 hover:scale-150 transition"
                      style={{ left: `${(event.time / duration) * 100}%` }}
                      onClick={() => seek(event.time)}
                      title={event.label}
                    />
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => skipFrames(-1)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                    title="Předchozí snímek"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => skipFrames(1)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                    title="Další snímek"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  <span className="text-sm text-gray-400 ml-4">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Playback speed */}
                  <div className="relative">
                    <select
                      value={playbackRate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className="appearance-none bg-gray-800 px-3 py-2 pr-8 rounded-lg text-sm cursor-pointer"
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={volume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setVolume(vol);
                        if (videoRef.current) videoRef.current.volume = vol;
                      }}
                      className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <button className="p-2 hover:bg-gray-800 rounded-lg transition">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Events Panel */}
        {showAIPanel && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                AI Události
              </h2>
              <button
                onClick={() => setShowAIPanel(false)}
                className="p-1 hover:bg-gray-800 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition cursor-pointer"
                  onClick={() => seek(event.time)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{event.label}</div>
                      <div className="text-sm text-gray-400">{formatTime(event.time)}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        event.confidence >= 0.9
                          ? 'bg-green-500/20 text-green-400'
                          : event.confidence >= 0.8
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {Math.round(event.confidence * 100)}%
                    </span>
                  </div>

                  {event.verified === undefined ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          verifyEvent(event.id, true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition"
                      >
                        <Check className="w-4 h-4" />
                        Správně
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          verifyEvent(event.id, false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
                      >
                        <X className="w-4 h-4" />
                        Špatně
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`text-center py-1.5 rounded text-sm ${
                        event.verified
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {event.verified ? 'Ověřeno jako správné' : 'Označeno jako chybné'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-800">
              <div className="text-sm text-gray-400 mb-2">
                Ověřeno: {aiEvents.filter((e) => e.verified !== undefined).length} / {aiEvents.length}
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{
                    width: `${(aiEvents.filter((e) => e.verified !== undefined).length / aiEvents.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  active,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded flex items-center justify-center transition ${
        active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
      }`}
      title={tooltip}
    >
      {icon}
    </button>
  );
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  width: number,
  height: number
) {
  const { type, points, color, strokeWidth } = annotation;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const toCanvas = (p: Point) => ({ x: p.x * width, y: p.y * height });

  switch (type) {
    case 'pencil':
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(toCanvas(points[0]).x, toCanvas(points[0]).y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(toCanvas(points[i]).x, toCanvas(points[i]).y);
      }
      ctx.stroke();
      break;

    case 'arrow':
      if (points.length < 2) return;
      const start = toCanvas(points[0]);
      const end = toCanvas(points[1]);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 20;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      break;

    case 'circle':
      if (points.length < 2) return;
      const c1 = toCanvas(points[0]);
      const c2 = toCanvas(points[1]);
      const radius = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2));
      ctx.beginPath();
      ctx.arc(c1.x, c1.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'rectangle':
      if (points.length < 2) return;
      const r1 = toCanvas(points[0]);
      const r2 = toCanvas(points[1]);
      ctx.strokeRect(r1.x, r1.y, r2.x - r1.x, r2.y - r1.y);
      break;

    case 'playerX':
      if (points.length < 1) return;
      const px = toCanvas(points[0]);
      const size = 25;
      ctx.lineWidth = strokeWidth + 2;
      ctx.beginPath();
      ctx.moveTo(px.x - size, px.y - size);
      ctx.lineTo(px.x + size, px.y + size);
      ctx.moveTo(px.x + size, px.y - size);
      ctx.lineTo(px.x - size, px.y + size);
      ctx.stroke();
      break;

    case 'playerO':
      if (points.length < 1) return;
      const po = toCanvas(points[0]);
      ctx.lineWidth = strokeWidth + 2;
      ctx.beginPath();
      ctx.arc(po.x, po.y, 25, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
