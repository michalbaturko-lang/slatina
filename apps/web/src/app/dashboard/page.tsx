'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Upload,
  Users,
  Video,
  Brain,
  TrendingUp,
  Clock,
  Calendar,
} from 'lucide-react';

interface VideoSummary {
  id: string;
  title: string;
  opponent: string;
  date: string;
  duration: string;
  aiEvents: number;
  thumbnail: string;
}

interface TeamStats {
  totalVideos: number;
  totalAnnotations: number;
  aiAccuracy: number;
  thisWeekVideos: number;
}

const mockVideos: VideoSummary[] = [
  {
    id: '1',
    title: 'Zápas vs. Sparta Praha U15',
    opponent: 'Sparta Praha',
    date: '2024-01-28',
    duration: '1:32:45',
    aiEvents: 47,
    thumbnail: '/thumbnails/match1.jpg',
  },
  {
    id: '2',
    title: 'Trénink - Útočné kombinace',
    opponent: '',
    date: '2024-01-25',
    duration: '0:45:20',
    aiEvents: 23,
    thumbnail: '/thumbnails/training1.jpg',
  },
  {
    id: '3',
    title: 'Zápas vs. Slavia Praha U15',
    opponent: 'Slavia Praha',
    date: '2024-01-21',
    duration: '1:28:10',
    aiEvents: 52,
    thumbnail: '/thumbnails/match2.jpg',
  },
];

const mockStats: TeamStats = {
  totalVideos: 24,
  totalAnnotations: 156,
  aiAccuracy: 87,
  thisWeekVideos: 3,
};

export default function DashboardPage() {
  const [videos] = useState<VideoSummary[]>(mockVideos);
  const [stats] = useState<TeamStats>(mockStats);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Slatina</span>
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-blue-400 font-medium">
              Dashboard
            </Link>
            <Link href="/videos" className="text-gray-400 hover:text-white transition">
              Videa
            </Link>
            <Link href="/team" className="text-gray-400 hover:text-white transition">
              Tým
            </Link>
            <Link href="/strategies" className="text-gray-400 hover:text-white transition">
              Strategie
            </Link>
          </nav>

          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <Upload className="w-4 h-4" />
            Nahrát video
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Video className="w-5 h-5" />}
            label="Celkem videí"
            value={stats.totalVideos}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Tento týden"
            value={stats.thisWeekVideos}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Anotací"
            value={stats.totalAnnotations}
            color="purple"
          />
          <StatCard
            icon={<Brain className="w-5 h-5" />}
            label="AI přesnost"
            value={`${stats.aiAccuracy}%`}
            color="orange"
          />
        </div>

        {/* Recent Videos */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Poslední videa</h2>
            <Link href="/videos" className="text-blue-400 hover:text-blue-300 text-sm">
              Zobrazit vše →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Události k ověření
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              AI detekovalo 12 situací, které potřebují vaše ověření pro zlepšení přesnosti.
            </p>
            <Link
              href="/ai-review"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
            >
              Zkontrolovat události →
            </Link>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              Sdílené klipy
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              3 nové klipy byly sdíleny s hráči. Podívejte se na jejich reakce.
            </p>
            <Link
              href="/clips"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300"
            >
              Zobrazit klipy →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function VideoCard({ video }: { video: VideoSummary }) {
  return (
    <Link href={`/videos/${video.id}`} className="group">
      <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition">
        {/* Thumbnail */}
        <div className="aspect-video bg-gray-700 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/50 group-hover:text-white/80 transition" />
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
            {video.duration}
          </div>
          {video.aiEvents > 0 && (
            <div className="absolute top-2 right-2 bg-purple-600/90 px-2 py-1 rounded text-xs flex items-center gap-1">
              <Brain className="w-3 h-3" />
              {video.aiEvents}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium mb-1 group-hover:text-blue-400 transition">
            {video.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(video.date).toLocaleDateString('cs-CZ')}
            </span>
            {video.opponent && (
              <span>vs. {video.opponent}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
