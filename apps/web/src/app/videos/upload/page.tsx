'use client';

import { useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState('football');
  const [enableAI, setEnableAI] = useState(true);

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

      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  }, [title]);

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      setError('Prosím vyplňte název a vyberte video');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      // Get presigned URL from API
      const response = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          metadata: {
            title,
            opponent,
            matchDate,
            description,
            sport,
            enableAI,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se získat upload URL');
      }

      const { uploadUrl, videoId } = await response.json();

      // Upload file directly to S3
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('processing');

          // Poll for processing status
          pollProcessingStatus(videoId);
        } else {
          throw new Error('Upload selhal');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload selhal - chyba sítě');
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    }
  };

  const pollProcessingStatus = async (videoId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/status`);
        const data = await response.json();

        if (data.status === 'ready') {
          setStatus('complete');
          setTimeout(() => {
            router.push(`/videos/${videoId}`);
          }, 2000);
        } else if (data.status === 'error') {
          setStatus('error');
          setError(data.error || 'Zpracování videa selhalo');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setStatus('error');
          setError('Zpracování trvá příliš dlouho');
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
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
          <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Nahrát video</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {status === 'idle' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
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
                Podporované formáty: MP4, MOV, AVI, MKV (max 10 GB)
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
                  <span>Nahrávání... {progress.percentage}%</span>
                </>
              )}
              {status === 'processing' && (
                <>
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                  <span>Zpracování videa...</span>
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

            {status === 'uploading' && (
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
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
              placeholder="např. Zápas vs. Sparta Praha U15"
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
            <label className="block text-sm font-medium mb-2">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              disabled={status !== 'idle'}
            >
              <option value="football">Fotbal</option>
              <option value="hockey">Hokej</option>
              <option value="basketball">Basketbal</option>
              <option value="handball">Házená</option>
              <option value="floorball">Florbal</option>
              <option value="other">Jiný</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Popis</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Volitelný popis videa..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition resize-none"
              disabled={status !== 'idle'}
            />
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
              href="/dashboard"
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
