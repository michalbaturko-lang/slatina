'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Play,
  ChevronRight,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  Video,
  Filter,
} from 'lucide-react';

interface AnalysisIssue {
  id: string;
  type: string;
  category: 'square' | 'offer' | 'marking' | 'passing' | 'corner' | 'goalkeeper';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  descriptionCz: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  players: { id: string; name: string; number: number }[];
  coachingTips: string[];
  drillRecommendations: DrillRecommendation[];
  occurrences: number; // Kolikrát se to stalo
}

interface DrillRecommendation {
  id: string;
  name: string;
  description: string;
  duration: string;
  playerCount: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const mockIssues: AnalysisIssue[] = [
  {
    id: '1',
    type: 'square_bunching',
    category: 'square',
    severity: 'warning',
    description: 'Players bunching together',
    descriptionCz: 'Hráči na jednom místě (chumel)',
    videoId: 'v1',
    videoTitle: 'Zápas vs. Sparta Praha U9',
    timestamp: 125.5,
    players: [
      { id: 'p1', name: 'Jakub Novák', number: 10 },
      { id: 'p2', name: 'Tomáš Svoboda', number: 7 },
      { id: 'p5', name: 'Filip Černý', number: 9 },
    ],
    coachingTips: [
      'Rozběhněte se od sebe! Jste moc blízko.',
      'Čtverec! Vzpomeňte si - od sebe, od sebe!',
      'Představte si, že kolem sebe máte bublinu - nesmí se dotýkat!',
    ],
    drillRecommendations: [
      {
        id: 'd1',
        name: 'Čtverec s kužely',
        description: 'Hráči musí zůstat každý u svého kužele, přihrávají si. Kdo opustí kužel, má trestný bod.',
        duration: '10 min',
        playerCount: '4-6',
        difficulty: 'easy',
      },
      {
        id: 'd2',
        name: 'Hra na bubliny',
        description: 'Každý hráč má imaginární bublinu 3m kolem sebe. Pokud se bubliny dotknou, hra se zastaví.',
        duration: '8 min',
        playerCount: '4-8',
        difficulty: 'easy',
      },
    ],
    occurrences: 8,
  },
  {
    id: '2',
    type: 'offer_standing_still',
    category: 'offer',
    severity: 'warning',
    description: 'Standing still - no offer',
    descriptionCz: 'Stojí na místě - chybí nabídka',
    videoId: 'v1',
    videoTitle: 'Zápas vs. Sparta Praha U9',
    timestamp: 340.2,
    players: [
      { id: 'p5', name: 'Filip Černý', number: 9 },
    ],
    coachingTips: [
      'Pohni se! Nabídni se spoluhráči!',
      'Stojíš - kam ti má přihrát? Běž do volna!',
      'Řekni si o míč - zavolej a naběhni!',
    ],
    drillRecommendations: [
      {
        id: 'd3',
        name: 'Volej a běž',
        description: 'Hráč musí zakřičet jméno a naběhnout, než dostane přihrávku. Bez volání = neplatí.',
        duration: '10 min',
        playerCount: '4-6',
        difficulty: 'easy',
      },
    ],
    occurrences: 12,
  },
  {
    id: '3',
    type: 'marking_ball_watching',
    category: 'marking',
    severity: 'critical',
    description: 'Ball watching - lost opponent',
    descriptionCz: 'Koukání na míč - ztráta hráče',
    videoId: 'v2',
    videoTitle: 'Zápas vs. Slavia Praha U9',
    timestamp: 512.8,
    players: [
      { id: 'p3', name: 'Petr Horák', number: 4 },
    ],
    coachingTips: [
      'Ztratil jsi ho! Kontroluj míč I svého hráče!',
      'Nekoukej jen na míč - kde je tvůj hráč?',
      'Hlava na otočku: míč - hráč - míč - hráč!',
    ],
    drillRecommendations: [
      {
        id: 'd4',
        name: 'Stín',
        description: 'Jeden hráč je útočník, druhý obránce. Obránce musí mít vždy kontakt a zároveň vidět míč.',
        duration: '12 min',
        playerCount: 'Dvojice',
        difficulty: 'medium',
      },
      {
        id: 'd5',
        name: 'Hlava na otočku',
        description: 'Obránce má za zády útočníka. Trenér ukazuje čísla prsty - obránce musí říct číslo a zároveň hlídat útočníka.',
        duration: '8 min',
        playerCount: 'Trojice',
        difficulty: 'medium',
      },
    ],
    occurrences: 5,
  },
  {
    id: '4',
    type: 'gk_offer_bunched',
    category: 'goalkeeper',
    severity: 'warning',
    description: 'No offer to goalkeeper',
    descriptionCz: 'Chybí nabídka brankáři při rozehrávce',
    videoId: 'v1',
    videoTitle: 'Zápas vs. Sparta Praha U9',
    timestamp: 678.3,
    players: [
      { id: 'p1', name: 'Jakub Novák', number: 10 },
      { id: 'p2', name: 'Tomáš Svoboda', number: 7 },
      { id: 'p3', name: 'Petr Horák', number: 4 },
    ],
    coachingTips: [
      'Roztáhněte se! Brankář nemá kam přihrát!',
      'Široce! Každý na svou stranu!',
      'Čtverec od brankáře - nabídněte se!',
    ],
    drillRecommendations: [
      {
        id: 'd6',
        name: 'Rozehrávka brankáře',
        description: 'Brankář má míč, hráči mají 5 sekund na rozestavení. Trenér počítá. Kdo není na místě = trestný bod.',
        duration: '10 min',
        playerCount: '5-7',
        difficulty: 'easy',
      },
    ],
    occurrences: 6,
  },
  {
    id: '5',
    type: 'corner_defend_unmarked',
    category: 'corner',
    severity: 'critical',
    description: 'Attacker unmarked at corner',
    descriptionCz: 'Neobsazený útočník při rohu',
    videoId: 'v2',
    videoTitle: 'Zápas vs. Slavia Praha U9',
    timestamp: 890.1,
    players: [
      { id: 'p3', name: 'Petr Horák', number: 4 },
      { id: 'p5', name: 'Filip Černý', number: 9 },
    ],
    coachingTips: [
      'Volný hráč! Kdo ho má?!',
      'Komunikace! Řekni kdo koho drží!',
      'Před rohem si ŘEKNĚTE kdo koho bere!',
    ],
    drillRecommendations: [
      {
        id: 'd7',
        name: 'Rohový kop - nácvik',
        description: 'Trénink standardních situací. Každý hráč má přidělené místo/hráče. Opakovat dokud není automatické.',
        duration: '15 min',
        playerCount: '6-8',
        difficulty: 'medium',
      },
    ],
    occurrences: 3,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Vše', icon: Filter },
  { id: 'square', label: 'Čtverec', icon: Users },
  { id: 'offer', label: 'Nabídka', icon: Target },
  { id: 'marking', label: 'Obsazení', icon: Users },
  { id: 'corner', label: 'Rohy', icon: Target },
  { id: 'goalkeeper', label: 'Rozehrávka', icon: Target },
];

export default function AnalysisPage() {
  const [issues] = useState<AnalysisIssue[]>(mockIssues);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<AnalysisIssue | null>(null);

  const filteredIssues = selectedCategory === 'all'
    ? issues
    : issues.filter(i => i.category === selectedCategory);

  // Statistiky
  const stats = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    mostCommon: issues.reduce((max, i) => i.occurrences > max.occurrences ? i : max, issues[0]),
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-semibold">Analýza a doporučení</h1>
              <p className="text-sm text-gray-400">AI detekované situace z posledních zápasů</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-gray-400 text-sm">Detekovaných situací</div>
          </div>
          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-gray-400 text-sm">Kritických</div>
          </div>
          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{stats.warning}</div>
            <div className="text-gray-400 text-sm">K práci</div>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">{stats.mostCommon.occurrences}x</div>
            <div className="text-gray-400 text-sm truncate">{stats.mostCommon.descriptionCz}</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => setSelectedIssue(issue)}
            />
          ))}
        </div>

        {/* Issue Detail Modal */}
        {selectedIssue && (
          <IssueDetailModal
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
          />
        )}
      </main>
    </div>
  );
}

function IssueCard({ issue, onClick }: { issue: AnalysisIssue; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition hover:border-gray-600 ${
        issue.severity === 'critical'
          ? 'border-red-500/50'
          : issue.severity === 'warning'
          ? 'border-orange-500/50'
          : 'border-gray-700'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Severity Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          issue.severity === 'critical'
            ? 'bg-red-500/20 text-red-400'
            : issue.severity === 'warning'
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold">{issue.descriptionCz}</h3>
            <span className="text-sm text-gray-400 flex-shrink-0">{issue.occurrences}x</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5" />
              {issue.videoTitle}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {issue.players.map(p => `#${p.number}`).join(', ')}
            </span>
          </div>

          {/* Quick coaching tip */}
          <p className="mt-2 text-sm text-gray-300 line-clamp-1">
            💡 {issue.coachingTips[0]}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-500 hidden sm:block" />
      </div>
    </div>
  );
}

function IssueDetailModal({ issue, onClose }: { issue: AnalysisIssue; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-gray-700 ${
          issue.severity === 'critical' ? 'bg-red-500/10' : 'bg-orange-500/10'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              issue.severity === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{issue.descriptionCz}</h2>
              <p className="text-gray-400 mt-1">
                Stalo se {issue.occurrences}x v posledních zápasech
              </p>
            </div>
          </div>
        </div>

        {/* Video link */}
        <div className="p-6 border-b border-gray-700">
          <Link
            href={`/videos/${issue.videoId}?t=${issue.timestamp}`}
            className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition"
          >
            <div className="w-16 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{issue.videoTitle}</p>
              <p className="text-sm text-gray-400">
                Čas: {formatTime(issue.timestamp)}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>

        {/* Players involved */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Zapojení hráči
          </h3>
          <div className="flex flex-wrap gap-2">
            {issue.players.map(player => (
              <Link
                key={player.id}
                href={`/team?player=${player.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              >
                <span className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                  {player.number}
                </span>
                <span>{player.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Coaching Tips */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Co říct dětem
          </h3>
          <ul className="space-y-3">
            {issue.coachingTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <span className="text-yellow-400 font-bold">{i + 1}.</span>
                <span className="text-yellow-100">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Drill Recommendations */}
        <div className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Doporučená cvičení
          </h3>
          <div className="space-y-4">
            {issue.drillRecommendations.map(drill => (
              <div key={drill.id} className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-green-100">{drill.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    drill.difficulty === 'easy' ? 'bg-green-600/50' :
                    drill.difficulty === 'medium' ? 'bg-yellow-600/50' : 'bg-red-600/50'
                  }`}>
                    {drill.difficulty === 'easy' ? 'Snadné' :
                     drill.difficulty === 'medium' ? 'Střední' : 'Náročné'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-3">{drill.description}</p>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>⏱ {drill.duration}</span>
                  <span>👥 {drill.playerCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mark as resolved */}
        <div className="p-6 bg-gray-850 border-t border-gray-700 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            Zavřít
          </button>
          <button className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Označit jako vyřešené
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
