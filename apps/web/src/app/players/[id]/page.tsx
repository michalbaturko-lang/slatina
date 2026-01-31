'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  Target,
  MessageSquare,
  Video,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  getPlayerById,
  getPlayerStats,
  getMatchesForPlayer,
  getGoalsForPlayer,
  getCommentsForPlayer,
  Player,
  PlayerStats,
  Match,
  Goal,
  CoachComment,
} from '@/lib/team-store';
import { getVideo } from '@/lib/demo-store';

export default function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'goals' | 'comments'>('matches');

  useEffect(() => {
    const loadData = () => {
      const p = getPlayerById(params.id);
      if (p) {
        setPlayer(p);
        setStats(getPlayerStats(p.id));
        setMatches(getMatchesForPlayer(p.id));
        setGoals(getGoalsForPlayer(p.id));
        setComments(getCommentsForPlayer(p.id));
      }
    };
    loadData();
  }, [params.id]);

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Hráč nenalezen</p>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

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
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/players" style={{ padding: 8, color: 'white' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontWeight: 600, fontSize: 18 }}>Profil hráče</h1>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {/* Player Header */}
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: '#60a5fa',
            margin: '0 auto 16px',
          }}>
            {player.number || '?'}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{player.name}</h2>
          <p style={{ color: '#9ca3af' }}>{player.position || 'Hráč'}</p>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginTop: 24,
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>{stats?.matchesPlayed || 0}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Zápasů</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{stats?.goals || 0}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Gólů</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa' }}>{stats?.assists || 0}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Asistencí</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#a855f7' }}>{stats?.commentsCount || 0}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Komentářů</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
        }}>
          {[
            { key: 'matches', label: 'Zápasy', count: matches.length, icon: <Trophy size={16} /> },
            { key: 'goals', label: 'Góly', count: goals.length, icon: <Target size={16} /> },
            { key: 'comments', label: 'Komentáře', count: comments.length, icon: <MessageSquare size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === tab.key ? '#2563eb' : '#1f2937',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {tab.icon}
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeTab === 'matches' && (
            matches.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
                Zatím žádné zápasy
              </p>
            ) : (
              matches.map(match => (
                <div
                  key={match.id}
                  style={{
                    backgroundColor: '#1f2937',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{match.name}</div>
                      {match.opponent && (
                        <div style={{ fontSize: 14, color: '#9ca3af' }}>vs. {match.opponent}</div>
                      )}
                    </div>
                    {match.result && (
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: match.result.goalsFor > match.result.goalsAgainst ? '#22c55e' :
                               match.result.goalsFor < match.result.goalsAgainst ? '#ef4444' : '#9ca3af',
                      }}>
                        {match.result.goalsFor}:{match.result.goalsAgainst}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                    <Calendar size={14} />
                    {new Date(match.date).toLocaleDateString('cs-CZ')}
                    {match.videoIds.length > 0 && (
                      <>
                        <span>•</span>
                        <Video size={14} />
                        {match.videoIds.length} video
                      </>
                    )}
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'goals' && (
            goals.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
                Zatím žádné góly
              </p>
            ) : (
              goals.map(goal => {
                const match = matches.find(m => m.id === goal.matchId);
                return (
                  <div
                    key={goal.id}
                    style={{
                      backgroundColor: '#1f2937',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Target size={24} style={{ color: '#22c55e' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>Gól</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {match?.name || 'Neznámý zápas'}
                        {goal.minute && ` • ${goal.minute}'`}
                      </div>
                    </div>
                    {goal.videoId && (
                      <Link
                        href={`/videos/${goal.videoId}${goal.videoTime ? `?t=${goal.videoTime}` : ''}`}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#374151',
                          borderRadius: 6,
                          color: 'white',
                          fontSize: 12,
                          textDecoration: 'none',
                        }}
                      >
                        <Video size={14} />
                      </Link>
                    )}
                  </div>
                );
              })
            )
          )}

          {activeTab === 'comments' && (
            comments.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
                Zatím žádné komentáře
              </p>
            ) : (
              comments.map(comment => {
                const video = getVideo(comment.videoId);
                return (
                  <Link
                    key={comment.id}
                    href={`/videos/${comment.videoId}?t=${comment.time}`}
                    style={{
                      backgroundColor: '#1f2937',
                      borderRadius: 12,
                      padding: 16,
                      textDecoration: 'none',
                      color: 'white',
                      display: 'block',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatTime(comment.time)}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {video?.title || 'Video'}
                      </span>
                    </div>
                    <p style={{ fontSize: 14 }}>{comment.text}</p>
                  </Link>
                );
              })
            )
          )}
        </div>
      </main>
    </div>
  );
}
