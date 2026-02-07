'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Users,
  Trophy,
  Target,
  MessageSquare,
  ChevronRight,
  Plus,
  Edit2,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import {
  getPlayers,
  createPlayer,
  seedPlayersIfEmpty,
  resetRosterToDefault,
  getTeamConfig,
  Player,
} from '@/lib/cloud-store';

// Simplified stats for now - will be computed from cloud data
interface PlayerStats {
  playerId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  commentsCount: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [teamName, setTeamName] = useState('SK Slatina 2017');

  const loadPlayers = async () => {
    try {
      // First, seed players if empty (ensures data exists in Supabase)
      await seedPlayersIfEmpty();

      // Load team config
      const config = await getTeamConfig();
      if (config?.name) {
        setTeamName(config.name);
      }

      // Load from Supabase (cloud)
      const playerList = await getPlayers();
      setPlayers(playerList);

      // Initialize empty stats for now - can be enhanced later
      const statsMap: Record<string, PlayerStats> = {};
      playerList.forEach(p => {
        statsMap[p.id] = {
          playerId: p.id,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
          commentsCount: 0,
        };
      });
      setStats(statsMap);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleResetRoster = async () => {
    if (!confirm('Resetovat seznam hráčů na výchozí soupisku? Fotky a videa hráčů zůstanou zachovány.')) {
      return;
    }
    setResetting(true);
    try {
      await resetRosterToDefault();
      await loadPlayers();
    } catch (err) {
      console.error('Failed to reset roster:', err);
      alert('Nepodařilo se resetovat soupisku');
    } finally {
      setResetting(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setAdding(true);
    try {
      await createPlayer({
        name: newPlayerName.trim(),
        number: newPlayerNumber ? parseInt(newPlayerNumber) : null,
        position: null,
        photo_url: null,
        intro_video_url: null,
        profile_background_url: null,
        active: true,
      });
      setNewPlayerName('');
      setNewPlayerNumber('');
      setShowAddModal(false);
      await loadPlayers();
    } catch (err) {
      console.error('Failed to add player:', err);
      alert('Nepodařilo se přidat hráče');
    } finally {
      setAdding(false);
    }
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
                <h1 style={{ fontWeight: 600, fontSize: 18 }}>Hráči</h1>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>{teamName}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <UserPlus size={14} />
              Přidat
            </button>
            <button
              onClick={handleResetRoster}
              disabled={resetting}
              style={{
                padding: '8px 12px',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: 8,
                color: '#9ca3af',
                cursor: resetting ? 'wait' : 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RefreshCw size={14} className={resetting ? 'animate-spin' : ''} />
              {resetting ? 'Resetuji...' : 'Reset'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}>
            <Users size={24} style={{ color: '#60a5fa', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 24, fontWeight: 700 }}>{players.length}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Hráčů</div>
          </div>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}>
            <Trophy size={24} style={{ color: '#fbbf24', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {Object.values(stats).reduce((sum, s) => sum + s.matchesPlayed, 0)}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Účastí</div>
          </div>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}>
            <Target size={24} style={{ color: '#22c55e', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {Object.values(stats).reduce((sum, s) => sum + s.goals, 0)}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Gólů</div>
          </div>
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}>
            <MessageSquare size={24} style={{ color: '#a855f7', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {Object.values(stats).reduce((sum, s) => sum + s.commentsCount, 0)}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Komentářů</div>
          </div>
        </div>

        {/* Player List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.filter(p => p.active).map(player => {
            const playerStats = stats[player.id] || { matchesPlayed: 0, goals: 0, assists: 0, commentsCount: 0 };
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'white',
                  transition: 'background-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #374151',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#60a5fa',
                    }}>
                      {player.number || '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 500 }}>{player.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {player.number && `#${player.number} • `}{player.position || 'Hráč'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#22c55e' }}>{playerStats.goals}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>gólů</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#60a5fa' }}>{playerStats.assists}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>asistencí</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#a855f7' }}>{playerStats.commentsCount}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>komentářů</div>
                  </div>
                  <ChevronRight size={20} style={{ color: '#6b7280' }} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            Načítání hráčů...
          </div>
        )}

        {/* Empty state */}
        {!loading && players.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            backgroundColor: '#1f2937',
            borderRadius: 12,
          }}>
            <Users size={48} style={{ color: '#4b5563', margin: '0 auto 16px' }} />
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>Zatím žádní hráči</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Přidat prvního hráče
            </button>
          </div>
        )}
      </main>

      {/* Add Player Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Přidat hráče</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                Jméno *
              </label>
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="Jan Novák"
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                Číslo dresu
              </label>
              <input
                type="number"
                value={newPlayerNumber}
                onChange={e => setNewPlayerNumber(e.target.value)}
                placeholder="7"
                min="1"
                max="99"
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                }}
              />
            </div>

            <button
              onClick={handleAddPlayer}
              disabled={adding || !newPlayerName.trim()}
              style={{
                width: '100%',
                padding: 14,
                backgroundColor: newPlayerName.trim() ? '#2563eb' : '#374151',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: adding || !newPlayerName.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {adding ? 'Přidávám...' : 'Přidat hráče'}
            </button>

            <button
              onClick={() => setShowAddModal(false)}
              disabled={adding}
              style={{
                width: '100%',
                padding: 12,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 8,
                color: '#9ca3af',
                cursor: 'pointer',
                marginTop: 8,
                fontSize: 14,
              }}
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
