'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  Video as VideoIcon,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import {
  getMatches,
  getVideos,
  getPlayers,
  getMatchPlayers as getMatchPlayersCloud,
  addPlayerToMatch,
  removePlayerFromMatch,
  createMatch,
  updateVideo,
  deleteMatch,
  Match,
  Video,
  Player,
  MatchPlayer,
} from '@/lib/cloud-store';
import { OPPONENT_TEAMS } from '@/lib/team-store';

type ResultFilter = 'all' | 'win' | 'loss' | 'draw';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState<ResultFilter>('all');
  const [filterOpponent, setFilterOpponent] = useState<string>('all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState<string | null>(null);
  const [creatingMatchFromOrphans, setCreatingMatchFromOrphans] = useState(false);
  const [showOrphanMatchModal, setShowOrphanMatchModal] = useState(false);
  const [orphanMatchData, setOrphanMatchData] = useState({
    opponent: '',
    scoreHome: '',
    scoreAway: '',
    date: '',
    tournament: '',
    isTournament: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [matchesData, videosData, playersData] = await Promise.all([
          getMatches(),
          getVideos(),
          getPlayers(),
        ]);
        setMatches(matchesData);
        setVideos(videosData);
        setPlayers(playersData.filter(p => p.active));

        // Load match-player associations for all matches from cloud
        const matchPlayerMap: Record<string, string[]> = {};
        await Promise.all(
          matchesData.map(async (match) => {
            try {
              const mpData = await getMatchPlayersCloud(match.id);
              matchPlayerMap[match.id] = mpData.map(mp => mp.player_id);
            } catch (err) {
              // Table might not exist or be empty
              matchPlayerMap[match.id] = [];
            }
          })
        );
        setMatchPlayers(matchPlayerMap);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Toggle player for a match - now saves to cloud
  const togglePlayerForMatch = async (matchId: string, playerId: string) => {
    const current = matchPlayers[matchId] || [];
    const isAdding = !current.includes(playerId);

    // Optimistic update
    setMatchPlayers(prev => {
      const updated = isAdding
        ? [...current, playerId]
        : current.filter(id => id !== playerId);
      return { ...prev, [matchId]: updated };
    });

    try {
      if (isAdding) {
        await addPlayerToMatch({
          match_id: matchId,
          player_id: playerId,
          played: true,
          minutes_played: null,
          goals: 0,
          assists: 0,
        });
      } else {
        await removePlayerFromMatch(matchId, playerId);
      }
    } catch (err) {
      console.error('Failed to update match players:', err);
      // Revert on error
      setMatchPlayers(prev => ({
        ...prev,
        [matchId]: current,
      }));
    }
  };

  // Get players for a specific match
  const getMatchPlayers = (matchId: string) => {
    const playerIds = matchPlayers[matchId] || [];
    return players.filter(p => playerIds.includes(p.id));
  };

  // Get videos for a specific match
  const getMatchVideos = (matchId: string) => {
    return videos.filter(v => v.match_id === matchId);
  };

  // Get videos without a match (orphaned)
  const orphanedVideos = useMemo(() => {
    return videos.filter(v => !v.match_id);
  }, [videos]);

  // Show modal to create match from orphan videos
  const openOrphanMatchModal = () => {
    if (orphanedVideos.length === 0) return;

    // Try to extract match info from video titles
    const firstTitle = orphanedVideos[0].title;
    // Pattern: "Slatina-Opponent Score" or "vs. Opponent" or "vs Opponent"
    const matchPattern = /Slatina[- ]+([\w]+)\s*(\d+):(\d+)?/i;
    const vsPattern = /vs\.?\s*([\w]+)/i;

    let opponent = '';
    let scoreHome = '';
    let scoreAway = '';

    const match1 = firstTitle.match(matchPattern);
    const match2 = firstTitle.match(vsPattern);

    if (match1) {
      opponent = match1[1];
      scoreHome = match1[2] || '';
      scoreAway = match1[3] || '';
    } else if (match2) {
      opponent = match2[1];
    }

    // Extract date from first video
    const videoDate = orphanedVideos[0].created_at.split('T')[0];

    setOrphanMatchData({
      opponent,
      scoreHome,
      scoreAway,
      date: videoDate,
      tournament: '',
      isTournament: false,
    });
    setShowOrphanMatchModal(true);
  };

  // Confirm and create match from orphan videos
  const confirmCreateMatchFromOrphans = async () => {
    if (orphanedVideos.length === 0) return;

    setCreatingMatchFromOrphans(true);
    setShowOrphanMatchModal(false);

    const { opponent, scoreHome, scoreAway, date, tournament, isTournament } = orphanMatchData;
    const goalsFor = parseInt(scoreHome) || 0;
    const goalsAgainst = parseInt(scoreAway) || 0;

    // Capture orphan video IDs at the start to avoid closure issues
    const orphanVideoIds = new Set(orphanedVideos.map(v => v.id));
    const orphanCount = orphanedVideos.length;

    // Build match name with tournament prefix if applicable
    const matchName = isTournament && tournament
      ? `${tournament}: Slatina vs ${opponent}`
      : `Slatina vs ${opponent}`;

    try {
      // Create the match
      const newMatch = await createMatch({
        name: matchName,
        date: date || new Date().toISOString().split('T')[0],
        type: isTournament ? 'tournament' : 'match',
        opponent_id: null,
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        notes: `Automaticky vytvořeno z ${orphanCount} videí`,
      });

      // Update video titles to include tournament prefix if applicable
      const videoTitlePrefix = isTournament && tournament ? `${tournament}: ` : '';

      // Assign all orphan videos to this match and update their titles
      await Promise.all(
        orphanedVideos.map(video => {
          // Only add prefix if it's a tournament and title doesn't already have it
          const newTitle = isTournament && tournament && !video.title.startsWith(tournament)
            ? `${videoTitlePrefix}${video.title}`
            : video.title;
          return updateVideo(video.id, { match_id: newMatch.id, title: newTitle });
        })
      );

      // Reload videos from database to ensure consistency
      const freshVideos = await getVideos();
      setVideos(freshVideos);

      // Update matches state
      setMatches(prev => [newMatch, ...prev.filter(m => m.id !== newMatch.id)]);

      alert(`Vytvořen zápas "${matchName}" s ${orphanCount} videi!`);
    } catch (err) {
      console.error('Failed to create match from orphans:', err);
      alert('Nepodařilo se vytvořit zápas');
    } finally {
      setCreatingMatchFromOrphans(false);
    }
  };

  // Delete a match
  const handleDeleteMatch = async (matchId: string, matchName: string) => {
    if (!confirm(`Opravdu smazat zápas "${matchName}"?\n\nVidea přiřazená k tomuto zápasu zůstanou, ale budou bez přiřazení.`)) {
      return;
    }

    try {
      // First, unlink all videos from this match
      const matchVideos = videos.filter(v => v.match_id === matchId);
      await Promise.all(
        matchVideos.map(video => updateVideo(video.id, { match_id: null }))
      );

      // Delete the match
      await deleteMatch(matchId);

      // Update local state
      setMatches(prev => prev.filter(m => m.id !== matchId));
      setVideos(prev => prev.map(v =>
        v.match_id === matchId ? { ...v, match_id: null } : v
      ));

      alert('Zápas smazán');
    } catch (err) {
      console.error('Failed to delete match:', err);
      alert('Nepodařilo se smazat zápas');
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const isWin = match.goals_for > match.goals_against;
      const isLoss = match.goals_for < match.goals_against;
      const isDraw = match.goals_for === match.goals_against;

      const matchesResult = filterResult === 'all' ||
        (filterResult === 'win' && isWin) ||
        (filterResult === 'loss' && isLoss) ||
        (filterResult === 'draw' && isDraw);

      // Check if match name contains opponent
      const matchesOpponent = filterOpponent === 'all' ||
        match.name.toLowerCase().includes(filterOpponent.toLowerCase());

      return matchesResult && matchesOpponent;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matches, filterResult, filterOpponent]);

  const stats = useMemo(() => {
    const wins = matches.filter(m => m.goals_for > m.goals_against).length;
    const losses = matches.filter(m => m.goals_for < m.goals_against).length;
    const draws = matches.filter(m => m.goals_for === m.goals_against).length;
    const goalsFor = matches.reduce((sum, m) => sum + m.goals_for, 0);
    const goalsAgainst = matches.reduce((sum, m) => sum + m.goals_against, 0);
    return { wins, losses, draws, goalsFor, goalsAgainst, total: matches.length };
  }, [matches]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

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
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ padding: 8, color: 'white' }}>
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
          <Link
            href="/videos/upload"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              borderRadius: 8,
              color: 'white',
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            <Plus size={16} />
            Přidat zápas
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
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
        {filteredMatches.length === 0 && orphanedVideos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <Trophy size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>Žádné zápasy k zobrazení</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Nahrajte videa se zápasovými informacemi
            </p>
            <Link
              href="/videos/upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                borderRadius: 8,
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} />
              Nahrát video
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredMatches.map(match => {
              const isWin = match.goals_for > match.goals_against;
              const isLoss = match.goals_for < match.goals_against;
              const matchVideos = getMatchVideos(match.id);
              const isExpanded = expandedMatch === match.id;

              return (
                <div
                  key={match.id}
                  style={{
                    backgroundColor: '#1f2937',
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderLeft: `4px solid ${isWin ? '#22c55e' : isLoss ? '#ef4444' : '#eab308'}`,
                  }}
                >
                  {/* Match header */}
                  <button
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                    style={{
                      width: '100%',
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Match info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {new Date(match.date).toLocaleDateString('cs-CZ')}
                        </span>
                        {match.type === 'tournament' && (
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            backgroundColor: '#6366f1',
                            borderRadius: 4,
                          }}>
                            TURNAJ
                          </span>
                        )}
                        {matchVideos.length > 0 && (
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            backgroundColor: '#2563eb',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <VideoIcon size={10} />
                            {matchVideos.length} videí
                          </span>
                        )}
                        {getMatchPlayers(match.id).length > 0 && (
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            backgroundColor: '#22c55e',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <Users size={10} />
                            {getMatchPlayers(match.id).length} hráčů
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 16 }}>
                        {match.name}
                      </div>
                      {match.notes && (
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                          {match.notes}
                        </p>
                      )}
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
                        {match.goals_for}:{match.goals_against}
                      </div>
                      <div style={{ fontSize: 10, color: isWin ? '#22c55e' : isLoss ? '#ef4444' : '#eab308' }}>
                        {isWin ? 'VÝHRA' : isLoss ? 'PROHRA' : 'REMÍZA'}
                      </div>
                    </div>

                    {/* Expand icon */}
                    <div style={{ color: '#6b7280' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {/* Expanded content - players and videos */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid #374151',
                      padding: 16,
                      backgroundColor: '#111827',
                    }}>
                      {/* Players Section */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <h4 style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} />
                            Hráči v zápase ({getMatchPlayers(match.id).length})
                          </h4>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowPlayerSelector(showPlayerSelector === match.id ? null : match.id); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 8px',
                              backgroundColor: '#2563eb',
                              border: 'none',
                              borderRadius: 6,
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: 11,
                            }}
                          >
                            <UserPlus size={12} />
                            Upravit
                          </button>
                        </div>

                        {/* Player chips */}
                        {getMatchPlayers(match.id).length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {getMatchPlayers(match.id).map(player => (
                              <span
                                key={player.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 10px',
                                  backgroundColor: '#1f2937',
                                  borderRadius: 16,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}>
                                  {player.number || '?'}
                                </span>
                                {player.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>
                            Zatím nejsou přiřazeni hráči
                          </p>
                        )}

                        {/* Player selector modal */}
                        {showPlayerSelector === match.id && (
                          <div style={{
                            marginTop: 12,
                            padding: 12,
                            backgroundColor: '#1f2937',
                            borderRadius: 8,
                            border: '1px solid #374151',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 500 }}>Vyber hráče:</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowPlayerSelector(null); }}
                                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                              {players.map(player => {
                                const isSelected = (matchPlayers[match.id] || []).includes(player.id);
                                return (
                                  <button
                                    key={player.id}
                                    onClick={(e) => { e.stopPropagation(); togglePlayerForMatch(match.id, player.id); }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '8px 10px',
                                      backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.2)' : '#374151',
                                      border: isSelected ? '1px solid #22c55e' : '1px solid transparent',
                                      borderRadius: 8,
                                      color: 'white',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <span style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      backgroundColor: isSelected ? '#22c55e' : '#4b5563',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 10,
                                      fontWeight: 700,
                                    }}>
                                      {isSelected ? <Check size={12} /> : player.number || '?'}
                                    </span>
                                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {player.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Videos Section */}
                      {matchVideos.length > 0 ? (
                        <div>
                          <h4 style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <VideoIcon size={14} />
                            Videa ze zápasu ({matchVideos.length})
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {matchVideos.map(video => (
                              <Link
                                key={video.id}
                                href={`/videos/${video.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: 12,
                                  backgroundColor: '#1f2937',
                                  borderRadius: 8,
                                  textDecoration: 'none',
                                  color: 'white',
                                }}
                              >
                                {video.thumbnail_url ? (
                                  <img
                                    src={video.thumbnail_url}
                                    alt=""
                                    style={{ width: 60, height: 40, borderRadius: 4, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: 60,
                                    height: 40,
                                    backgroundColor: '#374151',
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                    <Play size={16} style={{ opacity: 0.5 }} />
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {video.title}
                                  </p>
                                  {video.duration && (
                                    <p style={{ fontSize: 11, color: '#9ca3af' }}>
                                      {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 16 }}>
                          K tomuto zápasu nejsou přiřazena žádná videa
                        </p>
                      )}

                      {/* Delete match button */}
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #374151' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id, match.name); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ef4444',
                            borderRadius: 6,
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          <Trash2 size={14} />
                          Smazat zápas
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Orphaned videos section */}
            {orphanedVideos.length > 0 && filterResult === 'all' && filterOpponent === 'all' && (
              <div style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: '#1f2937',
                borderRadius: 12,
                borderLeft: '4px solid #6b7280',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <VideoIcon size={16} />
                    Videa bez přiřazeného zápasu ({orphanedVideos.length})
                  </h3>
                  <button
                    onClick={openOrphanMatchModal}
                    disabled={creatingMatchFromOrphans}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      backgroundColor: '#22c55e',
                      border: 'none',
                      borderRadius: 6,
                      color: 'white',
                      cursor: creatingMatchFromOrphans ? 'wait' : 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      opacity: creatingMatchFromOrphans ? 0.7 : 1,
                    }}
                  >
                    <Plus size={14} />
                    {creatingMatchFromOrphans ? 'Vytvářím...' : 'Vytvořit zápas'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {orphanedVideos.slice(0, 6).map(video => (
                    <Link
                      key={video.id}
                      href={`/videos/${video.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        backgroundColor: '#111827',
                        borderRadius: 8,
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          style={{ width: 60, height: 40, borderRadius: 4, objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 60,
                          height: 40,
                          backgroundColor: '#374151',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Play size={16} style={{ opacity: 0.5 }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {video.title}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af' }}>
                          {new Date(video.created_at).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                {orphanedVideos.length > 6 && (
                  <Link
                    href="/videos"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      marginTop: 12,
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontSize: 13,
                    }}
                  >
                    Zobrazit všech {orphanedVideos.length} videí →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Orphan Match Creation Modal */}
        {showOrphanMatchModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}>
            <div style={{
              backgroundColor: '#1f2937',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>Vytvořit zápas</h3>
                <button
                  onClick={() => setShowOrphanMatchModal(false)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                Přiřadit {orphanedVideos.length} videí k novému zápasu
              </p>

              {/* Tournament toggle */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={orphanMatchData.isTournament}
                    onChange={(e) => setOrphanMatchData(prev => ({ ...prev, isTournament: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14 }}>Zápas v rámci turnaje</span>
                </label>
              </div>

              {/* Tournament name */}
              {orphanMatchData.isTournament && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                    Název turnaje
                  </label>
                  <input
                    type="text"
                    value={orphanMatchData.tournament}
                    onChange={(e) => setOrphanMatchData(prev => ({ ...prev, tournament: e.target.value }))}
                    placeholder="např. Křenovice"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#374151',
                      border: '1px solid #4b5563',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: 14,
                    }}
                  />
                </div>
              )}

              {/* Opponent */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Soupeř
                </label>
                <input
                  type="text"
                  value={orphanMatchData.opponent}
                  onChange={(e) => setOrphanMatchData(prev => ({ ...prev, opponent: e.target.value }))}
                  placeholder="např. Ratíškovice"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Score */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Skóre
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    value={orphanMatchData.scoreHome}
                    onChange={(e) => setOrphanMatchData(prev => ({ ...prev, scoreHome: e.target.value }))}
                    placeholder="Slatina"
                    min="0"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: '#374151',
                      border: '1px solid #4b5563',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>:</span>
                  <input
                    type="number"
                    value={orphanMatchData.scoreAway}
                    onChange={(e) => setOrphanMatchData(prev => ({ ...prev, scoreAway: e.target.value }))}
                    placeholder="Soupeř"
                    min="0"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: '#374151',
                      border: '1px solid #4b5563',
                      borderRadius: 8,
                      color: 'white',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>
                  Datum zápasu
                </label>
                <input
                  type="date"
                  value={orphanMatchData.date}
                  onChange={(e) => setOrphanMatchData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Preview */}
              <div style={{
                backgroundColor: '#111827',
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Náhled názvu zápasu:</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {orphanMatchData.isTournament && orphanMatchData.tournament
                    ? `${orphanMatchData.tournament}: Slatina vs ${orphanMatchData.opponent || '?'}`
                    : `Slatina vs ${orphanMatchData.opponent || '?'}`}
                  {orphanMatchData.scoreHome && orphanMatchData.scoreAway && (
                    <span style={{ marginLeft: 8, color: '#9ca3af' }}>
                      ({orphanMatchData.scoreHome}:{orphanMatchData.scoreAway})
                    </span>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowOrphanMatchModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: '#374151',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Zrušit
                </button>
                <button
                  onClick={confirmCreateMatchFromOrphans}
                  disabled={!orphanMatchData.opponent}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: orphanMatchData.opponent ? '#22c55e' : '#4b5563',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: orphanMatchData.opponent ? 'pointer' : 'not-allowed',
                  }}
                >
                  Vytvořit zápas
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
