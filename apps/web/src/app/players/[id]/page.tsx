'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  Target,
  MessageSquare,
  Video,
  Calendar,
  Camera,
  User,
  Edit3,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
} from 'lucide-react';
import {
  getPlayerById,
  getPlayerStats,
  getMatchesForPlayer,
  getGoalsForPlayer,
  getCommentsForPlayer,
  updatePlayer,
  Player,
  PlayerStats,
  Match,
  Goal,
  CoachComment,
} from '@/lib/team-store';
import { getVideo } from '@/lib/demo-store';

// Photo crop modal component
function PhotoCropModal({
  imageUrl,
  onSave,
  onCancel,
}: {
  imageUrl: string;
  onSave: (croppedUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);

    // Calculate scaled dimensions
    const scale = Math.min(size / image.width, size / image.height) * zoom;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (size - scaledWidth) / 2 + offset.x;
    const y = (size - scaledHeight) / 2 + offset.y;

    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Draw circular mask overlay
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Draw border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.stroke();
  }, [image, zoom, offset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    onSave(dataUrl);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
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
        maxWidth: 360,
        width: '100%',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
          Upravit fotku
        </h3>

        {/* Canvas preview */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16,
          touchAction: 'none',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: '50%',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Zoom controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 16,
        }}>
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none',
              backgroundColor: '#374151', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ZoomOut size={20} />
          </button>

          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ width: 120, accentColor: '#3b82f6' }}
          />

          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none',
              backgroundColor: '#374151', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ZoomIn size={20} />
          </button>

          <button
            onClick={handleReset}
            style={{
              width: 40, height: 40, borderRadius: 8, border: 'none',
              backgroundColor: '#374151', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Resetovat"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 16 }}>
          <Move size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Táhni pro posun
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#374151',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#22c55e',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'goals' | 'comments'>('matches');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [editPosition, setEditPosition] = useState('');

  // Photo crop state
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    if (!file.type.startsWith('image/')) {
      alert('Prosím vyberte obrázek');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Obrázek je příliš velký (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handlePhotoCropSave = (croppedUrl: string) => {
    if (!player) return;
    const updated = updatePlayer(player.id, { photoUrl: croppedUrl });
    if (updated) {
      setPlayer(updated);
    }
    setPendingPhoto(null);
  };

  const saveNumber = () => {
    if (!player) return;
    const num = editNumber.trim() ? parseInt(editNumber, 10) : undefined;
    const updated = updatePlayer(player.id, { number: num });
    if (updated) setPlayer(updated);
    setIsEditingNumber(false);
  };

  const saveName = () => {
    if (!player || !editName.trim()) return;
    const updated = updatePlayer(player.id, { name: editName.trim() });
    if (updated) setPlayer(updated);
    setIsEditingName(false);
  };

  const savePosition = () => {
    if (!player) return;
    const updated = updatePlayer(player.id, { position: editPosition.trim() || undefined });
    if (updated) setPlayer(updated);
    setIsEditingPosition(false);
  };

  const startEditNumber = () => {
    setEditNumber(player?.number?.toString() || '');
    setIsEditingNumber(true);
  };

  const startEditName = () => {
    setEditName(player?.name || '');
    setIsEditingName(true);
  };

  const startEditPosition = () => {
    setEditPosition(player?.position || '');
    setIsEditingPosition(true);
  };

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

  const positions = ['Brankář', 'Obránce', 'Záložník', 'Útočník', 'Univerzál'];

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
          {/* Photo with upload */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #374151',
                }}
              />
            ) : (
              <div style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                fontWeight: 700,
                color: '#60a5fa',
                border: '4px solid #4b5563',
              }}>
                {player.number || <User size={48} />}
              </div>
            )}

            {/* Camera button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                border: '3px solid #1f2937',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={18} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Player number - editable */}
          <div style={{ marginBottom: 12 }}>
            {isEditingNumber ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editNumber}
                  onChange={e => setEditNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="Číslo"
                  autoFocus
                  style={{
                    width: 60,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '2px solid #3b82f6',
                    backgroundColor: '#374151',
                    color: 'white',
                    fontSize: 16,
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveNumber();
                    if (e.key === 'Escape') setIsEditingNumber(false);
                  }}
                />
                <button
                  onClick={saveNumber}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    backgroundColor: '#22c55e', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditingNumber(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    backgroundColor: '#374151', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditNumber}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                #{player.number || '?'}
                <Edit3 size={14} />
              </button>
            )}
          </div>

          {/* Player name - editable */}
          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '2px solid #3b82f6',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontSize: 20,
                  fontWeight: 700,
                  textAlign: 'center',
                  width: 200,
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                onClick={saveName}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none',
                  backgroundColor: '#22c55e', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none',
                  backgroundColor: '#374151', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <h2
              onClick={startEditName}
              style={{
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {player.name}
              <Edit3 size={16} style={{ opacity: 0.5 }} />
            </h2>
          )}

          {/* Position - editable */}
          {isEditingPosition ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {positions.map(pos => (
                <button
                  key={pos}
                  onClick={() => {
                    setEditPosition(pos);
                    const updated = updatePlayer(player.id, { position: pos });
                    if (updated) setPlayer(updated);
                    setIsEditingPosition(false);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: player.position === pos ? '#2563eb' : '#374151',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {pos}
                </button>
              ))}
              <button
                onClick={() => setIsEditingPosition(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  backgroundColor: '#374151', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <p
              onClick={startEditPosition}
              style={{
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {player.position || 'Klikni pro výběr pozice'}
              <Edit3 size={12} style={{ opacity: 0.5 }} />
            </p>
          )}

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

      {/* Photo Crop Modal */}
      {pendingPhoto && (
        <PhotoCropModal
          imageUrl={pendingPhoto}
          onSave={handlePhotoCropSave}
          onCancel={() => setPendingPhoto(null)}
        />
      )}
    </div>
  );
}
