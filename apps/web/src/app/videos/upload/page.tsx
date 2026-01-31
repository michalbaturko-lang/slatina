'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Upload,
  Video,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  FileVideo,
} from 'lucide-react';
import { createVideo } from '@/lib/cloud-store';
import { uploadFile } from '@/lib/upload';
import { getTeam, COACHES, OPPONENT_TEAMS } from '@/lib/team-store';

interface FileQueueItem {
  id: string;
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  duration?: number;
}

// Dnešní datum ve formátu YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [opponent, setOpponent] = useState('');
  const [scoreHome, setScoreHome] = useState<string>('');
  const [scoreAway, setScoreAway] = useState<string>('');
  const [matchDate, setMatchDate] = useState(getTodayDate());
  const [videoType, setVideoType] = useState<'match' | 'training'>('match');

  // Team info
  const team = typeof window !== 'undefined' ? getTeam() : null;

  // Generate title for a video based on opponent and index
  const generateTitle = (index: number, total: number) => {
    if (videoType === 'match' && opponent) {
      const baseTitle = scoreHome !== '' && scoreAway !== ''
        ? `Slatina-${opponent} ${scoreHome}:${scoreAway}`
        : `vs. ${opponent}`;

      if (total === 1) {
        return baseTitle;
      }
      return `${baseTitle} - Video ${index + 1}`;
    }
    return `Video ${index + 1}`;
  };

  // Update titles when opponent or score changes
  useEffect(() => {
    if (fileQueue.length > 0) {
      setFileQueue(prev => prev.map((item, index) => ({
        ...item,
        title: generateTitle(index, prev.length),
      })));
    }
  }, [opponent, scoreHome, scoreAway, videoType]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
    if (files.length > 0) {
      addFilesToQueue(files);
    } else {
      setError('Prosím vyberte video soubory');
    }
  }, [fileQueue, opponent, scoreHome, scoreAway, videoType]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFilesToQueue(Array.from(files));
    }
    // Reset input to allow selecting same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileQueue, opponent, scoreHome, scoreAway, videoType]);

  const addFilesToQueue = (files: File[]) => {
    const currentLength = fileQueue.length;
    const newItems: FileQueueItem[] = files.map((file, index) => {
      const id = `${Date.now()}-${index}`;
      return {
        id,
        file,
        title: generateTitle(currentLength + index, currentLength + files.length),
        status: 'pending' as const,
        progress: 0,
      };
    });

    setFileQueue(prev => {
      const updated = [...prev, ...newItems];
      // Update all titles with new total count
      return updated.map((item, index) => ({
        ...item,
        title: generateTitle(index, updated.length),
      }));
    });
    setError(null);

    // Get duration for each file
    newItems.forEach((item) => {
      getVideoDuration(item.file, item.id);
    });
  };

  const getVideoDuration = (file: File, itemId: string) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setFileQueue(prev => prev.map(item =>
        item.id === itemId ? { ...item, duration: video.duration } : item
      ));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  };

  const removeFromQueue = (id: string) => {
    setFileQueue(prev => {
      const filtered = prev.filter(item => item.id !== id);
      // Update titles with new count
      return filtered.map((item, index) => ({
        ...item,
        title: generateTitle(index, filtered.length),
      }));
    });
  };

  const handleUploadAll = async () => {
    if (fileQueue.length === 0) {
      setError('Nejprve vyberte videa k nahrání');
      return;
    }

    if (videoType === 'match' && !opponent) {
      setError('Pro zápas vyberte soupeře');
      return;
    }

    setIsUploading(true);
    setError(null);

    // Upload files one by one
    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'complete') continue;

      try {
        // Update status to uploading
        setFileQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
        ));

        // Simulate progress while uploading
        const progressInterval = setInterval(() => {
          setFileQueue(prev => prev.map(f =>
            f.id === item.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          ));
        }, 300);

        // Upload to R2
        const { publicUrl } = await uploadFile(item.file, 'videos', item.file.name);

        clearInterval(progressInterval);

        // Update to processing
        setFileQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'processing' as const, progress: 100 } : f
        ));

        // Create video record in Supabase
        await createVideo({
          title: item.title,
          file_url: publicUrl,
          thumbnail_url: null,
          duration: item.duration || null,
          match_id: null,
        });

        // Mark as complete
        setFileQueue(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'complete' as const } : f
        ));

      } catch (err) {
        setFileQueue(prev => prev.map(f =>
          f.id === item.id ? {
            ...f,
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Neznámá chyba'
          } : f
        ));
      }
    }

    setIsUploading(false);

    // Check if all uploads succeeded
    const allComplete = fileQueue.every(f => f.status === 'complete' || f.status === 'error');
    const anySuccess = fileQueue.some(f => f.status === 'complete');

    if (allComplete && anySuccess) {
      setTimeout(() => {
        router.push('/videos');
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = fileQueue.filter(f => f.status === 'complete').length;
  const totalSize = fileQueue.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/videos" className="p-2 hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Nahrát videa</h1>
          {fileQueue.length > 0 && (
            <span className="text-sm text-gray-400">
              ({fileQueue.length} {fileQueue.length === 1 ? 'video' : fileQueue.length < 5 ? 'videa' : 'videí'})
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Team info */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6 flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="SK Slatina"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <div>
            <p className="font-semibold text-blue-300">{team?.name || 'SK Slatina 2017'}</p>
            <p className="text-sm text-blue-400/70">
              Trenéři: {COACHES.map(c => c.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Cloud storage notice */}
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-6">
          <p className="text-xs text-green-300">
            Videa se nahrávají do cloudového úložiště. Můžete vybrat více videí najednou.
          </p>
        </div>

        {/* Match info - select opponent first for auto-naming */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Informace o zápase</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Typ záznamu</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setVideoType('match')}
                  className={`flex-1 py-3 rounded-lg border transition ${
                    videoType === 'match'
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-gray-700 bg-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  disabled={isUploading}
                >
                  Zápas
                </button>
                <button
                  type="button"
                  onClick={() => setVideoType('training')}
                  className={`flex-1 py-3 rounded-lg border transition ${
                    videoType === 'training'
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-gray-700 bg-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  disabled={isUploading}
                >
                  Trénink
                </button>
              </div>
            </div>

            {videoType === 'match' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Soupeř <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      disabled={isUploading}
                    >
                      <option value="">-- Vyberte soupeře --</option>
                      {OPPONENT_TEAMS.map(team => (
                        <option key={team.id} value={team.name}>{team.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Datum zápasu</label>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {/* Score section */}
                {opponent && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Výsledek zápasu (volitelné)</label>
                    <div className="flex items-center gap-2" style={{ maxWidth: 280 }}>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1 text-center">Slatina</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={scoreHome}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 99)) {
                              setScoreHome(val);
                            }
                          }}
                          placeholder="0"
                          style={{ fontSize: 16 }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-center text-xl font-bold focus:outline-none focus:border-blue-500 transition"
                          disabled={isUploading}
                        />
                      </div>
                      <span className="text-xl font-bold text-gray-500 pt-5">:</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1 text-center truncate">{opponent}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={scoreAway}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 99)) {
                              setScoreAway(val);
                            }
                          }}
                          placeholder="0"
                          style={{ fontSize: 16 }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-center text-xl font-bold focus:outline-none focus:border-blue-500 transition"
                          disabled={isUploading}
                        />
                      </div>
                      {scoreHome !== '' && scoreAway !== '' && (
                        <div className={`text-2xl pt-5 ${
                          parseInt(scoreHome) > parseInt(scoreAway) ? 'text-green-400' :
                          parseInt(scoreHome) < parseInt(scoreAway) ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {parseInt(scoreHome) > parseInt(scoreAway) ? '🏆' :
                           parseInt(scoreHome) < parseInt(scoreAway) ? '😔' :
                           '🤝'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Upload area */}
        <div
          className={`
            border-2 border-dashed rounded-xl p-8 text-center mb-6 transition
            ${fileQueue.length > 0
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 hover:border-gray-600'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {fileQueue.length > 0 ? (
            <div className="flex items-center justify-center gap-3">
              <Plus className="w-8 h-8 text-blue-400" />
              <div className="text-left">
                <p className="font-medium">Přidat další videa</p>
                <p className="text-sm text-gray-400">
                  Celkem: {formatFileSize(totalSize)}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg mb-2">Přetáhněte videa sem</p>
              <p className="text-sm text-gray-400">nebo klikněte pro výběr souborů</p>
              <p className="text-xs text-gray-500 mt-4">
                Můžete vybrat více videí najednou • MP4, MOV, AVI, MKV, WebM
              </p>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* File queue */}
        {fileQueue.length > 0 && (
          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Fronta k nahrání ({completedCount}/{fileQueue.length})
            </h3>

            {fileQueue.map((item, index) => (
              <div
                key={item.id}
                className={`bg-gray-800 rounded-lg p-4 border transition ${
                  item.status === 'complete' ? 'border-green-600' :
                  item.status === 'error' ? 'border-red-600' :
                  item.status === 'uploading' || item.status === 'processing' ? 'border-blue-600' :
                  'border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {item.status === 'complete' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {item.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                    {(item.status === 'uploading' || item.status === 'processing') && (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    )}
                    {item.status === 'pending' && <FileVideo className="w-5 h-5 text-gray-400" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {item.file.name} • {formatFileSize(item.file.size)}
                      {item.duration && ` • ${formatDuration(item.duration)}`}
                    </p>

                    {/* Progress bar */}
                    {(item.status === 'uploading' || item.status === 'processing') && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.status === 'uploading' ? `Nahrávání... ${item.progress}%` : 'Ukládání do databáze...'}
                        </p>
                      </div>
                    )}

                    {/* Error message */}
                    {item.status === 'error' && item.error && (
                      <p className="text-sm text-red-400 mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {item.status === 'pending' && !isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(item.id);
                      }}
                      className="p-1 hover:bg-gray-700 rounded transition"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 pb-32">
          <Link
            href="/videos"
            className="px-6 py-3 text-gray-400 hover:text-white transition"
          >
            Zrušit
          </Link>
          <button
            onClick={handleUploadAll}
            disabled={fileQueue.length === 0 || isUploading || (videoType === 'match' && !opponent)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Nahrávání... ({completedCount}/{fileQueue.length})
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Nahrát {fileQueue.length > 0 ? `${fileQueue.length} ${fileQueue.length === 1 ? 'video' : fileQueue.length < 5 ? 'videa' : 'videí'}` : 'videa'}
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
