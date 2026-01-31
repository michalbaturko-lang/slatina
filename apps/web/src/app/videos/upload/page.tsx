'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Video,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import {
  addVideo,
  saveVideoBlob,
  simulateAIAnalysis,
} from '@/lib/demo-store';
import { getTeam, COACHES } from '@/lib/team-store';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error';

// Dnešní datum ve formátu YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Form fields - s defaultním dnešním datem
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState(getTodayDate());
  const [videoType, setVideoType] = useState<'match' | 'training'>('match');
  const [enableAI, setEnableAI] = useState(true);

  // Team info
  const team = typeof window !== 'undefined' ? getTeam() : null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        setError(null);
        getVideoDuration(file);

        // Auto-fill title from filename
        if (!title) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
          setTitle(nameWithoutExt);
        }
      } else {
        setError('Prosím vyberte video soubor');
      }
    }
  }, [title]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setError(null);
      getVideoDuration(file);

      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  }, [title]);

  const getVideoDuration = (file: File) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      setError('Prosím vyplňte název a vyberte video');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      // Simulate upload progress
      const totalSize = selectedFile.size;
      let uploaded = 0;
      const chunkSize = totalSize / 10;

      const uploadSimulation = async () => {
        while (uploaded < totalSize) {
          await new Promise(r => setTimeout(r, 200));
          uploaded = Math.min(uploaded + chunkSize, totalSize);
          setProgress({
            loaded: uploaded,
            total: totalSize,
            percentage: Math.round((uploaded / totalSize) * 100),
          });
        }
      };

      await uploadSimulation();

      setStatus('processing');

      // Create video record
      const newVideo = addVideo({
        title,
        opponent: opponent || undefined,
        date: matchDate,
        duration: videoDuration,
        sport: 'football', // vždy fotbal pro SK Slatina
        status: 'processing',
        uploadProgress: 100,
      });

      // Save video blob to IndexedDB
      await saveVideoBlob(newVideo.id, selectedFile);

      if (enableAI) {
        setStatus('analyzing');
        // Simulate AI analysis
        await simulateAIAnalysis(newVideo.id, videoDuration, (aiProgress) => {
          setProgress(prev => ({ ...prev, percentage: aiProgress }));
        });
      }

      setStatus('complete');
      setTimeout(() => {
        router.push(`/videos/${newVideo.id}`);
      }, 1500);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/videos" className="p-2 hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Nahrát video</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Team info */}
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: team?.jerseyColor || '#22c55e' }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-300">{team?.name || 'SK Slatina 2007'}</p>
            <p className="text-sm text-green-400/70">
              Trenéři: {COACHES.map(c => c.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Demo notice */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-400">
            Video se ukládá lokálně ve vašem prohlížeči. AI analýza detekuje situace jako
            chumel hráčů, chybějící nabídky, ztráta soupeře a další.
          </p>
        </div>

        {/* Upload area */}
        <div
          className={`
            border-2 border-dashed rounded-xl p-12 text-center mb-8 transition
            ${selectedFile
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 hover:border-gray-600'
            }
            ${status !== 'idle' ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => status === 'idle' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              <Video className="w-12 h-12 text-blue-400" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">
                  {formatFileSize(selectedFile.size)}
                  {videoDuration > 0 && ` • ${Math.floor(videoDuration / 60)}:${Math.floor(videoDuration % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
              {status === 'idle' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setVideoDuration(0);
                  }}
                  className="p-2 hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg mb-2">Přetáhněte video sem</p>
              <p className="text-sm text-gray-400">nebo klikněte pro výběr souboru</p>
              <p className="text-xs text-gray-500 mt-4">
                Podporované formáty: MP4, MOV, AVI, MKV, WebM
              </p>
            </>
          )}
        </div>

        {/* Progress */}
        {status !== 'idle' && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              {status === 'uploading' && (
                <>
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span>Ukládání... {progress.percentage}%</span>
                </>
              )}
              {status === 'processing' && (
                <>
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                  <span>Zpracování videa...</span>
                </>
              )}
              {status === 'analyzing' && (
                <>
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <span>AI analýza... {progress.percentage}%</span>
                </>
              )}
              {status === 'complete' && (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span>Hotovo! Přesměrování...</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </>
              )}
            </div>

            {(status === 'uploading' || status === 'analyzing') && (
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    status === 'analyzing' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Název videa <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Zápas vs. Sparta Praha U9"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              disabled={status !== 'idle'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Soupeř</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="např. Sparta Praha"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                disabled={status !== 'idle'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Datum zápasu</label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                disabled={status !== 'idle'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Typ záznamu</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setVideoType('match')}
                className={`flex-1 py-3 rounded-lg border transition ${
                  videoType === 'match'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
                disabled={status !== 'idle'}
              >
                Zápas
              </button>
              <button
                type="button"
                onClick={() => setVideoType('training')}
                className={`flex-1 py-3 rounded-lg border transition ${
                  videoType === 'training'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
                disabled={status !== 'idle'}
              >
                Trénink
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableAI"
              checked={enableAI}
              onChange={(e) => setEnableAI(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
              disabled={status !== 'idle'}
            />
            <label htmlFor="enableAI" className="text-sm">
              Povolit AI analýzu (automatická detekce situací)
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/videos"
              className="px-6 py-3 text-gray-400 hover:text-white transition"
            >
              Zrušit
            </Link>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !title || status !== 'idle'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Nahrát video
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
