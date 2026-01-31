'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Play,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { getVideos, DemoVideo } from '@/lib/demo-store';
import { OPPONENT_TEAMS } from '@/lib/team-store';

type ResultFilter = 'all' | 'win' | 'loss' | 'draw';

export default function MatchesPage() {
  const [videos, setVideos] = useState<DemoVideo[]>([]);
  const [filterResult, setFilterResult] = useState<ResultFilter>('all');
  const [filterOpponent, setFilterOpponent] = useState<string>('all');

  useEffect(() => {
    const allVideos = getVideos();
    // Filter videos that have scores
    const matches = allVideos.filter(v => v.scoreHome !== undefined && v.scoreAway !== undefined);
    setVideos(matches);
  }, []);

  const filteredMatches = useMemo(() => {
    return videos.filter(video => {
      const isWin = video.scoreHome! > video.scoreAway!;
      const isLoss = video.scoreHome! < video.scoreAway!;
      const isDraw = video.scoreHome === video.scoreAway;

      const matchesResult = filterResult === 'all' ||
        (filterResult === 'win' && isWin) ||
        (filterResult === 'loss' && isLoss) ||
        (filterResult === 'draw' && isDraw);

      const matchesOpponent = filterOpponent === 'all' || video.opponent === filterOpponent;

      return matchesResult && matchesOpponent;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [videos, filterResult, filterOpponent]);

  const stats = useMemo(() => {
    const wins = videos.filter(v => v.scoreHome! > v.scoreAway!).length;
    const losses = videos.filter(v => v.scoreHome! < v.scoreAway!).length;
    const draws = videos.filter(v => v.scoreHome === v.scoreAway).length;
    const goalsFor = videos.reduce((sum, v) => sum + (v.scoreHome || 0), 0);
    const goalsAgainst = videos.reduce((sum, v) => sum + (v.scoreAway || 0), 0);
    return { wins, losses, draws, goalsFor, goalsAgainst, total: videos.length };
  }, [videos]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: 'white' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1f2937',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/videos" style={{ padding: 8, color: 'white' }}>
              <ArrowLeft size={20} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Image
                src="/logo.svg"
                alt="SK Slatina"
                width={40}
                height={40}
                style={{ borderRadius: 8 }}
              />
              <div>
                <h1 style={{ fontWeight: 600, fontSize: 18 }}>Historie zápasů</h1>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>SK Slatina 2017</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          marginBottom: 24,
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Zápasů</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{stats.wins}</div>
            <div style={{ fontSize: 11, color: '#22c55e' }}>Výher</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(234, 179, 8, 0.2)',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#eab308' }}>{stats.draws}</div>
            <div style={{ fontSize: 11, color: '#eab308' }}>Remíz</div>
          </div>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.losses}</div>
            <div style={{ fontSize: 11, color: '#ef4444' }}>Proher</div>
          </div>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.goalsFor}:{stats.goalsAgainst}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Skóre</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterResult('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: filterResult === 'all' ? '#2563eb' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Vše ({stats.total})
          </button>
          <button
            onClick={() => setFilterResult('win')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: filterResult === 'win' ? '#22c55e' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <TrendingUp size={14} />
            Výhry ({stats.wins})
          </button>
          <button
            onClick={() => setFilterResult('draw')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: filterResult === 'draw' ? '#eab308' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Minus size={14} />
            Remízy ({stats.draws})
          </button>
          <button
            onClick={() => setFilterResult('loss')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: filterResult === 'loss' ? '#ef4444' : '#1f2937',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <TrendingDown size={14} />
            Prohry ({stats.losses})
          </button>
        </div>

        {/* Opponent filter */}
        <div style={{ marginBottom: 16 }}>
          <select
            value={filterOpponent}
            onChange={(e) => setFilterOpponent(e.target.value)}
            style={{
              backgroundColor: '#1f2937',
              color: 'white',
              border: '1px solid #374151',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 14,
              width: '100%',
            }}
          >
            <option value="all">Všichni soupeři</option>
            {OPPONENT_TEAMS.map(team => (
              <option key={team.id} value={team.name}>{team.name}</option>
            ))}
          </select>
        </div>

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>Žádné zápasy k zobrazení</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              {videos.length === 0
                ? 'Nahrajte videa se skóre pro zobrazení historie zápasů'
                : 'Změňte filtry pro zobrazení zápasů'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredMatches.map(match => {
              const isWin = match.scoreHome! > match.scoreAway!;
              const isLoss = match.scoreHome! < match.scoreAway!;
              const thumbnail = match.thumbnail || (match.screenshots && match.screenshots.length > 0 ? match.screenshots[0].dataUrl : null);

              return (
                <Link
                  key={match.id}
                  href={`/videos/${match.id}`}
                  style={{
                    backgroundColor: '#1f2937',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    textDecoration: 'none',
                    color: 'white',
                    borderLeft: `4px solid ${isWin ? '#22c55e' : isLoss ? '#ef4444' : '#eab308'}`,
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: 80,
                    height: 50,
                    backgroundColor: '#374151',
                    borderRadius: 8,
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                  }}>
                    {thumbnail ? (
                      <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={20} style={{ opacity: 0.5 }} />
                      </div>
                    )}
                  </div>

                  {/* Match info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} />
                        {new Date(match.date).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500 }}>
                      SK Slatina vs. {match.opponent || 'Neznámý'}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{
                    backgroundColor: isWin ? 'rgba(34, 197, 94, 0.2)' : isLoss ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    padding: '8px 16px',
                    borderRadius: 8,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: isWin ? '#22c55e' : isLoss ? '#ef4444' : '#eab308',
                    }}>
                      {match.scoreHome}:{match.scoreAway}
                    </div>
                    <div style={{ fontSize: 10, color: isWin ? '#22c55e' : isLoss ? '#ef4444' : '#eab308' }}>
                      {isWin ? 'VÝHRA' : isLoss ? 'PROHRA' : 'REMÍZA'}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
