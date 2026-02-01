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
  Scissors,
  Flag,
  Crop,
} from 'lucide-react';
import {
  getVideo,
  updateVideo,
  getScreenshots,
  createScreenshot,
  getAudioComments,
  createAudioComment,
  getComments,
  createComment,
  deleteComment as deleteCommentCloud,
  createPlayerClip,
  Video,
  Screenshot,
  AudioComment,
  Comment,
} from '@/lib/cloud-store';
import { getPlayers, Player, addPlayerClip as addPlayerClipLocal } from '@/lib/team-store';
import { uploadFile, uploadDataUrl } from '@/lib/upload';

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

// Colors: white, black, yellow, blue
const COLORS = ['#ffffff', '#000000', '#eab308', '#3b82f6'];

// Helper to convert spoken punctuation to symbols
function convertSpokenPunctuation(text: string): string {
  return text
    .replace(/\btečka\b/gi, '.')
    .replace(/\bvykřičník\b/gi, '!')
    .replace(/\botazník\b/gi, '?')
    .replace(/\bčárka\b/gi, ',')
    .replace(/\bdvojte?čka\b/gi, ':')
    .replace(/\bstředník\b/gi, ';')
    .replace(/\bpomlčka\b/gi, '-')
    .replace(/\bnový řádek\b/gi, '\n')
    .replace(/\bnový odstavec\b/gi, '\n\n');
}
const STROKE_WIDTHS = [4, 6, 8, 12];

export default function VideoDetailPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<Video | null>(null);
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
  const [selectedColor, setSelectedColor] = useState('#ffffff');
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);

  // Rename video
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Thumbnail selection
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);

  // Ratings (red=problem, orange=interesting, green=praise)
  type RatingType = 'problem' | 'interesting' | 'praise';
  interface Rating {
    id: string;
    time: number;
    type: RatingType;
    playerId?: string;
    playerName?: string;
    note?: string;
  }
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRating, setPendingRating] = useState<{ type: RatingType } | null>(null);

  // Share from moment
  const [shareTime, setShareTime] = useState<number | null>(null);

  // Clip creation
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [showClipModal, setShowClipModal] = useState(false);
  const [clipTitle, setClipTitle] = useState('');
  const [clipCategory, setClipCategory] = useState<'goal' | 'assist' | 'skill' | 'defense' | 'other'>('other');
  const [clipPlayer, setClipPlayer] = useState<Player | null>(null);

  // Crop screenshot
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageData, setCropImageData] = useState<string | null>(null);
  const [cropSelection, setCropSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropSelecting, setIsCropSelecting] = useState(false);
  const [cropStartPoint, setCropStartPoint] = useState<{ x: number; y: number } | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [savedCropUrl, setSavedCropUrl] = useState<string | null>(null);
  const [showCropThumbnailChoice, setShowCropThumbnailChoice] = useState(false);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);

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
        const videoData = await getVideo(params.id);
        if (!videoData) {
          setError('Video nebylo nalezeno');
          setLoading(false);
          return;
        }
        setVideo(videoData);

        // Load related data
        const [screenshotsData, audioData, commentsData] = await Promise.all([
          getScreenshots(params.id),
          getAudioComments(params.id),
          getComments(params.id),
        ]);

        // Get players from team-store (localStorage with defaults)
        const playersData = getPlayers();

        setScreenshots(screenshotsData);
        setAudioComments(audioData);
        setComments(commentsData);
        setAllPlayers(playersData.filter(p => p.active));
        setLoading(false);
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Chyba při načítání videa');
        setLoading(false);
      }
    };
    loadVideoData();
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
            // Convert spoken punctuation to symbols
            const processed = convertSpokenPunctuation(fullTranscript.trim());
            transcriptRef.current = processed;
            setTranscription(processed);
          };
          recognition.onerror = (e: any) => console.log('Speech recognition error:', e.error);
          recognition.start();
          recognitionRef.current = recognition;
        }

        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const finalTranscript = transcriptRef.current;
          const recordingDuration = Math.round((Date.now() - recordStartTime) / 1000);

          if (video) {
            try {
              // Upload audio to R2
              const { publicUrl } = await uploadFile(audioBlob, 'audio', `audio-${Date.now()}.webm`);

              // Save to Supabase
              const newAudio = await createAudioComment({
                video_id: video.id,
                time: startTime,
                duration: recordingDuration,
                audio_url: publicUrl,
                transcript: finalTranscript || null,
              });

              setAudioComments(prev => [...prev, newAudio]);
            } catch (err) {
              console.error('Failed to save audio:', err);
              alert('Nepodařilo se uložit hlasový komentář');
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
  const captureScreenshot = useCallback(async () => {
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

      // Upload to R2
      const { publicUrl } = await uploadDataUrl(dataUrl, 'screenshots', `screenshot-${Date.now()}.jpg`);

      // Save to Supabase
      const newScreenshot = await createScreenshot({
        video_id: video.id,
        time: currentTime,
        image_url: publicUrl,
        annotations_json: null,
      });

      setScreenshots(prev => [...prev, newScreenshot]);

      // Set as thumbnail if none exists
      if (!video.thumbnail_url) {
        await updateVideo(video.id, { thumbnail_url: publicUrl });
        setVideo(prev => prev ? { ...prev, thumbnail_url: publicUrl } : null);
      }

      alert('Screenshot uložen!');
    } catch (err) {
      console.error('Screenshot failed:', err);
      alert('Nepodařilo se vytvořit screenshot');
    }
  }, [video, currentTime]);

  // Open crop mode - capture current frame for cropping
  const openCropMode = useCallback(() => {
    const videoEl = videoRef.current;
    const annotationCanvas = canvasRef.current;
    if (!videoEl) return;

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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCropImageData(dataUrl);
    setCropSelection(null);
    setShowCropModal(true);
  }, []);

  // Handle crop selection
  const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCropStartPoint({ x, y });
    setIsCropSelecting(true);
    setCropSelection(null);
  }, []);

  const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropSelecting || !cropStartPoint) return;
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Calculate width based on mouse position
    let selWidth = Math.abs(x - cropStartPoint.x);
    // Enforce 16:9 aspect ratio - height is calculated from width
    // Since we use relative coordinates, we need to account for canvas aspect ratio
    const canvasAspect = rect.width / rect.height;
    let selHeight = (selWidth * canvasAspect) / (16 / 9);

    // Ensure selection stays within bounds
    if (selHeight > 1) {
      selHeight = 1;
      selWidth = selHeight * (16 / 9) / canvasAspect;
    }
    if (selWidth > 1) {
      selWidth = 1;
      selHeight = (selWidth * canvasAspect) / (16 / 9);
    }

    // Calculate top-left position
    const selX = x >= cropStartPoint.x ? cropStartPoint.x : cropStartPoint.x - selWidth;
    const selY = y >= cropStartPoint.y ? cropStartPoint.y : cropStartPoint.y - selHeight;

    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(selX, 1 - selWidth));
    const clampedY = Math.max(0, Math.min(selY, 1 - selHeight));

    setCropSelection({ x: clampedX, y: clampedY, width: selWidth, height: selHeight });
  }, [isCropSelecting, cropStartPoint]);

  const handleCropMouseUp = useCallback(() => {
    setIsCropSelecting(false);
  }, []);

  // Touch support for mobile
  const handleCropTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    setCropStartPoint({ x, y });
    setIsCropSelecting(true);
    setCropSelection(null);
  }, []);

  const handleCropTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isCropSelecting || !cropStartPoint) return;
    const touch = e.touches[0];
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;

    // Calculate width based on touch position
    let selWidth = Math.abs(x - cropStartPoint.x);
    // Enforce 16:9 aspect ratio
    const canvasAspect = rect.width / rect.height;
    let selHeight = (selWidth * canvasAspect) / (16 / 9);

    // Ensure selection stays within bounds
    if (selHeight > 1) {
      selHeight = 1;
      selWidth = selHeight * (16 / 9) / canvasAspect;
    }
    if (selWidth > 1) {
      selWidth = 1;
      selHeight = (selWidth * canvasAspect) / (16 / 9);
    }

    // Calculate top-left position
    const selX = x >= cropStartPoint.x ? cropStartPoint.x : cropStartPoint.x - selWidth;
    const selY = y >= cropStartPoint.y ? cropStartPoint.y : cropStartPoint.y - selHeight;

    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(selX, 1 - selWidth));
    const clampedY = Math.max(0, Math.min(selY, 1 - selHeight));

    setCropSelection({ x: clampedX, y: clampedY, width: selWidth, height: selHeight });
  }, [isCropSelecting, cropStartPoint]);

  const handleCropTouchEnd = useCallback(() => {
    setIsCropSelecting(false);
  }, []);

  // Save cropped screenshot
  const saveCroppedScreenshot = useCallback(async () => {
    if (!cropImageData || !cropSelection || !video) return;

    try {
      // Load the full image
      const img = new Image();
      img.src = cropImageData;
      await new Promise((resolve) => { img.onload = resolve; });

      // Calculate crop area in pixels
      const cropX = Math.floor(cropSelection.x * img.width);
      const cropY = Math.floor(cropSelection.y * img.height);
      const cropWidth = Math.floor(cropSelection.width * img.width);
      const cropHeight = Math.floor(cropSelection.height * img.height);

      // Create cropped canvas
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Upload to R2
      const { publicUrl } = await uploadDataUrl(croppedDataUrl, 'screenshots', `screenshot-crop-${Date.now()}.jpg`);

      // Save to Supabase
      const newScreenshot = await createScreenshot({
        video_id: video.id,
        time: currentTime,
        image_url: publicUrl,
        annotations_json: null,
      });

      setScreenshots(prev => [...prev, newScreenshot]);
      setShowCropModal(false);
      setCropImageData(null);
      setCropSelection(null);
      // Show choice modal - save URL for potential thumbnail use
      setSavedCropUrl(publicUrl);
      setShowCropThumbnailChoice(true);
    } catch (err) {
      console.error('Crop screenshot failed:', err);
      alert('Nepodařilo se uložit výřez');
    }
  }, [cropImageData, cropSelection, video, currentTime]);

  // Set cropped screenshot as video thumbnail
  const setCropAsThumbnail = useCallback(async () => {
    if (!video || !savedCropUrl) return;
    try {
      await updateVideo(video.id, { thumbnail_url: savedCropUrl });
      setVideo(prev => prev ? { ...prev, thumbnail_url: savedCropUrl } : null);
      setShowCropThumbnailChoice(false);
      setSavedCropUrl(null);
      alert('Náhled videa nastaven!');
    } catch (err) {
      console.error('Failed to set thumbnail:', err);
      alert('Nepodařilo se nastavit náhled');
    }
  }, [video, savedCropUrl]);

  const handleDeleteScreenshot = useCallback((id: string) => {
    // Note: Delete from cloud not yet implemented
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  // Share screenshot using native Share API
  const shareScreenshot = useCallback(async (screenshot: Screenshot) => {
    try {
      // Open image in new tab or download
      const link = document.createElement('a');
      link.href = screenshot.image_url;
      link.download = `screenshot-${formatTime(screenshot.time)}.jpg`;
      link.target = '_blank';
      link.click();
    } catch (err) {
      console.error('Share failed:', err);
    }
  }, []);

  const handleDeleteAudio = useCallback((id: string) => {
    // Note: Delete from cloud not yet implemented
    setAudioComments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Comments
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !video) return;
    try {
      const comment = await createComment({
        video_id: video.id,
        time: currentTime,
        text: newComment.trim(),
      });
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setSelectedPlayers([]);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }, [newComment, video, currentTime]);

  const handleDeleteComment = useCallback(async (id: string) => {
    try {
      await deleteCommentCloud(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }, []);

  const addPlayerTag = useCallback((player: Player) => {
    if (!selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => [...prev, player]);
    }
    setPlayerSearch('');
    setShowPlayerDropdown(false);
  }, [selectedPlayers]);

  // Rename video
  const handleRenameVideo = useCallback(async () => {
    if (!video || !newVideoTitle.trim()) return;
    try {
      await updateVideo(video.id, { title: newVideoTitle.trim() });
      setVideo(prev => prev ? { ...prev, title: newVideoTitle.trim() } : null);
      setShowRenameModal(false);
    } catch (err) {
      console.error('Failed to rename video:', err);
      alert('Nepodařilo se přejmenovat video');
    }
  }, [video, newVideoTitle]);

  // Set thumbnail from screenshot
  const handleSetThumbnail = useCallback(async (screenshot: Screenshot) => {
    if (!video) return;
    try {
      await updateVideo(video.id, { thumbnail_url: screenshot.image_url });
      setVideo(prev => prev ? { ...prev, thumbnail_url: screenshot.image_url } : null);
      setShowThumbnailModal(false);
      alert('Náhled nastaven!');
    } catch (err) {
      console.error('Failed to set thumbnail:', err);
      alert('Nepodařilo se nastavit náhled');
    }
  }, [video]);

  // Add rating
  const handleAddRating = useCallback((type: RatingType, player?: Player) => {
    const newRating: Rating = {
      id: `rating-${Date.now()}`,
      time: currentTime,
      type,
      playerId: player?.id,
      playerName: player?.name,
    };
    setRatings(prev => [...prev, newRating]);
    setShowRatingModal(false);
    setPendingRating(null);
  }, [currentTime]);

  // Share from specific moment
  const shareFromMoment = useCallback(async () => {
    if (!video) return;
    const time = shareTime ?? currentTime;
    const url = `${window.location.origin}/videos/${video.id}?t=${Math.floor(time)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: `${video.title} - ${formatTime(time)}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Odkaz zkopírován!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          alert('Odkaz zkopírován!');
        } catch {
          console.error('Could not share:', err);
        }
      }
    }
    setShareTime(null);
  }, [video, shareTime, currentTime]);

  // Clip creation
  const handleMarkClipStart = useCallback(() => {
    setClipStart(currentTime);
    if (clipEnd !== null && clipEnd < currentTime) {
      setClipEnd(null);
    }
  }, [currentTime, clipEnd]);

  const handleMarkClipEnd = useCallback(() => {
    if (clipStart !== null && currentTime > clipStart) {
      setClipEnd(currentTime);
      setShowClipModal(true);
    } else {
      alert('Konec klipu musí být po začátku');
    }
  }, [currentTime, clipStart]);

  const handleSaveClip = useCallback(async () => {
    if (!video || clipStart === null || clipEnd === null || !clipPlayer) {
      alert('Vyplňte všechny údaje');
      return;
    }
    try {
      // Save to local team-store
      addPlayerClipLocal({
        playerId: clipPlayer.id,
        videoId: video.id,
        startTime: clipStart,
        endTime: clipEnd,
        title: clipTitle || `Klip ${formatTime(clipStart)}-${formatTime(clipEnd)}`,
        category: clipCategory,
      });
      alert('Klip uložen!');
      setShowClipModal(false);
      setClipStart(null);
      setClipEnd(null);
      setClipTitle('');
      setClipPlayer(null);
    } catch (err) {
      console.error('Failed to save clip:', err);
      alert('Nepodařilo se uložit klip');
    }
  }, [video, clipStart, clipEnd, clipTitle, clipCategory, clipPlayer]);

  const handleCancelClip = useCallback(() => {
    setClipStart(null);
    setClipEnd(null);
    setShowClipModal(false);
    setClipTitle('');
    setClipPlayer(null);
  }, []);

  // Filter players based on search
  const filteredPlayers = allPlayers.filter(p =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    (p.number && p.number.toString().includes(playerSearch))
  );

  // Share video summary with all annotations
  const shareVideoSummary = useCallback(async () => {
    if (!video) return;

    // Build summary text
    let summary = `📹 ${video.title}\n`;
    summary += `📅 ${new Date(video.created_at).toLocaleDateString('cs-CZ')}\n\n`;

    // Add comments
    if (comments.length > 0) {
      summary += '💬 KOMENTÁŘE:\n';
      comments.sort((a, b) => a.time - b.time).forEach(c => {
        summary += `  [${formatTime(c.time)}] ${c.text}\n`;
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
    ...ratings.map(r => ({ id: r.id, time: r.time, type: r.type as any, label: r.playerName })),
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
            <button
              onClick={() => { setNewVideoTitle(video.title); setShowRenameModal(true); }}
              style={{
                fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              }}
            >
              {video.title}
              <Pencil size={12} style={{ color: '#6b7280', flexShrink: 0 }} />
            </button>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>
              {new Date(video.created_at).toLocaleDateString('cs-CZ')}
            </p>
          </div>
          <button
            onClick={() => setShowThumbnailModal(true)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
            title="Nastavit náhled"
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={shareFromMoment}
            style={{
              padding: '8px 12px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
            title="Sdílet od tohoto momentu"
          >
            <Share2 size={16} />
            {formatTime(currentTime)}
          </button>
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
            Shrnutí
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
          {video.file_url ? (
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              src={video.file_url}
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onSeeked={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              playsInline
              crossOrigin="anonymous"
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

            <button
              onClick={openCropMode}
              style={{
                padding: '8px 14px',
                backgroundColor: '#1f2937',
                border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
              title="Screenshot s výřezem"
            >
              <Crop size={16} />
              Výřez
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

          {/* Divider on PC */}
          {!isMobile && <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />}

          {/* Rating buttons */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 4 }}>Hodnocení:</span>
            <button
              onClick={() => { setPendingRating({ type: 'problem' }); setShowRatingModal(true); }}
              title="Problém - co zlepšit"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                backgroundColor: '#dc2626', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}
            >
              ⚠️
            </button>
            <button
              onClick={() => { setPendingRating({ type: 'interesting' }); setShowRatingModal(true); }}
              title="Zajímavé - k diskuzi"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                backgroundColor: '#f97316', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}
            >
              💡
            </button>
            <button
              onClick={() => { setPendingRating({ type: 'praise' }); setShowRatingModal(true); }}
              title="Pochvala - skvělé!"
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                backgroundColor: '#22c55e', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}
            >
              ⭐
            </button>
          </div>

          {/* Divider on PC */}
          {!isMobile && <div style={{ width: 1, height: 32, backgroundColor: '#374151' }} />}

          {/* Clip creation */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 4 }}>Klip:</span>
            {clipStart === null ? (
              <button
                onClick={handleMarkClipStart}
                title="Označit začátek klipu"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1f2937',
                  border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                }}
              >
                <Flag size={14} />
                Start
              </button>
            ) : (
              <>
                <div style={{
                  padding: '6px 12px', backgroundColor: '#065f46',
                  borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Flag size={14} />
                  {formatTime(clipStart)}
                </div>
                <button
                  onClick={handleMarkClipEnd}
                  title="Označit konec klipu"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#2563eb',
                    border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                  }}
                >
                  <Scissors size={14} />
                  Konec
                </button>
                <button
                  onClick={handleCancelClip}
                  title="Zrušit klip"
                  style={{
                    padding: 6,
                    backgroundColor: 'transparent',
                    border: 'none', borderRadius: 6, color: '#9ca3af', cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </>
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
                backgroundColor:
                  marker.type === 'comment' ? '#22c55e' :
                  marker.type === 'screenshot' ? '#f97316' :
                  marker.type === 'audio' ? '#a855f7' :
                  marker.type === 'problem' ? '#dc2626' :
                  marker.type === 'interesting' ? '#f97316' :
                  marker.type === 'praise' ? '#22c55e' : '#6b7280',
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
                  src={s.image_url}
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
                    {formatTime(a.time)} {a.duration && `• ${a.duration}s`}
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
                  {a.audio_url && (
                    <audio src={a.audio_url} controls style={{ width: '100%', height: 36 }} />
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

      {/* Ratings Section */}
      {ratings.length > 0 && (
        <div style={{ backgroundColor: '#111827', padding: 12, borderTop: '1px solid #1f2937', maxWidth: 900, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            Hodnocení ({ratings.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ratings.sort((a, b) => a.time - b.time).map(r => (
              <button
                key={r.id}
                onClick={() => seek(r.time)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  backgroundColor: '#1f2937', border: 'none', borderRadius: 8,
                  color: 'white', cursor: 'pointer',
                  borderLeft: `4px solid ${r.type === 'problem' ? '#dc2626' : r.type === 'interesting' ? '#f97316' : '#22c55e'}`,
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {r.type === 'problem' ? '⚠️' : r.type === 'interesting' ? '💡' : '⭐'}
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(r.time)}</div>
                  {r.playerName && <div style={{ fontSize: 12, fontWeight: 500 }}>{r.playerName}</div>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setRatings(prev => prev.filter(x => x.id !== r.id)); }}
                  style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 2, marginLeft: 4 }}
                >
                  <X size={12} />
                </button>
              </button>
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
            {allPlayers.map(player => (
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

      {/* Rename Video Modal */}
      {showRenameModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Přejmenovat video</h3>
            <input
              type="text"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              placeholder="Název videa"
              style={{
                width: '100%', backgroundColor: '#374151', border: 'none',
                borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: 14, marginBottom: 12,
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRenameVideo()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowRenameModal(false)}
                style={{
                  flex: 1, padding: 12, backgroundColor: '#374151',
                  border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
                }}
              >
                Zrušit
              </button>
              <button
                onClick={handleRenameVideo}
                disabled={!newVideoTitle.trim()}
                style={{
                  flex: 1, padding: 12, backgroundColor: '#2563eb',
                  border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                  opacity: newVideoTitle.trim() ? 1 : 0.5,
                }}
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Selection Modal */}
      {showThumbnailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Vybrat náhled videa</h3>
            {screenshots.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>
                Nejprve vytvořte screenshot, který chcete použít jako náhled
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {screenshots.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSetThumbnail(s)}
                    style={{
                      position: 'relative', border: video?.thumbnail_url === s.image_url ? '3px solid #2563eb' : '3px solid transparent',
                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0, background: 'none',
                    }}
                  >
                    <img src={s.image_url} alt={`Screenshot ${formatTime(s.time)}`} style={{ width: '100%', display: 'block' }} />
                    <span style={{
                      position: 'absolute', bottom: 4, left: 4,
                      fontSize: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: 4,
                      color: 'white', fontWeight: 500,
                    }}>{formatTime(s.time)}</span>
                    {video?.thumbnail_url === s.image_url && (
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        fontSize: 10, backgroundColor: '#2563eb', padding: '2px 6px', borderRadius: 4,
                        color: 'white', fontWeight: 500,
                      }}>Aktuální</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowThumbnailModal(false)}
              style={{
                width: '100%', padding: 12, backgroundColor: '#374151',
                border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', marginTop: 12,
              }}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      {/* Rating Modal - Select Player */}
      {showRatingModal && pendingRating && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 320, maxHeight: '60vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {pendingRating.type === 'problem' && '⚠️ Problém'}
              {pendingRating.type === 'interesting' && '💡 Zajímavé'}
              {pendingRating.type === 'praise' && '⭐ Pochvala'}
            </h3>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              Čas: {formatTime(currentTime)} - Vyber hráče (volitelné)
            </p>
            <button
              onClick={() => handleAddRating(pendingRating.type)}
              style={{
                width: '100%', padding: 12, backgroundColor: '#374151',
                border: 'none', borderRadius: 8, color: 'white', textAlign: 'left',
                cursor: 'pointer', marginBottom: 8, fontWeight: 500,
              }}
            >
              Bez hráče (obecné)
            </button>
            {allPlayers.map(player => (
              <button
                key={player.id}
                onClick={() => handleAddRating(pendingRating.type, player)}
                style={{
                  width: '100%', padding: 12, backgroundColor: '#374151',
                  border: 'none', borderRadius: 8, color: 'white', textAlign: 'left',
                  cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: pendingRating.type === 'problem' ? '#dc2626' : pendingRating.type === 'interesting' ? '#f97316' : '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {player.number || '?'}
                </span>
                <span>{player.name}</span>
              </button>
            ))}
            <button
              onClick={() => { setShowRatingModal(false); setPendingRating(null); }}
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

      {/* Clip Creation Modal */}
      {showClipModal && clipStart !== null && clipEnd !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, width: '90%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              ✂️ Uložit klip
            </h3>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              {formatTime(clipStart)} → {formatTime(clipEnd)} ({Math.round(clipEnd - clipStart)}s)
            </p>

            {/* Clip title */}
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Název klipu</label>
            <input
              type="text"
              value={clipTitle}
              onChange={(e) => setClipTitle(e.target.value)}
              placeholder="např. Gól z rohu"
              style={{
                width: '100%', backgroundColor: '#374151', border: 'none',
                borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 14, marginBottom: 12,
              }}
            />

            {/* Category */}
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Kategorie</label>
            <select
              value={clipCategory}
              onChange={(e) => setClipCategory(e.target.value as any)}
              style={{
                width: '100%', backgroundColor: '#374151', border: 'none',
                borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 14, marginBottom: 12,
              }}
            >
              <option value="goal">⚽ Gól</option>
              <option value="assist">🎯 Asistence</option>
              <option value="skill">✨ Akce</option>
              <option value="defense">🛡️ Obrana</option>
              <option value="other">📹 Ostatní</option>
            </select>

            {/* Player selection */}
            <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Hráč *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {allPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => setClipPlayer(player)}
                  style={{
                    padding: 10, backgroundColor: clipPlayer?.id === player.id ? '#2563eb' : '#374151',
                    border: 'none', borderRadius: 8, color: 'white', textAlign: 'left',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: clipPlayer?.id === player.id ? '#ffffff' : '#2563eb',
                    color: clipPlayer?.id === player.id ? '#2563eb' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11,
                  }}>
                    {player.number || '?'}
                  </span>
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCancelClip}
                style={{
                  flex: 1, padding: 12, backgroundColor: '#374151',
                  border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
                }}
              >
                Zrušit
              </button>
              <button
                onClick={handleSaveClip}
                disabled={!clipPlayer}
                style={{
                  flex: 1, padding: 12, backgroundColor: clipPlayer ? '#22c55e' : '#374151',
                  border: 'none', borderRadius: 8, color: 'white', cursor: clipPlayer ? 'pointer' : 'not-allowed',
                  opacity: clipPlayer ? 1 : 0.5,
                }}
              >
                Uložit klip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Screenshot Modal */}
      {showCropModal && cropImageData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          {/* Header */}
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #374151' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
              📐 Vyberte oblast výřezu
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowCropModal(false); setCropImageData(null); setCropSelection(null); }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#374151',
                  border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
                }}
              >
                Zrušit
              </button>
              <button
                onClick={saveCroppedScreenshot}
                disabled={!cropSelection || cropSelection.width < 0.05 || cropSelection.height < 0.05}
                style={{
                  padding: '8px 16px',
                  backgroundColor: cropSelection && cropSelection.width >= 0.05 ? '#22c55e' : '#374151',
                  border: 'none', borderRadius: 8, color: 'white', cursor: cropSelection ? 'pointer' : 'not-allowed',
                  opacity: cropSelection && cropSelection.width >= 0.05 ? 1 : 0.5,
                }}
              >
                Uložit výřez
              </button>
            </div>
          </div>

          {/* Canvas area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
              <img
                src={cropImageData}
                alt="Frame"
                style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)', objectFit: 'contain', display: 'block' }}
                draggable={false}
              />
              <canvas
                ref={cropCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
                onTouchStart={handleCropTouchStart}
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
              />
              {/* Selection overlay */}
              {cropSelection && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${cropSelection.y * 100}%`,
                    left: `${cropSelection.x * 100}%`,
                    width: `${cropSelection.width * 100}%`,
                    height: `${cropSelection.height * 100}%`,
                    border: '3px solid #22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {/* Size indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: -28,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                  }}>
                    16:9 • {Math.round(cropSelection.width * 100)}% × {Math.round(cropSelection.height * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid #374151' }}>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>
              📱 Táhněte prstem nebo myší pro výběr. Poměr stran 16:9 pro náhled videa.
            </p>
          </div>
        </div>
      )}

      {/* Crop Thumbnail Choice Modal */}
      {showCropThumbnailChoice && savedCropUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1f2937', borderRadius: 16, padding: 24, width: '90%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <img
                src={savedCropUrl}
                alt="Výřez"
                style={{ width: '100%', borderRadius: 8, marginBottom: 12 }}
              />
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                ✅ Výřez uložen!
              </h3>
              <p style={{ fontSize: 14, color: '#9ca3af' }}>
                Chcete tento výřez nastavit jako náhled videa?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={setCropAsThumbnail}
                style={{
                  width: '100%', padding: 14,
                  backgroundColor: '#22c55e', border: 'none', borderRadius: 10,
                  color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >
                🖼️ Nastavit jako náhled videa
              </button>
              <button
                onClick={() => { setShowCropThumbnailChoice(false); setSavedCropUrl(null); }}
                style={{
                  width: '100%', padding: 14,
                  backgroundColor: '#374151', border: 'none', borderRadius: 10,
                  color: '#9ca3af', fontWeight: 500, fontSize: 15, cursor: 'pointer',
                }}
              >
                Jen uložit do screenshotů
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
