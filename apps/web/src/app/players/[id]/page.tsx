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
  Image as ImageIcon,
  Film,
  Share2,
  QrCode,
  Plus,
  Trash2,
  Play,
} from 'lucide-react';
import {
  getPlayer as getPlayerCloud,
  updatePlayer as updatePlayerCloud,
  getPlayerPhotos as getPlayerPhotosCloud,
  createPlayerPhoto,
  deletePlayerPhoto as deletePlayerPhotoCloud,
  getPlayerClips as getPlayerClipsCloud,
  createPlayerClip,
  deletePlayerClip as deletePlayerClipCloud,
  getMatches as getMatchesCloud,
  getGoals as getGoalsCloud,
  Player,
  Match,
  Goal,
  PlayerPhoto,
  PlayerClip,
} from '@/lib/cloud-store';
import { uploadDataUrl } from '@/lib/r2-upload';

// Simplified stats interface
interface PlayerStats {
  playerId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  commentsCount: number;
}

// Coach comment interface (not used from cloud yet)
interface CoachComment {
  id: string;
  videoId: string;
  time: number;
  text: string;
  playerIds: string[];
}

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
  const [photos, setPhotos] = useState<PlayerPhoto[]>([]);
  const [clips, setClips] = useState<PlayerClip[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'goals' | 'comments' | 'gallery' | 'clips'>('matches');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [editPosition, setEditPosition] = useState('');

  // Photo crop state
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  // Gallery photo add
  const [pendingGalleryPhoto, setPendingGalleryPhoto] = useState<string | null>(null);
  const [galleryPhotoCaption, setGalleryPhotoCaption] = useState('');
  const [galleryPhotoMatch, setGalleryPhotoMatch] = useState('');

  // QR code modal
  const [showQRModal, setShowQRModal] = useState(false);

  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState<PlayerPhoto | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const p = await getPlayerCloud(params.id);
        if (p) {
          setPlayer(p);

          // Load all data in parallel
          const [photosData, clipsData, matchesData, goalsData] = await Promise.all([
            getPlayerPhotosCloud(p.id),
            getPlayerClipsCloud(p.id),
            getMatchesCloud(),
            getGoalsCloud(),
          ]);

          setPhotos(photosData);
          setClips(clipsData);
          setAllMatches(matchesData);

          // Filter goals for this player
          const playerGoals = goalsData.filter(g => g.scorer_id === p.id);
          const playerAssists = goalsData.filter(g => g.assist_id === p.id);
          setGoals(playerGoals);

          // Calculate stats
          setStats({
            playerId: p.id,
            matchesPlayed: 0, // Would need match_players table
            goals: playerGoals.length,
            assists: playerAssists.length,
            commentsCount: 0,
          });

          // Matches for player - would need match_players join, for now show all
          setMatches([]);
          setComments([]);
        }
      } catch (err) {
        console.error('Failed to load player data:', err);
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

  const handlePhotoCropSave = async (croppedUrl: string) => {
    if (!player) return;
    try {
      // Upload to R2 first
      const { publicUrl } = await uploadDataUrl(croppedUrl, 'player-photos', `player-${player.id}-avatar.jpg`);
      // Update player in Supabase
      const updated = await updatePlayerCloud(player.id, { photo_url: publicUrl });
      if (updated) {
        setPlayer(updated);
      }
    } catch (err) {
      console.error('Failed to save photo:', err);
      alert('Nepodařilo se uložit fotku');
    }
    setPendingPhoto(null);
  };

  // Gallery photo handling
  const handleGalleryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setPendingGalleryPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveGalleryPhoto = async () => {
    if (!player || !pendingGalleryPhoto) return;
    try {
      // Upload to R2 first
      const { publicUrl } = await uploadDataUrl(pendingGalleryPhoto, 'player-photos', `player-${player.id}-gallery-${Date.now()}.jpg`);
      // Save to Supabase
      const photo = await createPlayerPhoto({
        player_id: player.id,
        photo_url: publicUrl,
        match_id: galleryPhotoMatch || null,
        caption: galleryPhotoCaption || null,
      });
      setPhotos([photo, ...photos]);
    } catch (err) {
      console.error('Failed to save gallery photo:', err);
      alert('Nepodařilo se uložit fotku');
    }
    setPendingGalleryPhoto(null);
    setGalleryPhotoCaption('');
    setGalleryPhotoMatch('');
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Opravdu smazat fotku?')) return;
    try {
      await deletePlayerPhotoCloud(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!confirm('Opravdu smazat klip?')) return;
    try {
      await deletePlayerClipCloud(clipId);
      setClips(clips.filter(c => c.id !== clipId));
    } catch (err) {
      console.error('Failed to delete clip:', err);
    }
  };

  // QR code generation
  const getProfileUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/players/${params.id}`;
  };

  const handleShare = async () => {
    const url = getProfileUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${player?.name} - SK Slatina 2017`,
          text: `Profil hráče ${player?.name}`,
          url,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Odkaz zkopírován do schránky!');
    }
  };

  const saveNumber = async () => {
    if (!player) return;
    const num = editNumber.trim() ? parseInt(editNumber, 10) : null;
    try {
      const updated = await updatePlayerCloud(player.id, { number: num });
      if (updated) setPlayer(updated);
    } catch (err) {
      console.error('Failed to update number:', err);
    }
    setIsEditingNumber(false);
  };

  const saveName = async () => {
    if (!player || !editName.trim()) return;
    try {
      const updated = await updatePlayerCloud(player.id, { name: editName.trim() });
      if (updated) setPlayer(updated);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
    setIsEditingName(false);
  };

  const savePosition = async () => {
    if (!player) return;
    try {
      const updated = await updatePlayerCloud(player.id, { position: editPosition.trim() || null });
      if (updated) setPlayer(updated);
    } catch (err) {
      console.error('Failed to update position:', err);
    }
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
          <h1 style={{ fontWeight: 600, fontSize: 18, flex: 1 }}>Profil hráče</h1>
          <button
            onClick={() => setShowQRModal(true)}
            style={{
              padding: 8,
              backgroundColor: '#374151',
              borderRadius: 8,
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="QR kód"
          >
            <QrCode size={20} />
          </button>
          <button
            onClick={handleShare}
            style={{
              padding: 8,
              backgroundColor: '#2563eb',
              borderRadius: 8,
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Sdílet"
          >
            <Share2 size={20} />
          </button>
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
            {player.photo_url ? (
              <img
                src={player.photo_url}
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
                  onClick={async () => {
                    setEditPosition(pos);
                    try {
                      const updated = await updatePlayerCloud(player.id, { position: pos });
                      if (updated) setPlayer(updated);
                    } catch (err) {
                      console.error('Failed to update position:', err);
                    }
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
          gap: 6,
          marginBottom: 16,
          overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {[
            { key: 'matches', label: 'Zápasy', count: matches.length, icon: <Trophy size={14} /> },
            { key: 'goals', label: 'Góly', count: goals.length, icon: <Target size={14} /> },
            { key: 'gallery', label: 'Galerie', count: photos.length, icon: <ImageIcon size={14} /> },
            { key: 'clips', label: 'Momenty', count: clips.length, icon: <Film size={14} /> },
            { key: 'comments', label: 'Komentáře', count: comments.length, icon: <MessageSquare size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: '0 0 auto',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: activeTab === tab.key ? '#2563eb' : '#1f2937',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 13,
                whiteSpace: 'nowrap',
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

          {activeTab === 'gallery' && (
            <>
              {/* Add photo button */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 12,
                  border: '2px dashed #374151',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Plus size={20} />
                Přidat fotku
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryPhotoSelect}
                style={{ display: 'none' }}
              />

              {photos.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
                  Zatím žádné fotky v galerii
                </p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}>
                  {photos.map(photo => {
                    const match = allMatches.find(m => m.id === photo.matchId);
                    return (
                      <div
                        key={photo.id}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                        onClick={() => setViewingPhoto(photo)}
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || 'Fotka'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {match && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 4,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            fontSize: 10,
                            color: 'white',
                            textAlign: 'center',
                          }}>
                            {match.opponent || match.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'clips' && (
            <>
              {clips.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>
                  <Film size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <p>Zatím žádné klipy</p>
                  <p style={{ fontSize: 12, marginTop: 8 }}>
                    Klipy můžeš přidat při sledování videa
                  </p>
                </div>
              ) : (
                clips.map(clip => {
                  const video = getVideo(clip.videoId);
                  const categoryColors: Record<string, string> = {
                    goal: '#22c55e',
                    assist: '#60a5fa',
                    skill: '#a855f7',
                    defense: '#f59e0b',
                    other: '#6b7280',
                  };
                  const categoryLabels: Record<string, string> = {
                    goal: 'Gól',
                    assist: 'Asistence',
                    skill: 'Technika',
                    defense: 'Obrana',
                    other: 'Jiné',
                  };
                  return (
                    <div
                      key={clip.id}
                      style={{
                        backgroundColor: '#1f2937',
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: categoryColors[clip.category] + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: categoryColors[clip.category],
                      }}>
                        <Play size={24} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{clip.title}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                          <span style={{
                            backgroundColor: categoryColors[clip.category] + '30',
                            color: categoryColors[clip.category],
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                          }}>
                            {categoryLabels[clip.category]}
                          </span>
                          <span>{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
                        </div>
                      </div>
                      <Link
                        href={`/videos/${clip.videoId}?t=${clip.startTime}`}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#2563eb',
                          borderRadius: 8,
                          color: 'white',
                          fontSize: 12,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Play size={14} />
                        Přehrát
                      </Link>
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        style={{
                          padding: 8,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </>
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

      {/* Gallery Photo Add Modal */}
      {pendingGalleryPhoto && (
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
            maxWidth: 400,
            width: '100%',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Přidat fotku do galerie
            </h3>

            <img
              src={pendingGalleryPhoto}
              alt="Náhled"
              style={{
                width: '100%',
                borderRadius: 8,
                marginBottom: 16,
                maxHeight: 200,
                objectFit: 'cover',
              }}
            />

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Popisek (volitelné)
              </label>
              <input
                type="text"
                value={galleryPhotoCaption}
                onChange={e => setGalleryPhotoCaption(e.target.value)}
                placeholder="Např. Gól proti Prace"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Zápas (volitelné)
              </label>
              <select
                value={galleryPhotoMatch}
                onChange={e => setGalleryPhotoMatch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  backgroundColor: '#374151',
                  color: 'white',
                  fontSize: 14,
                }}
              >
                <option value="">Vyberte zápas...</option>
                {allMatches.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.opponent && `vs. ${m.opponent}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setPendingGalleryPhoto(null);
                  setGalleryPhotoCaption('');
                  setGalleryPhotoMatch('');
                }}
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
                onClick={saveGalleryPhoto}
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
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setViewingPhoto(null)}
        >
          <img
            src={viewingPhoto.photoUrl}
            alt={viewingPhoto.caption || 'Fotka'}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
            }}
            onClick={e => e.stopPropagation()}
          />
          {viewingPhoto.caption && (
            <p style={{ marginTop: 16, color: 'white', textAlign: 'center' }}>
              {viewingPhoto.caption}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePhoto(viewingPhoto.id);
                setViewingPhoto(null);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#ef4444',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Trash2 size={16} />
              Smazat
            </button>
            <button
              onClick={() => setViewingPhoto(null)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#374151',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowQRModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: '100%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Sdílet profil
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
              Naskenuj QR kód pro zobrazení profilu
            </p>

            {/* QR Code using Google Charts API */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              display: 'inline-block',
              marginBottom: 16,
            }}>
              <img
                src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(getProfileUrl())}&choe=UTF-8`}
                alt="QR kód"
                style={{ width: 200, height: 200 }}
              />
            </div>

            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, wordBreak: 'break-all' }}>
              {getProfileUrl()}
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getProfileUrl());
                  alert('Odkaz zkopírován!');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Kopírovat odkaz
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
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
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
