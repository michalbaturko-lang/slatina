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
  VolumeX,
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Mic,
  MicOff,
  Camera,
  X,
  Trash2,
  MousePointer,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
  Shield,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getVideo,
  getVideoBlob,
  updateVideo,
  addScreenshot,
  deleteScreenshot,
  addAudioComment,
  DemoVideo,
  Screenshot,
} from '@/lib/demo-store';
import {
  getTeam,
  getComments,
  addComment,
  deleteComment,
  getPlayers,
  searchPlayers,
  getPlayersByIds,
  CoachComment,
  Player,
} from '@/lib/team-store';

type ToolType = 'select' | 'pencil' | 'arrow' | 'circle' | 'rectangle' | 'playerMarker';

interface Point { x: number; y: number; }

interface Annotation {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  startTime: number;
  endTime: number;
  playerId?: string;
  playerName?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];
const STROKE_WIDTHS = [2, 4, 6, 8];

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<DemoVideo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Player marker
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<Point | null>(null);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Screenshots
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [showScreenshots, setShowScreenshots] = useState(false);

  // Comments
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  // Mobile panel
  const [showPanel, setShowPanel] = useState(false);

  const team = typeof window !== 'undefined' ? getTeam() : null;

  // Determine if drawing mode is active (not select mode)
  const isDrawingMode = selectedTool !== 'select';

  // Lock/unlock body scroll when drawing mode changes
  useEffect(() => {
    if (isDrawingMode) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDrawingMode]);

  useEffect(() => {
    const loadVideoData = async () => {
      try {
        const videoData = getVideo(params.id);
        if (!videoData) {
          setError('Video nebylo nalezeno');
          setLoading(false);
          return;
        }
        setVideo(videoData);
        setScreenshots(videoData.screenshots || []);
        setComments(getComments(params.id));
        const blob = await getVideoBlob(params.id);
        if (blob) {
          setVideoUrl(URL.createObjectURL(blob));
        }
        setLoading(false);
      } catch {
        setError('Chyba při načítání videa');
        setLoading(false);
      }
    };
    loadVideoData();
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [params.id]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (selectedTool === 'select') return;

    // Prevent default to stop scrolling when drawing
    e.preventDefault();

    const point = getCanvasPoint(e);

    if (selectedTool === 'playerMarker') {
      setMarkerPosition(point);
      setShowPlayerSelect(true);
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([point]);
  }, [selectedTool, getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (selectedTool === 'pencil') setCurrentPoints(prev => [...prev, point]);
    else setCurrentPoints(prev => [prev[0], point]);
  }, [isDrawing, selectedTool, getCanvasPoint]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || currentPoints.length === 0) return;
    setAnnotations(prev => [...prev, {
      id: Date.now().toString(),
      type: selectedTool,
      points: currentPoints,
      color: selectedColor,
      strokeWidth,
      startTime: currentTime,
      endTime: currentTime + 5,
    }]);
    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth, currentTime]);

  const addPlayerMarker = useCallback((player: Player) => {
    if (!markerPosition) return;
    setAnnotations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'playerMarker',
      points: [markerPosition],
      color: selectedColor,
      strokeWidth: 4,
      startTime: currentTime,
      endTime: currentTime + 10,
      playerId: player.id,
      playerName: player.name,
    }]);
    setMarkerPosition(null);
    setShowPlayerSelect(false);
  }, [markerPosition, selectedColor, currentTime]);

  // Draw annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visible = annotations.filter(a => currentTime >= a.startTime && currentTime <= a.endTime);
    for (const ann of visible) drawAnnotation(ctx, ann, canvas.width, canvas.height);

    if (isDrawing && currentPoints.length > 0) {
      drawAnnotation(ctx, {
        id: 'current',
        type: selectedTool,
        points: currentPoints,
        color: selectedColor,
        strokeWidth,
        startTime: 0,
        endTime: 0
      }, canvas.width, canvas.height);
    }
  }, [annotations, currentTime, isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth]);

  // Audio Recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        const startTime = currentTime;

        recorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);

          if (video) {
            addAudioComment(video.id, {
              time: startTime,
              duration: recordingTime,
              blobUrl: audioUrl,
            });
          }

          stream.getTracks().forEach(track => track.stop());
          setRecordingTime(0);
        };

        recorder.start();
        setIsRecording(true);

        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(t => t + 1);
        }, 1000);
      } catch (err) {
        console.error('Failed to start recording:', err);
        alert('Nelze spustit nahrávání. Povolte přístup k mikrofonu.');
      }
    }
  }, [isRecording, currentTime, recordingTime, video]);

  // Screenshot
  const captureScreenshot = useCallback(() => {
    const videoEl = videoRef.current;
    const annotationCanvas = canvasRef.current;
    if (!videoEl || !annotationCanvas || !video) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoEl, 0, 0);
    ctx.drawImage(annotationCanvas, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');

    const newScreenshot = addScreenshot(video.id, {
      time: currentTime,
      dataUrl,
    });

    if (newScreenshot) {
      setScreenshots(prev => [...prev, newScreenshot]);

      // Set first screenshot as thumbnail
      if (!video.thumbnail) {
        updateVideo(video.id, { thumbnail: dataUrl });
      }
    }
  }, [video, currentTime]);

  const handleDeleteScreenshot = useCallback((screenshotId: string) => {
    if (!video) return;
    deleteScreenshot(video.id, screenshotId);
    setScreenshots(prev => prev.filter(s => s.id !== screenshotId));
  }, [video]);

  // Comments
  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !video) return;
    const comment = addComment({
      videoId: video.id,
      time: currentTime,
      text: newComment.trim(),
      category: 'note',
      playerIds: selectedPlayers.map(p => p.id),
    });
    setComments(prev => [...prev, comment]);
    setNewComment('');
    setSelectedPlayers([]);
    setPlayerSearch('');
  }, [newComment, video, currentTime, selectedPlayers]);

  const handleDeleteComment = useCallback((id: string) => {
    deleteComment(id);
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  const addPlayerTag = useCallback((player: Player) => {
    if (!selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => [...prev, player]);
    }
    setPlayerSearch('');
    setShowPlayerDropdown(false);
  }, [selectedPlayers]);

  const removePlayerTag = useCallback((playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: '#ef4444' }} />
        <p style={{ fontSize: 18 }}>{error || 'Video nebylo nalezeno'}</p>
        <Link href="/videos" style={{ color: '#3b82f6' }}>Zpět na seznam videí</Link>
      </div>
    );
  }

  const scoreDisplay = video.scoreHome !== undefined && video.scoreAway !== undefined
    ? `${video.scoreHome}:${video.scoreAway}`
    : null;

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        maxHeight: '100vh',
        backgroundColor: '#030712',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: isDrawingMode ? 'hidden' : 'auto',
        touchAction: isDrawingMode ? 'none' : 'auto',
      }}
    >
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1f2937',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: '8px 12px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <Link href="/videos" style={{ padding: 8, color: 'white', flexShrink: 0 }}>
              <ArrowLeft size={20} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</h1>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>
                {new Date(video.date).toLocaleDateString('cs-CZ')}
                {video.opponent && ` • vs. ${video.opponent}`}
                {scoreDisplay && ` (${scoreDisplay})`}
              </p>
            </div>
          </div>

          {/* Mobile panel toggle */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              display: 'flex',
              padding: 8,
              backgroundColor: showPanel ? '#2563eb' : '#1f2937',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={18} />
            <span style={{ marginLeft: 4, fontSize: 12 }}>{comments.length}</span>
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Video Container */}
        <div style={{ backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, flexShrink: 0 }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '800px',
            aspectRatio: '16/9',
            backgroundColor: '#1f2937',
            borderRadius: 8,
            overflow: 'hidden',
            touchAction: isDrawingMode ? 'none' : 'auto',
          }}>
            {videoUrl ? (
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                src={videoUrl}
                onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#6b7280' }}>Video není k dispozici</p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: selectedTool !== 'select' ? 'crosshair' : 'default',
                touchAction: isDrawingMode ? 'none' : 'auto',
              }}
              width={1920}
              height={1080}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* Drawing mode indicator */}
            {isDrawingMode && (
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(37, 99, 235, 0.9)',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
              }}>
                ✏️ Kreslení aktivní
              </div>
            )}
          </div>
        </div>

        {/* Toolbar - Fixed width with horizontal scroll */}
        <div style={{
          backgroundColor: '#111827',
          borderTop: '1px solid #1f2937',
          padding: '8px 0',
          flexShrink: 0,
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            minWidth: 'max-content',
          }}>
            {/* Tools */}
            <div style={{ display: 'flex', gap: 2, backgroundColor: '#1f2937', padding: 4, borderRadius: 8 }}>
              {[
                { tool: 'select' as ToolType, icon: <MousePointer size={16} />, label: 'Výběr' },
                { tool: 'pencil' as ToolType, icon: <Pencil size={16} />, label: 'Tužka' },
                { tool: 'arrow' as ToolType, icon: <ArrowRight size={16} />, label: 'Šipka' },
                { tool: 'circle' as ToolType, icon: <Circle size={16} />, label: 'Kruh' },
                { tool: 'rectangle' as ToolType, icon: <Square size={16} />, label: 'Obdélník' },
                { tool: 'playerMarker' as ToolType, icon: <Users size={16} />, label: 'Hráč' },
              ].map(({ tool, icon, label }) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool)}
                  title={label}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: selectedTool === tool ? '#2563eb' : 'transparent',
                    color: selectedTool === tool ? 'white' : '#9ca3af',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />

            {/* Colors */}
            <div style={{ display: 'flex', gap: 4 }}>
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: selectedColor === color ? '3px solid white' : '2px solid transparent',
                    backgroundColor: color,
                    cursor: 'pointer',
                    boxShadow: selectedColor === color ? '0 0 0 2px #2563eb' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />

            {/* Stroke Width */}
            <div style={{ display: 'flex', gap: 2, backgroundColor: '#1f2937', padding: 4, borderRadius: 8 }}>
              {STROKE_WIDTHS.map(width => (
                <button
                  key={width}
                  onClick={() => setStrokeWidth(width)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: strokeWidth === width ? '#2563eb' : 'transparent',
                    color: 'white',
                  }}
                >
                  <div style={{
                    width: width * 2,
                    height: width * 2,
                    borderRadius: '50%',
                    backgroundColor: 'currentColor',
                  }} />
                </button>
              ))}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />

            {/* Actions */}
            <button
              onClick={toggleRecording}
              style={{
                padding: '8px 12px',
                backgroundColor: isRecording ? '#dc2626' : '#1f2937',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              {isRecording ? formatTime(recordingTime) : 'Nahrát'}
            </button>

            <button
              onClick={captureScreenshot}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Camera size={16} />
            </button>

            {screenshots.length > 0 && (
              <button
                onClick={() => setShowScreenshots(!showScreenshots)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: showScreenshots ? '#2563eb' : '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ImageIcon size={16} />
                {screenshots.length}
              </button>
            )}

            {annotations.length > 0 && (
              <button
                onClick={() => setAnnotations([])}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Screenshots Gallery */}
        {showScreenshots && screenshots.length > 0 && (
          <div style={{ backgroundColor: '#111827', borderTop: '1px solid #1f2937', padding: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {screenshots.map(screenshot => (
                <div key={screenshot.id} style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={screenshot.dataUrl}
                    alt={`Screenshot at ${formatTime(screenshot.time)}`}
                    style={{ height: 80, borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => seek(screenshot.time)}
                  />
                  <button
                    onClick={() => handleDeleteScreenshot(screenshot.id)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                  <span style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    fontSize: 10,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    {formatTime(screenshot.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Controls */}
        <div style={{ backgroundColor: '#111827', borderTop: '1px solid #1f2937', padding: '12px 16px', flexShrink: 0 }}>
          {/* Timeline */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={e => seek(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              appearance: 'none',
              backgroundColor: '#374151',
              cursor: 'pointer',
              marginBottom: 12,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => seek(currentTime - 5)} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <SkipBack size={20} />
              </button>
              <button
                onClick={togglePlay}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
              </button>
              <button onClick={() => seek(currentTime + 5)} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <SkipForward size={20} />
              </button>
              <span style={{ color: '#9ca3af', fontSize: 13, marginLeft: 8 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={playbackRate}
                onChange={e => {
                  const rate = parseFloat(e.target.value);
                  setPlaybackRate(rate);
                  if (videoRef.current) videoRef.current.playbackRate = rate;
                }}
                style={{
                  backgroundColor: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              <button onClick={toggleMute} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Comments Panel (slide up on mobile) */}
        {showPanel && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#111827',
            borderTop: '1px solid #1f2937',
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            borderRadius: '16px 16px 0 0',
          }}>
            {/* Panel Header */}
            <div style={{ padding: 12, borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: team?.jerseyColor || '#ffffff', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={14} color="#22c55e" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{team?.name || 'SK Slatina 2017'}</span>
              </div>
              <button onClick={() => setShowPanel(false)} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {comments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
                  Zatím žádné komentáře.<br />
                  <span style={{ fontSize: 12 }}>Přidejte komentář k aktuálnímu času.</span>
                </p>
              ) : (
                comments.sort((a, b) => a.time - b.time).map(comment => (
                  <div
                    key={comment.id}
                    onClick={() => { seek(comment.time); setShowPanel(false); }}
                    style={{
                      backgroundColor: '#1f2937',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(comment.time)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                        style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 2 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: 13 }}>{comment.text}</p>
                    {comment.playerIds?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {getPlayersByIds(comment.playerIds).map(player => (
                          <span key={player.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                            {player.number ? `#${player.number} ` : ''}{player.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div style={{ padding: 12, borderTop: '1px solid #1f2937' }}>
              {selectedPlayers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {selectedPlayers.map(player => (
                    <span key={player.id} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {player.number ? `#${player.number} ` : ''}{player.name}
                      <button onClick={() => removePlayerTag(player.id)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input
                  type="text"
                  value={playerSearch}
                  onChange={e => { setPlayerSearch(e.target.value); setShowPlayerDropdown(true); }}
                  onFocus={() => setShowPlayerDropdown(true)}
                  placeholder="@ Označit hráče..."
                  style={{ width: '100%', backgroundColor: '#1f2937', border: 'none', borderRadius: 6, padding: '8px 10px', color: 'white', fontSize: 13 }}
                />
                {showPlayerDropdown && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, backgroundColor: '#1f2937', borderRadius: 6, marginBottom: 4, maxHeight: 150, overflow: 'auto', boxShadow: '0 -4px 12px rgba(0,0,0,0.3)' }}>
                    {searchPlayers(playerSearch).filter(p => !selectedPlayers.find(sp => sp.id === p.id)).slice(0, 6).map(player => (
                      <button key={player.id} onClick={() => addPlayerTag(player)} style={{ width: '100%', padding: '10px 12px', backgroundColor: 'transparent', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: 13 }}>
                        {player.number ? `#${player.number} ` : ''}{player.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={`Komentář v ${formatTime(currentTime)}...`}
                  style={{ flex: 1, backgroundColor: '#1f2937', border: 'none', borderRadius: 6, padding: '10px 12px', color: 'white', fontSize: 14 }}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  onFocus={() => setShowPlayerDropdown(false)}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  style={{ padding: '10px 16px', backgroundColor: newComment.trim() ? '#22c55e' : '#374151', border: 'none', borderRadius: 6, color: 'white', cursor: newComment.trim() ? 'pointer' : 'not-allowed' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Marker Selection Modal */}
        {showPlayerSelect && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 320, maxHeight: '60vh', overflow: 'auto' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Vyber hráče</h3>
              {getPlayers().filter(p => p.active).map(player => (
                <button
                  key={player.id}
                  onClick={() => addPlayerMarker(player)}
                  style={{ width: '100%', padding: 12, backgroundColor: '#374151', border: 'none', borderRadius: 8, color: 'white', textAlign: 'left', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {player.number || '?'}
                  </span>
                  <span>{player.name}</span>
                </button>
              ))}
              <button
                onClick={() => { setShowPlayerSelect(false); setMarkerPosition(null); }}
                style={{ width: '100%', padding: 12, backgroundColor: '#374151', border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', marginTop: 8 }}
              >
                Zrušit
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: none; }
      `}</style>
    </div>
  );
}

function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: Annotation, width: number, height: number) {
  const { type, points, color, strokeWidth, playerName } = annotation;
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
      for (let i = 1; i < points.length; i++) ctx.lineTo(toCanvas(points[i]).x, toCanvas(points[i]).y);
      ctx.stroke();
      break;
    case 'arrow':
      if (points.length < 2) return;
      const start = toCanvas(points[0]), end = toCanvas(points[1]);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - 20 * Math.cos(angle - Math.PI / 6), end.y - 20 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - 20 * Math.cos(angle + Math.PI / 6), end.y - 20 * Math.sin(angle + Math.PI / 6));
      ctx.closePath(); ctx.fill();
      break;
    case 'circle':
      if (points.length < 2) return;
      const c1 = toCanvas(points[0]), c2 = toCanvas(points[1]);
      const radius = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2));
      ctx.beginPath(); ctx.arc(c1.x, c1.y, radius, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'rectangle':
      if (points.length < 2) return;
      const r1 = toCanvas(points[0]), r2 = toCanvas(points[1]);
      ctx.strokeRect(r1.x, r1.y, r2.x - r1.x, r2.y - r1.y);
      break;
    case 'playerMarker':
      if (points.length < 1) return;
      const pm = toCanvas(points[0]);
      // Draw circle
      ctx.beginPath();
      ctx.arc(pm.x, pm.y, 25, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // Draw name
      if (playerName) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerName.substring(0, 3).toUpperCase(), pm.x, pm.y);
      }
      break;
  }
}
