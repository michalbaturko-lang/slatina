'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Upload,
  Play,
  Calendar,
  Clock,
  Brain,
  Filter,
  Search,
  Grid,
  List,
  MoreVertical,
  Trash2,
  Download,
  Share2,
} from 'lucide-react';

interface VideoItem {
  id: string;
  title: string;
  opponent?: string;
  date: string;
  duration: string;
  status: 'processing' | 'ready' | 'analyzing' | 'error';
  aiEvents: number;
  thumbnail?: string;
  sport: string;
}

const mockVideos: VideoItem[] = [
  {
    id: '1',
    title: 'Zápas vs. Sparta Praha U9',
    opponent: 'Sparta Praha',
    date: '2024-01-28',
    duration: '45:20',
    status: 'ready',
    aiEvents: 47,
    sport: 'football',
  },
  {
    id: '2',
    title: 'Trénink - Přihrávky a nabídka',
    date: '2024-01-25',
    duration: '32:15',
    status: 'ready',
    aiEvents: 23,
    sport: 'football',
  },
  {
    id: '3',
    title: 'Zápas vs. Slavia Praha U9',
    opponent: 'Slavia Praha',
    date: '2024-01-21',
    duration: '48:10',
    status: 'ready',
    aiEvents: 52,
    sport: 'football',
  },
  {
    id: '4',
    title: 'Turnaj Slatina Cup - Finále',
    opponent: 'Bohemians',
    date: '2024-01-14',
    duration: '40:00',
    status: 'analyzing',
    aiEvents: 0,
    sport: 'football',
  },
  {
    id: '5',
    title: 'Trénink - Čtverec a rozestupy',
    date: '2024-01-11',
    duration: '28:45',
    status: 'ready',
    aiEvents: 18,
    sport: 'football',
  },
];

export default function VideosPage() {
  const [videos] = useState<VideoItem[]>(mockVideos);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.opponent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Video className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-semibold">Videa</h1>
              <span className="text-sm text-gray-400">({videos.length})</span>
            </div>

            <Link
              href="/videos/upload"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>Nahrát video</span>
            </Link>
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

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Všechny</option>
              <option value="ready">Připravené</option>
              <option value="processing">Zpracovávají se</option>
              <option value="analyzing">AI analýza</option>
            </select>
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
            <Video className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-4">Žádná videa nenalezena</p>
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
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVideos.map((video) => (
              <VideoListItem key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function VideoCard({ video }: { video: VideoItem }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition group">
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="block">
        <div className="aspect-video bg-gray-700 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-blue-600/80 transition">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>

          {/* Duration */}
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
            {video.duration}
          </div>

          {/* Status badge */}
          {video.status !== 'ready' && (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs ${
              video.status === 'processing' ? 'bg-yellow-600' :
              video.status === 'analyzing' ? 'bg-purple-600' : 'bg-red-600'
            }`}>
              {video.status === 'processing' ? 'Zpracovává se...' :
               video.status === 'analyzing' ? 'AI analýza...' : 'Chyba'}
            </div>
          )}

          {/* AI events */}
          {video.aiEvents > 0 && (
            <div className="absolute top-2 right-2 bg-purple-600/90 px-2 py-1 rounded text-xs flex items-center gap-1">
              <Brain className="w-3 h-3" />
              {video.aiEvents}
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
                {formatDate(video.date)}
              </span>
              {video.opponent && (
                <span>vs. {video.opponent}</span>
              )}
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
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Stáhnout
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Sdílet
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2 text-red-400">
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

function VideoListItem({ video }: { video: VideoItem }) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
    >
      {/* Thumbnail */}
      <div className="w-32 h-20 bg-gray-700 rounded-lg flex-shrink-0 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-6 h-6 text-white/50" />
        </div>
        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-xs">
          {video.duration}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{video.title}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(video.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {video.duration}
          </span>
          {video.opponent && (
            <span>vs. {video.opponent}</span>
          )}
        </div>
      </div>

      {/* Status/AI */}
      <div className="flex items-center gap-3">
        {video.status !== 'ready' && (
          <span className={`px-2 py-1 rounded text-xs ${
            video.status === 'processing' ? 'bg-yellow-600/20 text-yellow-400' :
            video.status === 'analyzing' ? 'bg-purple-600/20 text-purple-400' : 'bg-red-600/20 text-red-400'
          }`}>
            {video.status === 'processing' ? 'Zpracovává se' :
             video.status === 'analyzing' ? 'AI analýza' : 'Chyba'}
          </span>
        )}
        {video.aiEvents > 0 && (
          <span className="flex items-center gap-1 text-purple-400">
            <Brain className="w-4 h-4" />
            {video.aiEvents}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
  });
}
