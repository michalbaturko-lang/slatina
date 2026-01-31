'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Video as VideoIcon,
  Upload,
  Play,
  Calendar,
  Clock,
  Search,
  Grid,
  List,
  MoreVertical,
  Trash2,
  Loader2,
  Users,
  Trophy,
} from 'lucide-react';
import { getVideos, deleteVideo, Video } from '@/lib/cloud-store';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const storedVideos = await getVideos();
      setVideos(storedVideos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm('Opravdu chcete smazat toto video?')) {
      try {
        await deleteVideo(id);
        await loadVideos();
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Link href="/">
                <Image src="/logo.svg" alt="SK Slatina" width={32} height={32} className="rounded" />
              </Link>
              <h1 className="text-xl font-semibold">SK Slatina 2017</h1>
              <span className="text-sm text-gray-400">({videos.length} videí)</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/players"
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Hráči</span>
              </Link>
              <Link
                href="/matches"
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Zápasy</span>
              </Link>
              <Link
                href="/videos/upload"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                <span>Nahrát video</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Hledat videa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* View mode */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Videos */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <VideoIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-4">
              {videos.length === 0 ? 'Zatím nemáte žádná videa' : 'Žádná videa nenalezena'}
            </p>
            <Link
              href="/videos/upload"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              Nahrát první video
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={handleDeleteVideo} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVideos.map((video) => (
              <VideoListItem key={video.id} video={video} onDelete={handleDeleteVideo} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function VideoCard({ video, onDelete }: { video: Video; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition group">
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="block">
        <div className="aspect-video bg-gray-700 relative overflow-hidden">
          {/* Background thumbnail */}
          {video.thumbnail_url && (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-blue-600/80 transition">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>

          {/* Duration */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/videos/${video.id}`} className="flex-1 min-w-0">
            <h3 className="font-medium truncate group-hover:text-blue-400 transition">
              {video.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(video.created_at)}
              </span>
            </div>
          </Link>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-700 rounded transition"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 bg-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(video.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoListItem({ video, onDelete }: { video: Video; onDelete: (id: string) => void }) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition">
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="w-32 h-20 bg-gray-700 rounded-lg flex-shrink-0 relative block overflow-hidden">
        {video.thumbnail_url && (
          <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-6 h-6 text-white/50" />
        </div>
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-xs">
            {formatDuration(video.duration)}
          </div>
        )}
      </Link>

      {/* Info */}
      <Link href={`/videos/${video.id}`} className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{video.title}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(video.created_at)}
          </span>
          {video.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onDelete(video.id)}
          className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
  });
}
