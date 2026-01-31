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
} from 'lucide-react';
import {
  getPlayers,
  getPlayerStats,
  getTeam,
  Player,
  PlayerStats,
} from '@/lib/team-store';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const team = typeof window !== 'undefined' ? getTeam() : null;

  useEffect(() => {
    const loadData = () => {
      const playerList = getPlayers();
      setPlayers(playerList);

      const statsMap: Record<string, PlayerStats> = {};
      playerList.forEach(p => {
        statsMap[p.id] = getPlayerStats(p.id);
      });
      setStats(statsMap);
    };
    loadData();
  }, []);

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
                <p style={{ fontSize: 12, color: '#9ca3af' }}>{team?.name || 'SK Slatina 2017'}</p>
              </div>
            </div>
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
                  <div>
                    <div style={{ fontWeight: 500 }}>{player.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{player.position || 'Hráč'}</div>
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
      </main>
    </div>
  );
}
