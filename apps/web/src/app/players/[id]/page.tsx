'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Camera,
  Trophy,
  Target,
  MessageSquare,
  Video,
  ChevronRight,
  Upload,
  X,
  Play,
  VolumeX,
  Volume2,
  Film,
} from 'lucide-react';
import { getVideoIdsWithNumber } from '@/lib/player-detection';
import {
  getPlayers as getPlayersCloud,
  getPlayer as getPlayerCloud,
  updatePlayer as updatePlayerCloud,
  Player,
  getVideos,
  Video as VideoType,
  getVideoIdsWithPlayerRating,
  getRatingsForPlayer,
  VideoRating,
  getMatches as getMatchesCloud,
  getMatchesForPlayer,
  Match as MatchCloud,
  getCoachCommentsForPlayer,
  getGoalsForPlayer,
  getAssistsForPlayer,
  CoachComment,
} from '@/lib/cloud-store';
import { uploadDataUrl, uploadFile } from '@/lib/upload';

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [matches, setMatches] = useState<MatchCloud[]>([]);
  const [goals, setGoals] = useState<number>(0);
  const [assists, setAssists] = useState<number>(0);

  // Videos where player appears (from detection)
  const [playerVideos, setPlayerVideos] = useState<VideoType[]>([]);
  const [allMatches, setAllMatches] = useState<MatchCloud[]>([]);
  const [videoFilter, setVideoFilter] = useState<'all' | 'match' | 'tournament' | 'orphan'>('all');

  // Photo upload
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoZoom, setShowPhotoZoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Intro video
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const [introMuted, setIntroMuted] = useState(true);
  const [uploadingIntroVideo, setUploadingIntroVideo] = useState(false);
  const introVideoInputRef = useRef<HTMLInputElement>(null);

  // Profile background
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Section refs for scrolling
  const videosSectionRef = useRef<HTMLDivElement>(null);
  const matchesSectionRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  // Comments expanded state
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [params.id]);

  const loadPlayerData = async () => {
    try {
      // Load player from Supabase (cloud)
      const foundPlayer = await getPlayerCloud(params.id);

      if (!foundPlayer) {
        setError('Hráč nenalezen');
        setLoading(false);
        return;
      }

      setPlayer(foundPlayer);

      // Load related data from Supabase
      const [playerComments, playerGoals, playerAssists, playerMatches] = await Promise.all([
        getCoachCommentsForPlayer(params.id),
        getGoalsForPlayer(params.id),
        getAssistsForPlayer(params.id),
        getMatchesForPlayer(params.id),
      ]);

      setComments(playerComments);
      setGoals(playerGoals.length);
      setAssists(playerAssists.length);
      setMatches(playerMatches);

      // Load videos where player was detected (by jersey number) or rated (Hodnocení)
      // Search by jersey number (from video_detections table)
      const detectedByNumberVideoIds = foundPlayer.number ? await getVideoIdsWithNumber(foundPlayer.number) : [];
      const ratedVideoIds = await getVideoIdsWithPlayerRating(params.id);

      // Combine and deduplicate video IDs
      const allVideoIds = [...new Set([...detectedByNumberVideoIds, ...ratedVideoIds])];

      // Load all videos and matches
      const [allVideos, matchesData] = await Promise.all([
        getVideos(),
        getMatchesCloud(),
      ]);

      setAllMatches(matchesData);

      if (allVideoIds.length > 0) {
        const playerVids = allVideos.filter(v => allVideoIds.includes(v.id));
        setPlayerVideos(playerVids);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load player:', err);
      setError('Chyba při načítání');
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    setUploading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('Failed to read file');
      alert('Nepodařilo se načíst soubor');
      setUploading(false);
    };
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        const filename = `player-${player.id}-${Date.now()}.jpg`;
        console.log('Uploading photo for player:', player.id, player.name);
        const result = await uploadDataUrl(dataUrl, 'photos', filename);
        console.log('Upload result:', result);
        // Save to Supabase (cloud) instead of localStorage
        const updated = await updatePlayerCloud(player.id, { photo_url: result.publicUrl });
        console.log('Update result:', updated);
        if (updated) {
          setPlayer(updated);
          setShowPhotoModal(false);
        } else {
          alert('Nepodařilo se uložit fotku do databáze');
        }
      } catch (err) {
        console.error('Failed to upload photo:', err);
        alert('Nepodařilo se nahrát fotku: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIntroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    setUploadingIntroVideo(true);
    try {
      const result = await uploadFile(file, 'videos', `intro-${player.id}-${Date.now()}.mp4`);
      // Save to Supabase (cloud) instead of localStorage
      const updated = await updatePlayerCloud(player.id, { intro_video_url: result.publicUrl });
      if (updated) {
        setPlayer(updated);
      }
    } catch (err) {
      console.error('Failed to upload intro video:', err);
      alert('Nepodařilo se nahrát video');
    } finally {
      setUploadingIntroVideo(false);
    }
  };

  const removeIntroVideo = async () => {
    if (!player) return;
    if (!confirm('Odebrat intro video?')) return;
    // Save to Supabase (cloud) instead of localStorage
    const updated = await updatePlayerCloud(player.id, { intro_video_url: null });
    if (updated) setPlayer(updated);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    setUploadingBackground(true);

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('Failed to read background file');
      alert('Nepodařilo se načíst soubor');
      setUploadingBackground(false);
    };
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        const filename = `player-bg-${player.id}-${Date.now()}.jpg`;
        console.log('Uploading background for player:', player.id, player.name);
        const result = await uploadDataUrl(dataUrl, 'photos', filename);
        console.log('Background upload result:', result);
        const updated = await updatePlayerCloud(player.id, { profile_background_url: result.publicUrl });
        console.log('Background update result:', updated);
        if (updated) {
          setPlayer(updated);
        } else {
          alert('Nepodařilo se uložit pozadí do databáze');
        }
      } catch (err) {
        console.error('Failed to upload background:', err);
        alert('Nepodařilo se nahrát pozadí: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
      } finally {
        setUploadingBackground(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = async () => {
    if (!player) return;
    if (!confirm('Odebrat pozadí profilu?')) return;
    const updated = await updatePlayerCloud(player.id, { profile_background_url: null });
    if (updated) setPlayer(updated);
  };

  const formatDate = (timestamp: number | string) => {
    return new Date(timestamp).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#030712',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        Načítání...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#030712',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <p style={{ color: '#ef4444' }}>{error || 'Hráč nenalezen'}</p>
        <Link
          href="/players"
          style={{
            padding: '8px 16px',
            backgroundColor: '#374151',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
          }}
        >
          Zpět na seznam hráčů
        </Link>
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
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/players" style={{ padding: 8, color: 'white' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontWeight: 600, fontSize: 18 }}>{player.name}</h1>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 16, paddingBottom: 100 }}>
        {/* Intro Video Hero */}
        {player.intro_video_url ? (
          <div style={{
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
            backgroundColor: '#000',
          }}>
            <video
              ref={introVideoRef}
              src={player.intro_video_url}
              autoPlay
              loop
              muted={introMuted}
              playsInline
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            {/* Gradient overlay at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              pointerEvents: 'none',
            }} />
            {/* Player info overlay */}
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 20,
              right: 20,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}>
              <div>
                {player.number && (
                  <div style={{
                    fontSize: 48,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    opacity: 0.4,
                  }}>
                    #{player.number}
                  </div>
                )}
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                  {player.name}
                </div>
                {player.position && (
                  <div style={{
                    fontSize: 13,
                    color: '#d1d5db',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}>
                    {player.position}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setIntroMuted(!introMuted);
                    if (introVideoRef.current) {
                      introVideoRef.current.muted = !introMuted;
                    }
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {introMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={removeIntroVideo}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload intro video prompt */
          <div style={{
            borderRadius: 16,
            border: '2px dashed #374151',
            padding: '20px 16px',
            marginBottom: 16,
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => introVideoInputRef.current?.click()}
          >
            {uploadingIntroVideo ? (
              <div style={{ color: '#9ca3af' }}>
                <Film size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                Nahrávání videa...
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>
                <Film size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 13 }}>Nahrát intro video hráče</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Krátké představení / rozhýbaná fotka</div>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for intro video */}
        <input
          ref={introVideoInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleIntroVideoUpload}
        />

        {/* Profile Background with Photo */}
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
          backgroundColor: '#1f2937',
        }}>
          {/* Background image section */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {player.profile_background_url ? (
              <>
                <img
                  src={player.profile_background_url}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Remove background button */}
                <button
                  onClick={removeBackground}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div
                onClick={() => backgroundInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                {uploadingBackground ? (
                  <span>Nahrávání...</span>
                ) : (
                  <>
                    <Camera size={24} style={{ marginBottom: 4 }} />
                    <span style={{ fontSize: 12 }}>Přidat pozadí profilu</span>
                  </>
                )}
              </div>
            )}

            {/* Profile photo in center */}
            <div style={{
              position: 'relative',
              zIndex: 5,
            }}>
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  onClick={() => setShowPhotoZoom(true)}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                />
              ) : (
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#60a5fa',
                  border: '4px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  {player.number || '?'}
                </div>
              )}
              <button
                onClick={() => setShowPhotoModal(true)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  border: '2px solid white',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={18} />
              </button>
            </div>
          </div>

          {/* Hidden input for background */}
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBackgroundUpload}
          />

          {/* Name & Stats section */}
          <div style={{ padding: 24, paddingTop: 16 }}>
            {/* Name & Number */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{player.name}</h2>
              <p style={{ color: '#9ca3af' }}>
                {player.number && `#${player.number} • `}{player.position || 'Hráč'}
              </p>
            </div>

            {/* Stats Grid - responsive */}
            {(() => {
              // Calculate unique matches from videos where player was detected
              const uniqueMatchIds = new Set(
                playerVideos
                  .filter(v => v.match_id)
                  .map(v => v.match_id)
              );
              const matchesCount = uniqueMatchIds.size;

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  width: '100%',
                }}>
                  <div
                    onClick={() => videosSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ textAlign: 'center', cursor: matchesCount > 0 ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{matchesCount}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Zápasů</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{goals}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Gólů</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>{assists}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Asist.</div>
                  </div>
                  <div
                    onClick={() => comments.length > 0 && commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ textAlign: 'center', cursor: comments.length > 0 ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#a855f7' }}>{comments.length}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Kom.</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Videos Section */}
        {playerVideos.length > 0 && (
          <div ref={videosSectionRef} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Video size={18} style={{ color: '#60a5fa' }} />
                Videa s hráčem ({playerVideos.length})
              </h3>
              {/* Filter buttons */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'Vše' },
                  { key: 'match', label: 'Zápasy' },
                  { key: 'tournament', label: 'Turnaje' },
                  { key: 'orphan', label: 'Bez zápasu' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setVideoFilter(f.key as typeof videoFilter)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: videoFilter === f.key ? '#2563eb' : '#374151',
                      color: 'white',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {playerVideos
                .filter(video => {
                  const match = allMatches.find(m => m.id === video.match_id);
                  if (videoFilter === 'all') return true;
                  if (videoFilter === 'match') return match && match.type === 'match';
                  if (videoFilter === 'tournament') return match && match.type === 'tournament';
                  if (videoFilter === 'orphan') return !video.match_id;
                  return true;
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(video => {
                  const match = allMatches.find(m => m.id === video.match_id);
                  return (
                    <Link
                      key={video.id}
                      href={`/videos/${video.id}`}
                      style={{
                        backgroundColor: '#1f2937',
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          style={{ width: 80, height: 45, borderRadius: 8, objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 80,
                          height: 45,
                          borderRadius: 8,
                          backgroundColor: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Video size={20} style={{ color: '#6b7280' }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{video.title}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {match ? (
                            <>
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: 4,
                                backgroundColor: match.type === 'tournament' ? '#7c3aed' : '#059669',
                                fontSize: 10,
                              }}>
                                {match.type === 'tournament' ? 'Turnaj' : 'Zápas'}
                              </span>
                              <span>{match.name}</span>
                              {match.goals_for !== undefined && match.goals_against !== undefined && (
                                <span style={{ fontWeight: 600 }}>
                                  {match.goals_for}:{match.goals_against}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>{new Date(video.created_at).toLocaleDateString('cs-CZ')}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: '#6b7280' }} />
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Matches Section */}
        {matches.length > 0 && (
          <div ref={matchesSectionRef} style={{ marginBottom: 24 }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} />
              Zápasy ({matches.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matches.slice(0, 5).map(match => (
                <Link
                  key={match.id}
                  href={`/matches?expand=${match.id}`}
                  style={{
                    backgroundColor: '#1f2937',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: 'white',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{match.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{match.date}</div>
                  </div>
                  {(match.goals_for !== undefined && match.goals_against !== undefined) && (
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: match.goals_for > match.goals_against ? '#22c55e' :
                             match.goals_for < match.goals_against ? '#ef4444' : '#fbbf24',
                    }}>
                      {match.goals_for}:{match.goals_against}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        {comments.length > 0 && (
          <div ref={commentsSectionRef} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <MessageSquare size={18} style={{ color: '#a855f7' }} />
                Komentáře ({comments.length})
              </h3>
              {comments.length > 5 && (
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: '#374151',
                    color: 'white',
                  }}
                >
                  {showAllComments ? 'Zobrazit méně' : `Zobrazit všechny (${comments.length})`}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(showAllComments ? comments : comments.slice(0, 5)).map(comment => (
                <Link
                  key={comment.id}
                  href={`/videos/${comment.video_id}?t=${Math.floor(comment.time)}`}
                  style={{
                    backgroundColor: '#1f2937',
                    borderRadius: 12,
                    padding: 12,
                    textDecoration: 'none',
                    color: 'white',
                  }}
                >
                  <div style={{
                    fontSize: 14,
                    marginBottom: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {comment.text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ca3af' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: comment.category === 'praise' ? '#166534' :
                                       comment.category === 'improvement' ? '#7f1d1d' :
                                       comment.category === 'tactic' ? '#1e40af' : '#374151',
                      fontSize: 10,
                    }}>
                      {comment.category === 'praise' ? 'Pochvala' :
                       comment.category === 'improvement' ? 'Zlepšit' :
                       comment.category === 'tactic' ? 'Taktika' : 'Poznámka'}
                    </span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {playerVideos.length === 0 && matches.length === 0 && comments.length === 0 && (
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
          }}>
            <p style={{ color: '#9ca3af', marginBottom: 8 }}>
              Zatím žádná data o tomto hráči.
            </p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Nahrajte videa a spusťte detekci hráčů.
            </p>
          </div>
        )}
      </main>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
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
          onClick={() => !uploading && setShowPhotoModal(false)}
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
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Nahrát fotku</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
                padding: 16,
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                cursor: uploading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 14,
              }}
            >
              {uploading ? 'Nahrávání...' : (
                <>
                  <Upload size={18} />
                  Vybrat fotku
                </>
              )}
            </button>
            <button
              onClick={() => setShowPhotoModal(false)}
              disabled={uploading}
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

      {/* Photo Zoom Modal */}
      {showPhotoZoom && player.photo_url && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowPhotoZoom(false)}
        >
          <button
            onClick={() => setShowPhotoZoom(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#374151',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} />
          </button>
          <img
            src={player.photo_url}
            alt={player.name}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </div>
  );
}
