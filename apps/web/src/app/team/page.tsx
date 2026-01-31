'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  Edit2,
  Mail,
  Phone,
  Calendar,
  BarChart3,
  Play,
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  birthYear: number;
  photo?: string;
  stats: PlayerStats;
  recentIssues: PlayerIssue[];
}

interface PlayerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  // AI-detected stats
  goodSquareCount: number;      // Kolikrát udělal správný čtverec
  offerCount: number;           // Kolikrát se správně nabídl
  markingScore: number;         // Skóre obsazení (0-100)
  improvementTrend: 'up' | 'down' | 'stable';
}

interface PlayerIssue {
  id: string;
  type: string;
  description: string;
  videoId: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Jakub Novák',
    number: 10,
    position: 'Útočník',
    birthYear: 2015,
    stats: {
      matchesPlayed: 12,
      goals: 8,
      assists: 5,
      minutesPlayed: 540,
      goodSquareCount: 34,
      offerCount: 28,
      markingScore: 72,
      improvementTrend: 'up',
    },
    recentIssues: [
      {
        id: '1',
        type: 'offer',
        description: 'Stojí na místě při rozehrávce brankáře',
        videoId: 'v1',
        timestamp: 125.5,
        severity: 'warning',
      },
    ],
  },
  {
    id: '2',
    name: 'Tomáš Svoboda',
    number: 7,
    position: 'Záložník',
    birthYear: 2015,
    stats: {
      matchesPlayed: 12,
      goals: 3,
      assists: 7,
      minutesPlayed: 580,
      goodSquareCount: 45,
      offerCount: 42,
      markingScore: 68,
      improvementTrend: 'up',
    },
    recentIssues: [],
  },
  {
    id: '3',
    name: 'Petr Horák',
    number: 4,
    position: 'Obránce',
    birthYear: 2014,
    stats: {
      matchesPlayed: 10,
      goals: 1,
      assists: 2,
      minutesPlayed: 450,
      goodSquareCount: 28,
      offerCount: 22,
      markingScore: 85,
      improvementTrend: 'stable',
    },
    recentIssues: [
      {
        id: '2',
        type: 'marking',
        description: 'Ztráta hráče při rohu - koukání na míč',
        videoId: 'v2',
        timestamp: 340.2,
        severity: 'critical',
      },
    ],
  },
  {
    id: '4',
    name: 'Martin Dvořák',
    number: 1,
    position: 'Brankář',
    birthYear: 2014,
    stats: {
      matchesPlayed: 12,
      goals: 0,
      assists: 1,
      minutesPlayed: 600,
      goodSquareCount: 0,
      offerCount: 0,
      markingScore: 90,
      improvementTrend: 'up',
    },
    recentIssues: [],
  },
  {
    id: '5',
    name: 'Filip Černý',
    number: 9,
    position: 'Útočník',
    birthYear: 2015,
    stats: {
      matchesPlayed: 8,
      goals: 5,
      assists: 2,
      minutesPlayed: 320,
      goodSquareCount: 18,
      offerCount: 15,
      markingScore: 55,
      improvementTrend: 'down',
    },
    recentIssues: [
      {
        id: '3',
        type: 'square',
        description: 'Běží za míčem místo udržení pozice',
        videoId: 'v1',
        timestamp: 456.7,
        severity: 'warning',
      },
      {
        id: '4',
        type: 'marking',
        description: 'Nevrací se do obrany po ztrátě',
        videoId: 'v2',
        timestamp: 678.3,
        severity: 'critical',
      },
    ],
  },
];

export default function TeamPage() {
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'goals' | 'assists' | 'issues'>('name');

  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortBy) {
      case 'goals':
        return b.stats.goals - a.stats.goals;
      case 'assists':
        return b.stats.assists - a.stats.assists;
      case 'issues':
        return b.recentIssues.length - a.recentIssues.length;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const teamStats = {
    totalGoals: players.reduce((sum, p) => sum + p.stats.goals, 0),
    totalAssists: players.reduce((sum, p) => sum + p.stats.assists, 0),
    avgMarkingScore: Math.round(
      players.reduce((sum, p) => sum + p.stats.markingScore, 0) / players.length
    ),
    playersWithIssues: players.filter(p => p.recentIssues.length > 0).length,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition md:hidden">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-semibold">FC Slatina U9</h1>
              <p className="text-sm text-gray-400">12 hráčů</p>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Přidat hráče</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Team Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Góly celkem"
            value={teamStats.totalGoals}
            color="yellow"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Asistence celkem"
            value={teamStats.totalAssists}
            color="green"
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Průměr obsazení"
            value={`${teamStats.avgMarkingScore}%`}
            color="blue"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Hráči k práci"
            value={teamStats.playersWithIssues}
            color="orange"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm text-gray-400 self-center mr-2">Řadit:</span>
          {[
            { key: 'name', label: 'Jméno' },
            { key: 'goals', label: 'Góly' },
            { key: 'assists', label: 'Asistence' },
            { key: 'issues', label: 'Problémy' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as typeof sortBy)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                sortBy === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Players Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => setSelectedPlayer(player)}
            />
          ))}
        </div>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <PlayerDetailModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
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
  color: 'yellow' | 'green' | 'blue' | 'orange';
}) {
  const colorClasses = {
    yellow: 'bg-yellow-500/10 text-yellow-400',
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
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

function PlayerCard({ player, onClick }: { player: Player; onClick: () => void }) {
  const hasIssues = player.recentIssues.length > 0;
  const criticalIssues = player.recentIssues.filter(i => i.severity === 'critical').length;

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition hover:border-gray-600 ${
        criticalIssues > 0 ? 'border-red-500/50' : 'border-gray-700'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {player.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{player.name}</h3>
            {player.stats.improvementTrend === 'up' && (
              <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
            {player.stats.improvementTrend === 'down' && (
              <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-400">{player.position}</p>

          {/* Quick Stats */}
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              {player.stats.goals}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-green-400" />
              {player.stats.assists}
            </span>
            <span className="text-gray-500">
              {player.stats.matchesPlayed} zápasů
            </span>
          </div>
        </div>

        {/* Issues indicator */}
        {hasIssues && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            criticalIssues > 0 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            <AlertCircle className="w-3 h-3" />
            {player.recentIssues.length}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerDetailModal({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
            {player.number}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{player.name}</h2>
            <p className="text-gray-400">{player.position} • Ročník {player.birthYear}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <ChevronRight className="w-5 h-5 rotate-90" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{player.stats.goals}</div>
            <div className="text-sm text-gray-400">Góly</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{player.stats.assists}</div>
            <div className="text-sm text-gray-400">Asistence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{player.stats.matchesPlayed}</div>
            <div className="text-sm text-gray-400">Zápasy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{player.stats.minutesPlayed}</div>
            <div className="text-sm text-gray-400">Minuty</div>
          </div>
        </div>

        {/* AI Stats */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            AI Analýza
          </h3>
          <div className="space-y-4">
            <ProgressBar
              label="Správný čtverec"
              value={player.stats.goodSquareCount}
              max={50}
              description={`${player.stats.goodSquareCount}x za sezónu`}
            />
            <ProgressBar
              label="Nabídka pro přihrávku"
              value={player.stats.offerCount}
              max={50}
              description={`${player.stats.offerCount}x za sezónu`}
            />
            <ProgressBar
              label="Obsazení soupeřů"
              value={player.stats.markingScore}
              max={100}
              description={`${player.stats.markingScore}% úspěšnost`}
            />
          </div>
        </div>

        {/* Issues to Work On */}
        {player.recentIssues.length > 0 && (
          <div className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Na čem pracovat
            </h3>
            <div className="space-y-3">
              {player.recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/videos/${issue.videoId}?t=${issue.timestamp}`}
                  className={`block p-4 rounded-lg border transition hover:border-gray-600 ${
                    issue.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Play className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{issue.description}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Klikni pro zobrazení v videu ({formatTime(issue.timestamp)})
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="p-6 bg-gray-850 rounded-b-2xl">
          <h3 className="font-semibold mb-3">Doporučení pro trénink</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            {player.stats.markingScore < 70 && (
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                Cvičit obsazení hráče - cvičení "stín" (běhat za spoluhráčem)
              </li>
            )}
            {player.stats.offerCount < 25 && (
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                Pracovat na nabídce - cvičení "volej a běž"
              </li>
            )}
            {player.stats.goodSquareCount < 30 && (
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                Čtverec a rozestupy - hra na malém prostoru s důrazem na pozice
              </li>
            )}
            {player.recentIssues.some(i => i.type === 'marking') && (
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                Priorita: Nekoukej jen na míč - hlava na otočku!
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  description,
}: {
  label: string;
  value: number;
  max: number;
  description: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);
  const color = percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-orange-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-400">{description}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
