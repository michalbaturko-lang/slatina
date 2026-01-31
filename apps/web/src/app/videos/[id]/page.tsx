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
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Mic,
  MicOff,
  Camera,
  Brain,
  Check,
  X,
  Trash2,
  MousePointer,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Shield,
} from 'lucide-react';
import { getVideo, getVideoBlob, updateVideo, DemoVideo, AIEvent } from '@/lib/demo-store';
import {
  getTeam,
  getComments,
  addComment,
  deleteComment,
  addFeedback,
  getPlayers,
  searchPlayers,
  getPlayersByIds,
  CoachComment,
  Player,
} from '@/lib/team-store';

type ToolType = 'select' | 'pencil' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'playerX' | 'playerO';

interface Point { x: number; y: number; }

interface Annotation {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  startTime: number;
  endTime: number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];
const STROKE_WIDTHS = [2, 4, 6, 8];

// Inline styles for guaranteed rendering
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#030712',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    borderBottom: '1px solid #1f2937',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(8px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
    padding: '12px 16px',
  },
  headerContent: {
    maxWidth: '1800px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: '8px',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    marginRight: '16px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row' as const,
  },
  videoSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  videoContainer: {
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
  },
  videoWrapper: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '720px',
    maxHeight: '50vh',
    aspectRatio: '16/9',
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  canvas: {
    position: 'absolute' as const,
    inset: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
  },
  toolbar: {
    backgroundColor: '#111827',
    borderTop: '1px solid #1f2937',
    padding: '12px 16px',
  },
  toolbarContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#1f2937',
    padding: '4px',
    borderRadius: '8px',
  },
  toolButton: (active: boolean) => ({
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: active ? '#2563eb' : 'transparent',
    color: active ? 'white' : '#9ca3af',
  }),
  colorButton: (color: string, selected: boolean) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: selected ? '3px solid white' : '2px solid transparent',
    backgroundColor: color,
    cursor: 'pointer',
    transform: selected ? 'scale(1.1)' : 'scale(1)',
    transition: 'all 0.2s',
  }),
  controls: {
    backgroundColor: '#111827',
    borderTop: '1px solid #1f2937',
    padding: '16px',
  },
  controlsContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  timeline: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    appearance: 'none' as const,
    backgroundColor: '#374151',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  playButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPanel: {
    width: '320px',
    backgroundColor: '#111827',
    borderLeft: '1px solid #1f2937',
    display: 'flex',
    flexDirection: 'column' as const,
    overflowY: 'auto' as const,
  },
  aiPanelHeader: {
    padding: '16px',
    borderBottom: '1px solid #1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiEvent: {
    backgroundColor: '#1f2937',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  verifyButton: (isCorrect: boolean) => ({
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '14px',
    backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    color: isCorrect ? '#4ade80' : '#f87171',
  }),
  select: {
    backgroundColor: '#1f2937',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  volumeSlider: {
    width: '80px',
    height: '4px',
    borderRadius: '2px',
    appearance: 'none' as const,
    backgroundColor: '#374151',
    cursor: 'pointer',
  },
};

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<DemoVideo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [aiEvents, setAiEvents] = useState<AIEvent[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);

  // Coach comments
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Player tagging for comments
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<string | null>(null);

  // Feedback for wrong AI detections
  const [feedbackEventId, setFeedbackEventId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Team info
  const team = typeof window !== 'undefined' ? getTeam() : null;

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
        setAiEvents(videoData.aiEvents || []);
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

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'select') return;
    setIsDrawing(true);
    setCurrentPoints([getCanvasPoint(e)]);
  }, [selectedTool, getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    if (selectedTool === 'pencil') setCurrentPoints(prev => [...prev, point]);
    else setCurrentPoints(prev => [prev[0], point]);
  }, [isDrawing, selectedTool, getCanvasPoint]);

  const handleMouseUp = useCallback(() => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const visible = annotations.filter(a => currentTime >= a.startTime && currentTime <= a.endTime);
    for (const ann of visible) drawAnnotation(ctx, ann, canvas.width, canvas.height);
    if (isDrawing && currentPoints.length > 0) {
      drawAnnotation(ctx, { id: 'current', type: selectedTool, points: currentPoints, color: selectedColor, strokeWidth, startTime: 0, endTime: 0 }, canvas.width, canvas.height);
    }
  }, [annotations, currentTime, isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  }, [isRecording]);

  const captureScreenshot = useCallback(() => {
    const videoEl = videoRef.current;
    const annotationCanvas = canvasRef.current;
    if (!videoEl || !annotationCanvas) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoEl, 0, 0);
    ctx.drawImage(annotationCanvas, 0, 0, canvas.width, canvas.height);
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const verifyEvent = useCallback((eventId: string, isCorrect: boolean) => {
    if (isCorrect) {
      // Označeno jako správné - rovnou uložit
      setAiEvents(prev => prev.map(e => e.id === eventId ? { ...e, verified: true } : e));
      if (video) {
        const updated = aiEvents.map(e => e.id === eventId ? { ...e, verified: true } : e);
        updateVideo(video.id, { aiEvents: updated });
        addFeedback({
          eventId,
          videoId: video.id,
          isCorrect: true,
          comment: '',
        });
      }
    } else {
      // Označeno jako špatné - otevřít dialog pro komentář
      setFeedbackEventId(eventId);
      setFeedbackComment('');
    }
  }, [video, aiEvents]);

  const submitFeedback = useCallback(() => {
    if (!feedbackEventId || !video) return;

    // Uložit feedback s komentářem
    addFeedback({
      eventId: feedbackEventId,
      videoId: video.id,
      isCorrect: false,
      comment: feedbackComment,
    });

    // Označit jako verified=false
    setAiEvents(prev => prev.map(e => e.id === feedbackEventId ? { ...e, verified: false } : e));
    const updated = aiEvents.map(e => e.id === feedbackEventId ? { ...e, verified: false } : e);
    updateVideo(video.id, { aiEvents: updated });

    // Zavřít dialog
    setFeedbackEventId(null);
    setFeedbackComment('');
  }, [feedbackEventId, feedbackComment, video, aiEvents]);

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

  const filteredComments = playerFilter
    ? comments.filter(c => c.playerIds?.includes(playerFilter))
    : comments;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div style={{ ...styles.page, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <AlertCircle style={{ width: 48, height: 48, color: '#ef4444' }} />
        <p style={{ fontSize: 18 }}>{error || 'Video nebylo nalezeno'}</p>
        <Link href="/videos" style={{ color: '#3b82f6' }}>Zpět na seznam videí</Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/videos" style={styles.backButton}><ArrowLeft size={20} /></Link>
            <div>
              <h1 style={{ fontWeight: 600, fontSize: 18 }}>{video.title}</h1>
              <p style={{ fontSize: 14, color: '#9ca3af' }}>
                {new Date(video.date).toLocaleDateString('cs-CZ')}
                {video.opponent && ` • vs. ${video.opponent}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={captureScreenshot} style={styles.controlButton}>
              <Camera size={18} /> <span style={{ marginLeft: 4 }}>Screenshot</span>
            </button>
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        {/* Video Section */}
        <div style={styles.videoSection}>
          <div style={styles.videoContainer}>
            <div style={styles.videoWrapper}>
              {videoUrl ? (
                <video
                  ref={videoRef}
                  style={styles.video}
                  src={videoUrl}
                  onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div style={{ ...styles.video, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#6b7280' }}>Video není k dispozici</p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={styles.canvas}
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
          <div style={styles.toolbar}>
            <div style={styles.toolbarContent}>
              <div style={styles.toolGroup}>
                {[
                  { tool: 'select' as ToolType, icon: <MousePointer size={18} /> },
                  { tool: 'pencil' as ToolType, icon: <Pencil size={18} /> },
                  { tool: 'arrow' as ToolType, icon: <ArrowRight size={18} /> },
                  { tool: 'circle' as ToolType, icon: <Circle size={18} /> },
                  { tool: 'rectangle' as ToolType, icon: <Square size={18} /> },
                  { tool: 'playerX' as ToolType, icon: <span style={{ fontWeight: 'bold' }}>X</span> },
                  { tool: 'playerO' as ToolType, icon: <span style={{ fontWeight: 'bold' }}>O</span> },
                ].map(({ tool, icon }) => (
                  <button key={tool} style={styles.toolButton(selectedTool === tool)} onClick={() => setSelectedTool(tool)}>
                    {icon}
                  </button>
                ))}
              </div>

              <div style={styles.toolGroup}>
                {COLORS.map(color => (
                  <button key={color} style={styles.colorButton(color, selectedColor === color)} onClick={() => setSelectedColor(color)} />
                ))}
              </div>

              <button
                onClick={toggleRecording}
                style={{
                  ...styles.controlButton,
                  backgroundColor: isRecording ? '#dc2626' : '#1f2937',
                  padding: '8px 16px',
                  borderRadius: '8px',
                }}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                <span style={{ marginLeft: 8 }}>{isRecording ? 'Stop' : 'Nahrát komentář'}</span>
              </button>

              {annotations.length > 0 && (
                <button onClick={() => setAnnotations([])} style={styles.controlButton}>
                  <Trash2 size={18} /> <span style={{ marginLeft: 4 }}>Smazat vše</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlsContent}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={e => seek(parseFloat(e.target.value))}
                style={styles.timeline}
              />

              {/* AI Event Markers */}
              <div style={{ position: 'relative', height: 8, marginBottom: 16 }}>
                {aiEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => seek(event.time)}
                    style={{
                      position: 'absolute',
                      left: `${(event.time / duration) * 100}%`,
                      transform: 'translateX(-50%)',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: event.severity === 'critical' ? '#ef4444' : event.severity === 'warning' ? '#eab308' : '#22c55e',
                    }}
                    title={event.labelCz}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={styles.controlButton} onClick={() => seek(currentTime - 5)}><SkipBack size={20} /></button>
                  <button style={styles.playButton} onClick={togglePlay}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 2 }} />}
                  </button>
                  <button style={styles.controlButton} onClick={() => seek(currentTime + 5)}><SkipForward size={20} /></button>
                  <span style={{ marginLeft: 16, color: '#9ca3af', fontSize: 14 }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <select
                    value={playbackRate}
                    onChange={e => {
                      const rate = parseFloat(e.target.value);
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                    }}
                    style={styles.select}
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Volume2 size={18} style={{ color: '#9ca3af' }} />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={volume}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        setVolume(vol);
                        if (videoRef.current) videoRef.current.volume = vol;
                      }}
                      style={styles.volumeSlider}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - AI Events & Comments */}
        {showAIPanel && (
          <div style={styles.aiPanel}>
            {/* Team Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: team?.jerseyColor || '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="white" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{team?.name || 'SK Slatina 2007'}</span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
              <button
                onClick={() => setShowComments(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  backgroundColor: !showComments ? '#1f2937' : 'transparent',
                  color: !showComments ? '#a855f7' : '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Brain size={16} />
                AI ({aiEvents.length})
              </button>
              <button
                onClick={() => setShowComments(true)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  backgroundColor: showComments ? '#1f2937' : 'transparent',
                  color: showComments ? '#22c55e' : '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MessageSquare size={16} />
                Komentáře ({comments.length})
              </button>
            </div>

            {/* AI Events Tab */}
            {!showComments && (
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {aiEvents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>Žádné AI události</p>
                ) : (
                  aiEvents.map(event => (
                    <div key={event.id} style={styles.aiEvent} onClick={() => seek(event.time)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{event.labelCz || event.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(event.time)}</div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: event.severity === 'critical' ? 'rgba(239,68,68,0.2)' : event.severity === 'warning' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                          color: event.severity === 'critical' ? '#f87171' : event.severity === 'warning' ? '#facc15' : '#4ade80',
                        }}>
                          {Math.round(event.confidence * 100)}%
                        </span>
                      </div>

                      {event.coachingTips?.[0] && (
                        <p style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', marginBottom: 8 }}>
                          "{event.coachingTips[0]}"
                        </p>
                      )}

                      {event.verified === undefined ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...styles.verifyButton(true), fontSize: 12, padding: 6 }}
                            onClick={e => { e.stopPropagation(); verifyEvent(event.id, true); }}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            style={{ ...styles.verifyButton(false), fontSize: 12, padding: 6 }}
                            onClick={e => { e.stopPropagation(); verifyEvent(event.id, false); }}
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          padding: 6,
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: event.verified ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: event.verified ? '#4ade80' : '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {event.verified ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                          {event.verified ? 'Správně' : 'Chybné - AI se učí'}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Comments Tab */}
            {showComments && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Player Filter */}
                {comments.length > 0 && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #1f2937' }}>
                    <select
                      value={playerFilter || ''}
                      onChange={e => setPlayerFilter(e.target.value || null)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: 12,
                      }}
                    >
                      <option value="">Všichni hráči</option>
                      {getPlayers().filter(p => p.active).map(player => (
                        <option key={player.id} value={player.id}>
                          {player.number ? `#${player.number} ` : ''}{player.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                  {filteredComments.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
                      {playerFilter ? 'Žádné komentáře pro tohoto hráče.' : 'Zatím žádné komentáře.'}<br />
                      <span style={{ fontSize: 12 }}>Přidejte komentář k aktuálnímu času videa.</span>
                    </p>
                  ) : (
                    filteredComments.sort((a, b) => a.time - b.time).map(comment => (
                      <div
                        key={comment.id}
                        style={{ ...styles.aiEvent, position: 'relative' }}
                        onClick={() => seek(comment.time)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {formatTime(comment.time)}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              padding: 2,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p style={{ fontSize: 13, marginBottom: comment.playerIds?.length ? 6 : 0 }}>{comment.text}</p>
                        {comment.playerIds?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {getPlayersByIds(comment.playerIds).map(player => (
                              <span
                                key={player.id}
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  borderRadius: 10,
                                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                  color: '#60a5fa',
                                }}
                              >
                                {player.number ? `#${player.number} ` : ''}{player.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment with player tagging */}
                <div style={{ padding: 12, borderTop: '1px solid #1f2937' }}>
                  {/* Selected players */}
                  {selectedPlayers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {selectedPlayers.map(player => (
                        <span
                          key={player.id}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {player.number ? `#${player.number} ` : ''}{player.name}
                          <button
                            onClick={() => removePlayerTag(player.id)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, display: 'flex' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Player search */}
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={e => {
                        setPlayerSearch(e.target.value);
                        setShowPlayerDropdown(true);
                      }}
                      onFocus={() => setShowPlayerDropdown(true)}
                      placeholder="@ Označit hráče..."
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: 12,
                      }}
                    />
                    {showPlayerDropdown && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#1f2937',
                        borderRadius: 6,
                        marginBottom: 4,
                        maxHeight: 150,
                        overflow: 'auto',
                        boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
                      }}>
                        {searchPlayers(playerSearch)
                          .filter(p => !selectedPlayers.find(sp => sp.id === p.id))
                          .slice(0, 6)
                          .map(player => (
                            <button
                              key={player.id}
                              onClick={() => addPlayerTag(player)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: 12,
                              }}
                              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#374151')}
                              onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {player.number ? `#${player.number} ` : ''}{player.name}
                              {player.position && <span style={{ color: '#6b7280', marginLeft: 8 }}>{player.position}</span>}
                            </button>
                          ))}
                        {searchPlayers(playerSearch).filter(p => !selectedPlayers.find(sp => sp.id === p.id)).length === 0 && (
                          <div style={{ padding: '8px 12px', color: '#6b7280', fontSize: 12 }}>
                            Žádný hráč nenalezen
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment input */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder={`Komentář v ${formatTime(currentTime)}...`}
                      style={{
                        flex: 1,
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 12px',
                        color: 'white',
                        fontSize: 13,
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      onFocus={() => setShowPlayerDropdown(false)}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: newComment.trim() ? '#22c55e' : '#374151',
                        border: 'none',
                        borderRadius: 6,
                        color: 'white',
                        cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel Toggle */}
        {!showAIPanel && (
          <button
            onClick={() => setShowAIPanel(true)}
            style={{
              position: 'fixed',
              right: 16,
              bottom: 16,
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#9333ea',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <Brain size={24} />
          </button>
        )}
      </div>

      {/* Feedback Dialog */}
      {feedbackEventId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Co bylo špatně?
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
              Popište, proč byla AI detekce chybná. Tato zpětná vazba pomůže AI se zlepšit.
            </p>
            <textarea
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              placeholder="např. 'Hráči nebyli moc blízko, měli správné rozestupy'"
              style={{
                width: '100%',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: 8,
                padding: 12,
                color: 'white',
                fontSize: 14,
                minHeight: 100,
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setFeedbackEventId(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Zrušit
              </button>
              <button
                onClick={submitFeedback}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Odeslat
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; border: none; }
      `}</style>
    </div>
  );
}

function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: Annotation, width: number, height: number) {
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
    case 'playerX':
      if (points.length < 1) return;
      const px = toCanvas(points[0]);
      ctx.lineWidth = strokeWidth + 2;
      ctx.beginPath(); ctx.moveTo(px.x - 25, px.y - 25); ctx.lineTo(px.x + 25, px.y + 25);
      ctx.moveTo(px.x + 25, px.y - 25); ctx.lineTo(px.x - 25, px.y + 25); ctx.stroke();
      break;
    case 'playerO':
      if (points.length < 1) return;
      const po = toCanvas(points[0]);
      ctx.lineWidth = strokeWidth + 2;
      ctx.beginPath(); ctx.arc(po.x, po.y, 25, 0, Math.PI * 2); ctx.stroke();
      break;
  }
}
