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
  Send,
  Users,
  PlayCircle,
  MessageSquare,
  Image as ImageIcon,
  Share2,
  Download,
} from 'lucide-react';
import {
  getVideo,
  getVideoBlob,
  updateVideo,
  addScreenshot,
  deleteScreenshot,
  addAudioComment,
  deleteAudioComment,
  DemoVideo,
  Screenshot,
  AudioComment,
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

// Timeline marker types
interface TimelineMarker {
  id: string;
  time: number;
  type: 'comment' | 'screenshot' | 'audio';
  label?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];
const STROKE_WIDTHS = [4, 6, 8, 12];

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<DemoVideo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Player marker
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<Point | null>(null);

  // Audio recording with transcription
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  // Screenshots and audio comments
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [audioComments, setAudioComments] = useState<AudioComment[]>([]);

  // Text comments
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);

  const team = typeof window !== 'undefined' ? getTeam() : null;
  const isDrawingMode = selectedTool !== 'select';

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll when drawing
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

  // Smooth time update using requestAnimationFrame
  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current && isPlaying) {
        setCurrentTime(videoRef.current.currentTime);
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

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
        setAudioComments(videoData.audioComments || []);
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
    const newTime = Math.max(0, Math.min(time, duration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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
        id: 'current', type: selectedTool, points: currentPoints,
        color: selectedColor, strokeWidth, startTime: 0, endTime: 0
      }, canvas.width, canvas.height);
    }
  }, [annotations, currentTime, isDrawing, currentPoints, selectedTool, selectedColor, strokeWidth]);

  // Audio Recording with Speech Recognition
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      recognitionRef.current?.stop();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        transcriptRef.current = '';
        const startTime = currentTime;
        const recordStartTime = Date.now();

        // Start speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.lang = 'cs-CZ';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript + ' ';
            }
            transcriptRef.current = fullTranscript.trim();
            setTranscription(fullTranscript.trim());
          };
          recognition.onerror = (e: any) => console.log('Speech recognition error:', e.error);
          recognition.start();
          recognitionRef.current = recognition;
        }

        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const finalTranscript = transcriptRef.current;
          const recordingDuration = Math.round((Date.now() - recordStartTime) / 1000);

          if (video) {
            const newAudio = addAudioComment(video.id, {
              time: startTime,
              duration: recordingDuration,
              blobUrl: audioUrl,
            });
            if (newAudio) {
              // Create audio with transcript
              const audioWithTranscript: AudioComment = { ...newAudio, transcript: finalTranscript };
              setAudioComments(prev => [...prev, audioWithTranscript]);

              // Update in storage with transcript
              const updatedVideo = getVideo(video.id);
              if (updatedVideo) {
                const updatedAudioComments = updatedVideo.audioComments.map(a =>
                  a.id === newAudio.id ? { ...a, transcript: finalTranscript } : a
                );
                updateVideo(video.id, { audioComments: updatedAudioComments });
              }
            }
          }
          stream.getTracks().forEach(track => track.stop());
          setRecordingTime(0);
          setTranscription('');
          transcriptRef.current = '';
        };

        recorder.start();
        setIsRecording(true);
        recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } catch (err) {
        console.error('Recording failed:', err);
        alert('Nelze spustit nahrávání. Povolte přístup k mikrofonu.');
      }
    }
  }, [isRecording, currentTime, video]);

  // Screenshot
  const captureScreenshot = useCallback(() => {
    const videoEl = videoRef.current;
    const annotationCanvas = canvasRef.current;
    if (!videoEl || !video) {
      console.error('Video element or video data not available');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const width = videoEl.videoWidth || 1280;
      const height = videoEl.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoEl, 0, 0, width, height);
      if (annotationCanvas) {
        ctx.drawImage(annotationCanvas, 0, 0, width, height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const newScreenshot = addScreenshot(video.id, { time: currentTime, dataUrl });

      if (newScreenshot) {
        setScreenshots(prev => [...prev, newScreenshot]);
        if (!video.thumbnail) {
          updateVideo(video.id, { thumbnail: dataUrl });
          setVideo(prev => prev ? { ...prev, thumbnail: dataUrl } : null);
        }
        alert('Screenshot uložen!');
      }
    } catch (err) {
      console.error('Screenshot failed:', err);
      alert('Nepodařilo se vytvořit screenshot');
    }
  }, [video, currentTime]);

  const handleDeleteScreenshot = useCallback((id: string) => {
    if (!video) return;
    deleteScreenshot(video.id, id);
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, [video]);

  // Share screenshot using native Share API
  const shareScreenshot = useCallback(async (screenshot: Screenshot) => {
    try {
      // Convert dataUrl to blob
      const response = await fetch(screenshot.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `screenshot-${formatTime(screenshot.time)}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Screenshot v ${formatTime(screenshot.time)}`,
          text: video?.title || 'Video screenshot',
        });
      } else {
        // Fallback - download the image
        const link = document.createElement('a');
        link.href = screenshot.dataUrl;
        link.download = `screenshot-${formatTime(screenshot.time)}.jpg`;
        link.click();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
        // Fallback - download
        const link = document.createElement('a');
        link.href = screenshot.dataUrl;
        link.download = `screenshot-${formatTime(screenshot.time)}.jpg`;
        link.click();
      }
    }
  }, [video]);

  const handleDeleteAudio = useCallback((id: string) => {
    if (!video) return;
    deleteAudioComment(video.id, id);
    setAudioComments(prev => prev.filter(a => a.id !== id));
  }, [video]);

  // Comments
  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !video) return;
    const comment = addComment({
      videoId: video.id, time: currentTime, text: newComment.trim(),
      category: 'note', playerIds: selectedPlayers.map(p => p.id),
    });
    setComments(prev => [...prev, comment]);
    setNewComment('');
    setSelectedPlayers([]);
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

  // Share video summary with all annotations
  const shareVideoSummary = useCallback(async () => {
    if (!video) return;

    // Build summary text
    let summary = `📹 ${video.title}\n`;
    summary += `📅 ${new Date(video.date).toLocaleDateString('cs-CZ')}\n`;
    if (video.opponent) {
      summary += `⚽ vs. ${video.opponent}`;
      if (video.scoreHome !== undefined && video.scoreAway !== undefined) {
        summary += ` (${video.scoreHome}:${video.scoreAway})`;
      }
      summary += '\n';
    }
    summary += '\n';

    // Add comments
    if (comments.length > 0) {
      summary += '💬 KOMENTÁŘE:\n';
      comments.sort((a, b) => a.time - b.time).forEach(c => {
        const players = c.playerIds?.length > 0
          ? getPlayersByIds(c.playerIds).map(p => `#${p.number} ${p.name}`).join(', ')
          : '';
        summary += `  [${formatTime(c.time)}] ${c.text}`;
        if (players) summary += ` (${players})`;
        summary += '\n';
      });
      summary += '\n';
    }

    // Add audio transcripts
    const audioWithTranscripts = audioComments.filter(a => a.transcript);
    if (audioWithTranscripts.length > 0) {
      summary += '🎙️ HLASOVÉ KOMENTÁŘE:\n';
      audioWithTranscripts.forEach(a => {
        summary += `  [${formatTime(a.time)}] "${a.transcript}"\n`;
      });
      summary += '\n';
    }

    // Add screenshots info
    if (screenshots.length > 0) {
      summary += `📸 SCREENSHOTY: ${screenshots.length} momentek\n`;
      screenshots.forEach(s => {
        summary += `  [${formatTime(s.time)}]\n`;
      });
      summary += '\n';
    }

    summary += '---\n';
    summary += 'Vytvořeno v Slatina Video Analysis';

    // Try to share
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: summary,
        });
      } else {
        // Fallback - copy to clipboard
        await navigator.clipboard.writeText(summary);
        alert('Shrnutí zkopírováno do schránky!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Fallback - copy to clipboard
        try {
          await navigator.clipboard.writeText(summary);
          alert('Shrnutí zkopírováno do schránky!');
        } catch {
          console.error('Could not share or copy:', err);
        }
      }
    }
  }, [video, comments, audioComments, screenshots]);

  // Format time with decimal for smooth display
  const formatTime = (s: number, showDecimal = false) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const decimal = Math.floor((s % 1) * 10);
    if (showDecimal) {
      return `${m}:${sec.toString().padStart(2, '0')}.${decimal}`;
    }
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Build timeline markers
  const timelineMarkers: TimelineMarker[] = [
    ...comments.map(c => ({ id: c.id, time: c.time, type: 'comment' as const, label: c.text.substring(0, 20) })),
    ...screenshots.map(s => ({ id: s.id, time: s.time, type: 'screenshot' as const })),
    ...audioComments.map(a => ({ id: a.id, time: a.time, type: 'audio' as const, label: a.transcript?.substring(0, 20) })),
  ];

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
        <p>{error || 'Video nebylo nalezeno'}</p>
        <Link href="/videos" style={{ color: '#3b82f6' }}>Zpět na seznam</Link>
      </div>
    );
  }

  const scoreDisplay = video.scoreHome !== undefined && video.scoreAway !== undefined
    ? `${video.scoreHome}:${video.scoreAway}` : null;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: 'white',
      overflow: isDrawingMode ? 'hidden' : 'auto',
      touchAction: isDrawingMode ? 'none' : 'auto',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1f2937',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: '8px 12px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/videos" style={{ padding: 8, color: 'white' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</h1>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>
              {new Date(video.date).toLocaleDateString('cs-CZ')}
              {video.opponent && ` • vs. ${video.opponent}`}
              {scoreDisplay && ` (${scoreDisplay})`}
            </p>
          </div>
          <button
            onClick={shareVideoSummary}
            style={{
              padding: '8px 12px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
          >
            <Share2 size={16} />
            Sdílet
          </button>
        </div>
      </header>

      {/* Video */}
      <div style={{ backgroundColor: '#000', padding: 8 }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 900,
          margin: '0 auto',
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
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onSeeked={() => setCurrentTime(videoRef.current?.currentTime || 0)}
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
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              cursor: isDrawingMode ? 'crosshair' : 'default',
              touchAction: isDrawingMode ? 'none' : 'auto',
            }}
            width={1920} height={1080}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
          {isDrawingMode && (
            <div style={{
              position: 'absolute', top: 8, left: 8,
              backgroundColor: 'rgba(37, 99, 235, 0.9)',
              padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            }}>
              ✏️ Kreslení aktivní
            </div>
          )}
        </div>
      </div>

      {/* Toolbar - responsive: row on PC, stacked on mobile */}
      <div style={{ backgroundColor: '#111827', padding: 12, maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 16,
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          {/* Tools */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[
              { tool: 'select' as ToolType, icon: <MousePointer size={18} /> },
              { tool: 'pencil' as ToolType, icon: <Pencil size={18} /> },
              { tool: 'arrow' as ToolType, icon: <ArrowRight size={18} /> },
              { tool: 'circle' as ToolType, icon: <Circle size={18} /> },
              { tool: 'rectangle' as ToolType, icon: <Square size={18} /> },
              { tool: 'playerMarker' as ToolType, icon: <Users size={18} /> },
            ].map(({ tool, icon }) => (
              <button
                key={tool}
                onClick={() => setSelectedTool(tool)}
                style={{
                  width: 40, height: 40, borderRadius: 8, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  backgroundColor: selectedTool === tool ? '#2563eb' : '#1f2937',
                  color: selectedTool === tool ? 'white' : '#9ca3af',
                }}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Divider on PC */}
          {!isMobile && <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />}

          {/* Colors */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  border: selectedColor === color ? '3px solid white' : '2px solid transparent',
                  backgroundColor: color, cursor: 'pointer',
                  boxShadow: selectedColor === color ? '0 0 0 2px #2563eb' : 'none',
                }}
              />
            ))}
          </div>

          {/* Divider on PC */}
          {!isMobile && <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />}

          {/* Stroke widths */}
          <div style={{ display: 'flex', gap: 4 }}>
            {STROKE_WIDTHS.map(w => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                style={{
                  width: 32, height: 32, borderRadius: 6, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  backgroundColor: strokeWidth === w ? '#2563eb' : '#1f2937',
                }}
              >
                <div style={{ width: w * 2, height: w * 2, borderRadius: '50%', backgroundColor: 'white' }} />
              </button>
            ))}
          </div>

          {/* Divider on PC */}
          {!isMobile && <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={toggleRecording}
              style={{
                padding: '8px 14px',
                backgroundColor: isRecording ? '#dc2626' : '#1f2937',
                border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              {isRecording ? `${formatTime(recordingTime)}` : 'Nahrát'}
            </button>

            <button
              onClick={captureScreenshot}
              style={{
                padding: '8px 14px',
                backgroundColor: '#1f2937',
                border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              <Camera size={16} />
              Screenshot
            </button>

            {annotations.length > 0 && (
              <button
                onClick={() => setAnnotations([])}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#1f2937',
                  border: 'none', borderRadius: 8, color: '#ef4444', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                }}
              >
                <Trash2 size={16} />
                Smazat
              </button>
            )}
          </div>
        </div>

        {/* Transcription preview */}
        {isRecording && transcription && (
          <div style={{
            marginTop: 8, padding: 8, backgroundColor: '#1f2937',
            borderRadius: 8, fontSize: 12, color: '#9ca3af',
          }}>
            <strong>Přepis:</strong> {transcription}
          </div>
        )}
      </div>

      {/* Video Controls with Timeline */}
      <div style={{ backgroundColor: '#111827', padding: '12px 16px', borderTop: '1px solid #1f2937', maxWidth: 900, margin: '0 auto' }}>
        {/* Timeline with markers */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="range"
            min={0} max={duration || 100} value={currentTime} step={0.1}
            onChange={e => seek(parseFloat(e.target.value))}
            style={{ width: '100%', height: 8, borderRadius: 4, appearance: 'none', backgroundColor: '#374151', cursor: 'pointer' }}
          />
          {/* Markers on timeline */}
          {duration > 0 && timelineMarkers.map(marker => (
            <button
              key={`${marker.type}-${marker.id}`}
              onClick={() => seek(marker.time)}
              title={marker.label || `${marker.type} @ ${formatTime(marker.time)}`}
              style={{
                position: 'absolute',
                left: `${(marker.time / duration) * 100}%`,
                top: -4,
                transform: 'translateX(-50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid #111827',
                cursor: 'pointer',
                backgroundColor: marker.type === 'comment' ? '#22c55e' :
                               marker.type === 'screenshot' ? '#f97316' : '#a855f7',
              }}
            />
          ))}
        </div>

        {/* Marker legend */}
        {timelineMarkers.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 11, color: '#9ca3af' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
              Komentář
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316' }} />
              Screenshot
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#a855f7' }} />
              Hlasový komentář
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => seek(currentTime - 5)} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <SkipBack size={20} />
            </button>
            <button onClick={togglePlay} style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              backgroundColor: '#2563eb', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
            </button>
            <button onClick={() => seek(currentTime + 5)} style={{ padding: 8, backgroundColor: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <SkipForward size={20} />
            </button>
            <span style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'monospace', minWidth: 90 }}>
              {formatTime(currentTime, true)} / {formatTime(duration)}
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
              style={{ backgroundColor: '#1f2937', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}
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

      {/* Screenshots Section */}
      {screenshots.length > 0 && (
        <div style={{ backgroundColor: '#111827', padding: 12, borderTop: '1px solid #1f2937', maxWidth: 900, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={16} style={{ color: '#f97316' }} />
            Screenshoty ({screenshots.length})
          </h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {screenshots.map(s => (
              <div key={s.id} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={s.dataUrl}
                  alt={`Screenshot ${formatTime(s.time)}`}
                  onClick={() => seek(s.time)}
                  style={{ height: 80, borderRadius: 8, cursor: 'pointer' }}
                />
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  display: 'flex', gap: 4,
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); shareScreenshot(s); }}
                    style={{
                      width: 24, height: 24,
                      borderRadius: '50%', border: 'none', backgroundColor: 'rgba(37, 99, 235, 0.9)',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Sdílet"
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteScreenshot(s.id); }}
                    style={{
                      width: 24, height: 24,
                      borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Smazat"
                  >
                    <X size={12} />
                  </button>
                </div>
                <span style={{
                  position: 'absolute', bottom: 4, left: 4,
                  fontSize: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: 4,
                  fontWeight: 500,
                }}>{formatTime(s.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Comments Section */}
      {audioComments.length > 0 && (
        <div style={{ backgroundColor: '#111827', padding: 12, borderTop: '1px solid #1f2937', maxWidth: 900, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mic size={16} style={{ color: '#a855f7' }} />
            Hlasové komentáře ({audioComments.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audioComments.map(a => (
              <div key={a.id} style={{
                backgroundColor: '#1f2937', padding: 12, borderRadius: 8,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <button
                  onClick={() => seek(a.time)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    backgroundColor: '#a855f7', border: 'none', color: 'white',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlayCircle size={20} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#a855f7', marginBottom: 4, fontWeight: 500 }}>
                    {formatTime(a.time)} • {a.duration}s
                  </div>
                  {a.transcript ? (
                    <div style={{
                      backgroundColor: '#374151',
                      padding: '8px 12px',
                      borderRadius: 6,
                      marginBottom: 8,
                      borderLeft: '3px solid #a855f7',
                    }}>
                      <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>"{a.transcript}"</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginBottom: 8 }}>
                      (bez přepisu)
                    </p>
                  )}
                  {a.blobUrl && (
                    <audio src={a.blobUrl} controls style={{ width: '100%', height: 36 }} />
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAudio(a.id)}
                  style={{
                    padding: 6, backgroundColor: 'transparent', border: 'none',
                    color: '#6b7280', cursor: 'pointer',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Comments Section */}
      <div style={{ backgroundColor: '#111827', padding: 12, borderTop: '1px solid #1f2937', maxWidth: 900, margin: '0 auto' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} style={{ color: '#22c55e' }} />
          Komentáře ({comments.length})
        </h3>

        {/* Add comment */}
        <div style={{ marginBottom: 12 }}>
          {selectedPlayers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {selectedPlayers.map(p => (
                <span key={p.id} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 12,
                  backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {p.number ? `#${p.number} ` : ''}{p.name}
                  <button onClick={() => setSelectedPlayers(prev => prev.filter(x => x.id !== p.id))}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}>
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
              style={{
                width: '100%', backgroundColor: '#1f2937', border: 'none',
                borderRadius: 6, padding: '8px 10px', color: 'white', fontSize: 13,
              }}
            />
            {showPlayerDropdown && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                backgroundColor: '#1f2937', borderRadius: 6, marginBottom: 4,
                maxHeight: 150, overflow: 'auto', boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
              }}>
                {searchPlayers(playerSearch).filter(p => !selectedPlayers.find(sp => sp.id === p.id)).slice(0, 6).map(p => (
                  <button key={p.id} onClick={() => addPlayerTag(p)} style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'transparent',
                    border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: 13,
                  }}>
                    {p.number ? `#${p.number} ` : ''}{p.name}
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
              style={{
                flex: 1, backgroundColor: '#1f2937', border: 'none',
                borderRadius: 6, padding: '10px 12px', color: 'white', fontSize: 14,
              }}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              onFocus={() => setShowPlayerDropdown(false)}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              style={{
                padding: '10px 16px',
                backgroundColor: newComment.trim() ? '#22c55e' : '#374151',
                border: 'none', borderRadius: 6, color: 'white',
                cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 16, fontSize: 13 }}>
            Zatím žádné komentáře
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comments.sort((a, b) => a.time - b.time).map(c => (
              <div
                key={c.id}
                onClick={() => seek(c.time)}
                style={{
                  backgroundColor: '#1f2937', borderRadius: 8, padding: 10, cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>{formatTime(c.time)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteComment(c.id); }}
                    style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <p style={{ fontSize: 13, margin: 0 }}>{c.text}</p>
                {c.playerIds?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {getPlayersByIds(c.playerIds).map(p => (
                      <span key={p.id} style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 10,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa',
                      }}>
                        {p.number ? `#${p.number} ` : ''}{p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 80 }} />

      {/* Player Marker Modal */}
      {showPlayerSelect && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 320, maxHeight: '60vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Vyber hráče</h3>
            {getPlayers().filter(p => p.active).map(player => (
              <button
                key={player.id}
                onClick={() => addPlayerMarker(player)}
                style={{
                  width: '100%', padding: 12, backgroundColor: '#374151',
                  border: 'none', borderRadius: 8, color: 'white', textAlign: 'left',
                  cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {player.number || '?'}
                </span>
                <span>{player.name}</span>
              </button>
            ))}
            <button
              onClick={() => { setShowPlayerSelect(false); setMarkerPosition(null); }}
              style={{
                width: '100%', padding: 12, backgroundColor: '#374151',
                border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', marginTop: 8,
              }}
            >
              Zrušit
            </button>
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
  const { type, points, color, strokeWidth, playerName } = annotation;

  // Apply shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth * 1.5; // Make strokes thicker
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
      const arrowHeadSize = Math.max(30, strokeWidth * 4); // Bigger arrow heads
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - arrowHeadSize * Math.cos(angle - Math.PI / 6), end.y - arrowHeadSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - arrowHeadSize * Math.cos(angle + Math.PI / 6), end.y - arrowHeadSize * Math.sin(angle + Math.PI / 6));
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
      ctx.beginPath();
      ctx.arc(pm.x, pm.y, 35, 0, Math.PI * 2); // Bigger marker
      ctx.fillStyle = color;
      ctx.fill();
      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (playerName) {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerName.substring(0, 3).toUpperCase(), pm.x, pm.y);
      }
      break;
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}
